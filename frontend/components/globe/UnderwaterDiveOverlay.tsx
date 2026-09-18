'use client';

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSubsurfaceProfile } from '@/lib/api/queries';
import { getZone, interpolate } from '@/components/cutaway/utils';
import { 
  Compass, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Minimize2, 
  Eye, 
  Waves, 
  Activity, 
  Sparkles 
} from 'lucide-react';

import { DEPTH_LEVELS, type DepthLevel } from '@/lib/api/types';

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_SIM_DEPTH = 2000;
// Map 0 - 2000m to scene units: Surface is Y = 0, Seabed is Y = -100
const DEPTH_SCALE = 0.05; // 2000m * 0.05 = 100 units deep

const snapToNearestDepth = (d: number): DepthLevel => {
  return DEPTH_LEVELS.reduce((prev, curr) =>
    Math.abs(curr - d) < Math.abs(prev - d) ? curr : prev
  );
};

interface ProfileData {
  depths: number[];
  temperature: number[];
  salinity: number[];
}

// ── 1. Shaders ────────────────────────────────────────────────────────────────

// Ocean surface viewed from both above and below (Total Internal Reflection / Snell's window)
const OceanSurfaceShader = {
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    // Gerstner Wave generator
    vec3 gerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
      float steepness = wave.z;
      float wavelength = wave.w;
      float k = 2.0 * 3.14159265 / wavelength;
      float c = sqrt(9.8 / k);
      vec2 d = normalize(wave.xy);
      float f = k * (dot(d, p.xz) - c * uTime * 0.8);
      float a = steepness / k;

      tangent += vec3(
        -d.x * d.x * (steepness * sin(f)),
        d.x * (steepness * cos(f)),
        -d.x * d.y * (steepness * sin(f))
      );
      binormal += vec3(
        -d.x * d.y * (steepness * sin(f)),
        d.y * (steepness * cos(f)),
        -d.y * d.y * (steepness * sin(f))
      );

      return vec3(
        d.x * (a * cos(f)),
        a * sin(f),
        d.y * (a * cos(f))
      );
    }

    void main() {
      vUv = uv;
      vec3 gridPoint = position;
      vec3 tangent = vec3(1.0, 0.0, 0.0);
      vec3 binormal = vec3(0.0, 0.0, 1.0);
      vec3 p = gridPoint;

      // 4 Composite Gerstner waves
      p += gerstnerWave(vec4(1.0, 0.2, 0.18, 25.0), gridPoint, tangent, binormal);
      p += gerstnerWave(vec4(0.4, 0.9, 0.12, 14.0), gridPoint, tangent, binormal);
      p += gerstnerWave(vec4(-0.7, 0.7, 0.08, 8.0), gridPoint, tangent, binormal);
      p += gerstnerWave(vec4(0.2, -1.0, 0.05, 4.0), gridPoint, tangent, binormal);

      vec3 normal = normalize(cross(binormal, tangent));
      vNormal = normalMatrix * normal;

      vec4 worldPos = modelMatrix * vec4(p, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uSunDirection;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uSunColor;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 norm = normalize(vNormal);

      // Are we looking from underwater (camera below surface)?
      bool isUnderwater = cameraPosition.y < vWorldPosition.y;
      if (isUnderwater) {
        norm = -norm;
      }

      // Fresnel reflection
      float fresnel = dot(viewDir, norm);
      fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
      float fresnelFactor = pow(fresnel, isUnderwater ? 3.5 : 4.0);

      // Specular sunlight highlight on wave facets
      vec3 halfVector = normalize(uSunDirection + viewDir);
      float spec = max(dot(norm, halfVector), 0.0);
      float specular = pow(spec, 180.0) * 3.5;

      // Subsurface scattering & foam shimmer
      float waveHeight = vWorldPosition.y;
      vec3 baseWater = mix(uDeepColor, uShallowColor, smoothstep(-1.2, 1.5, waveHeight));

      // Snell's window effect when underwater
      vec3 color = baseWater;
      if (isUnderwater) {
        // Looking up towards the sun
        float sunDot = max(dot(viewDir, uSunDirection), 0.0);
        vec3 skylight = mix(uShallowColor, uSunColor, pow(sunDot, 6.0));
        color = mix(skylight, uDeepColor * 0.6, fresnelFactor * 0.85);
        color += uSunColor * specular;
      } else {
        color = mix(baseWater, uShallowColor * 1.3, fresnelFactor);
        color += uSunColor * specular;
      }

      // Soft edge vignette fade for large plane
      float distFromCenter = length(vUv - 0.5) * 2.0;
      float alpha = smoothstep(1.0, 0.6, distFromCenter) * 0.92;

      gl_FragColor = vec4(color, alpha);
    }
  `,
};

// Volumetric God Rays (Light shafts radiating from the sun downward into the water)
const GodRaysShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uDepth; // Current depth in meters
    uniform vec3 uColor;
    varying vec2 vUv;
    varying vec3 vPosition;

    // Pseudo-random noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    void main() {
      // Shaft coordinates
      float y = vUv.y; // 0 at surface, 1 at bottom
      float x = vUv.x - 0.5;

      // Animated caustic shimmer inside rays
      float n1 = noise(vec2(x * 6.0 + sin(uTime * 0.4), y * 3.0 - uTime * 0.5));
      float n2 = noise(vec2(x * 12.0 - cos(uTime * 0.3), y * 8.0 - uTime * 0.8));
      float rayPattern = (n1 * 0.65 + n2 * 0.35);

      // Cone shape falloff
      float coneWidth = mix(0.12, 0.48, y);
      float horizontalFalloff = smoothstep(coneWidth, 0.0, abs(x));

      // Vertical attenuation (Sunlight fades out rapidly with depth)
      // Completely gone past 300m
      float depthFactor = clamp(1.0 - (uDepth / 350.0), 0.0, 1.0);
      float verticalFalloff = pow(1.0 - y, 1.6) * depthFactor;

      float intensity = rayPattern * horizontalFalloff * verticalFalloff;
      gl_FragColor = vec4(uColor, intensity * 0.55);
    }
  `,
};

// ── 2. Underwater Components ──────────────────────────────────────────────────

function OceanSurface() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(0.2, 0.9, 0.3).normalize() },
      uDeepColor: { value: new THREE.Color('#031d2e') },
      uShallowColor: { value: new THREE.Color('#22d3ee') },
      uSunColor: { value: new THREE.Color('#e0f2fe') },
    }),
    []
  );

  useFrame((_, delta) => {
    if (meshRef.current) {
      uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[160, 160, 96, 96]} />
      <shaderMaterial
        vertexShader={OceanSurfaceShader.vertexShader}
        fragmentShader={OceanSurfaceShader.fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function GodRaysGroup({ currentDepth }: { currentDepth: number }) {
  const rayAngles = useMemo(
    () => [
      { pos: [0, -18, 0], rot: [0.1, 0.05, 0.15], scale: [22, 38, 22] },
      { pos: [-6, -16, -4], rot: [-0.08, 0.12, -0.1], scale: [16, 34, 16] },
      { pos: [8, -20, 5], rot: [0.15, -0.05, 0.22], scale: [26, 42, 26] },
      { pos: [3, -15, -8], rot: [-0.05, -0.1, 0.08], scale: [18, 30, 18] },
    ],
    []
  );

  const uniformsList = useMemo(
    () =>
      rayAngles.map(() => ({
        uTime: { value: 0 },
        uDepth: { value: currentDepth },
        uColor: { value: new THREE.Color('#7dd3fc') },
      })),
    [rayAngles, currentDepth]
  );

  useFrame((_, delta) => {
    uniformsList.forEach((u) => {
      u.uTime.value += delta;
      u.uDepth.value = currentDepth;
    });
  });

  // Fade out completely in midnight zone
  if (currentDepth > 450) return null;

  return (
    <group>
      {rayAngles.map((ray, i) => (
        <mesh
          key={i}
          position={ray.pos as [number, number, number]}
          rotation={ray.rot as [number, number, number]}
          scale={ray.scale as [number, number, number]}
        >
          <cylinderGeometry args={[0.2, 1.0, 1.0, 16, 1, true]} />
          <shaderMaterial
            vertexShader={GodRaysShader.vertexShader}
            fragmentShader={GodRaysShader.fragmentShader}
            uniforms={uniformsList[i]}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// Marine Snow, Plankton, and Rising Bubbles
function MarineParticles({ currentDepth }: { currentDepth: number }) {
  const count = 1800;
  const pointsRef = useRef<THREE.Points>(null!);

  const [positions, speeds, phases, types] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const phs = new Float32Array(count);
    const typ = new Float32Array(count); // 0 = bubble, 1 = marine snow, 2 = bioluminescent plankton

    for (let i = 0; i < count; i++) {
      // Spread across a cylinder of radius 35, from surface (0) to abyss (-110)
      const r = Math.sqrt(Math.random()) * 35;
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = -(Math.random() * 110);
      pos[i * 3 + 2] = Math.sin(theta) * r;

      spd[i] = 0.2 + Math.random() * 0.8;
      phs[i] = Math.random() * Math.PI * 2;
      typ[i] = Math.random() < 0.25 ? 0 : Math.random() < 0.7 ? 1 : 2;
    }
    return [pos, spd, phs, typ];
  }, [count]);

  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(125, 225, 245, 0.7)');
      grad.addColorStop(0.8, 'rgba(76, 224, 210, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = state.clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const type = types[i];
      const speed = speeds[i];
      const phase = phases[i];

      if (type === 0) {
        // Bubbles rise upwards
        arr[idx + 1] += delta * speed * 2.2;
        arr[idx] += Math.sin(t * 1.5 + phase) * 0.015;
        // If reached surface, wrap back down
        if (arr[idx + 1] > 0) arr[idx + 1] = -105;
      } else {
        // Marine snow / Plankton drift gently downwards with current
        arr[idx + 1] -= delta * speed * 0.35;
        arr[idx] += Math.cos(t * 0.6 + phase) * 0.02;
        arr[idx + 2] += Math.sin(t * 0.5 + phase) * 0.02;
        // Wrap to top if fallen past seabed
        if (arr[idx + 1] < -110) arr[idx + 1] = 0;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.65}
        map={particleTexture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={currentDepth > 1000 ? '#4CE0D2' : '#cffafe'}
        opacity={currentDepth > 1000 ? 0.85 : 0.65}
      />
    </points>
  );
}

// 3D Holographic Telemetry Scanner Ring at the active depth
function DepthScannerRing({ currentDepth, variable }: { currentDepth: number; variable: string }) {
  const ringRef = useRef<THREE.Group>(null!);
  const targetY = -(currentDepth * DEPTH_SCALE);

  useFrame((state, delta) => {
    if (ringRef.current) {
      // Smooth lerp to current depth
      ringRef.current.position.y = THREE.MathUtils.lerp(
        ringRef.current.position.y,
        targetY,
        delta * 5.0
      );
      ringRef.current.rotation.y += delta * 0.4;
    }
  });

  const accentColor = variable === 'temperature' ? '#ea641e' : '#8250dc';

  return (
    <group ref={ringRef} position={[0, targetY, 0]}>
      {/* Outer rotating telemetry circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14, 14.15, 64]} />
        <meshBasicMaterial color="#4CE0D2" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Inner pulsing radar ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.5, 9.7, 48]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* Crosshair beams */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={4}
            array={new Float32Array([
              -14.5, 0, 0, 14.5, 0, 0,
              0, 0, -14.5, 0, 0, 14.5
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#4CE0D2" transparent opacity={0.3} />
      </lineSegments>

      {/* Subtle planar grid disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[14, 32]} />
        <meshBasicMaterial color="#4CE0D2" transparent opacity={0.03} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

// Caustic lighting projected on the deep floor
function SeabedCaustics() {
  const meshRef = useRef<THREE.Mesh>(null!);

  const CausticShader = useMemo(
    () => ({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          vec2 p = vUv * 24.0;
          float t = uTime * 0.8;
          
          float c1 = sin(p.x * 1.5 + t) * cos(p.y * 1.5 - t);
          float c2 = sin(p.x * 2.2 - t * 1.2 + c1) * cos(p.y * 2.4 + t * 0.9);
          float caustic = pow(c1 * 0.5 + c2 * 0.5 + 0.5, 3.0) * 1.8;

          float falloff = smoothstep(1.0, 0.0, length(vUv - 0.5) * 2.0);
          gl_FragColor = vec4(vec3(0.3, 0.88, 0.82) * caustic, caustic * falloff * 0.25);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
      },
    }),
    []
  );

  useFrame((_, delta) => {
    if (meshRef.current) {
      CausticShader.uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -108, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[80, 80]} />
      <shaderMaterial
        vertexShader={CausticShader.vertexShader}
        fragmentShader={CausticShader.fragmentShader}
        uniforms={CausticShader.uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Scene Fog & Dynamic Underwater Absorption
function SceneAtmosphere({ currentDepth }: { currentDepth: number }) {
  const { scene } = useThree();

  useFrame(() => {
    // Dynamic color gradation as user descends:
    // Epipelagic (0 - 200m): Bright cyan/teal-tinted deep blue
    // Mesopelagic (200 - 1000m): Rich indigo / twilight midnight
    // Bathypelagic (1000 - 2000m): Abyssal near-pitch black
    let fogColorHex = '#031a29';
    let fogNear = 8;
    let fogFar = 70;

    if (currentDepth <= 200) {
      const t = currentDepth / 200;
      fogColorHex = new THREE.Color('#022b42')
        .lerp(new THREE.Color('#041d33'), t)
        .getHexString();
      fogNear = 12 - t * 4;
      fogFar = 75 - t * 15;
    } else if (currentDepth <= 1000) {
      const t = (currentDepth - 200) / 800;
      fogColorHex = new THREE.Color('#041d33')
        .lerp(new THREE.Color('#030b18'), t)
        .getHexString();
      fogNear = 8 - t * 4;
      fogFar = 60 - t * 25;
    } else {
      const t = (currentDepth - 1000) / 1000;
      fogColorHex = new THREE.Color('#030b18')
        .lerp(new THREE.Color('#010408'), t)
        .getHexString();
      fogNear = 4 - t * 2;
      fogFar = 35 - t * 15;
    }

    const fogColor = new THREE.Color(`#${fogColorHex}`);
    scene.background = fogColor;
    if (!scene.fog) {
      scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
    } else {
      (scene.fog as THREE.Fog).color.copy(fogColor);
      (scene.fog as THREE.Fog).near = fogNear;
      (scene.fog as THREE.Fog).far = fogFar;
    }
  });

  return null;
}

// ── 3. Underwater Dive Camera Controller ───────────────────────────────────────

function DiveCameraController({
  targetDepth,
  onDepthChange,
}: {
  targetDepth: number;
  onDepthChange: (d: number) => void;
}) {
  const { camera } = useThree();
  const isDragging = useRef(false);
  const prevPointer = useRef({ x: 0, y: 0 });
  const orbitAngle = useRef({ theta: 0.3, phi: 1.4 }); // Spherical angles

  // Target camera world Y based on depth
  const targetCamY = -(targetDepth * DEPTH_SCALE);

  // Mouse wheel scroll to dive deeper / ascend
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = (e.deltaY > 0 ? 1 : -1) * 35;
      const next = Math.max(0, Math.min(MAX_SIM_DEPTH, targetDepth + step));
      onDepthChange(Math.round(next));
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [targetDepth, onDepthChange]);

  // Pointer drag to orbit 360° underwater
  const onPointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    prevPointer.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - prevPointer.current.x;
    const dy = e.clientY - prevPointer.current.y;
    prevPointer.current = { x: e.clientX, y: e.clientY };

    orbitAngle.current.theta -= dx * 0.006;
    orbitAngle.current.phi = Math.max(0.2, Math.min(Math.PI - 0.2, orbitAngle.current.phi - dy * 0.006));
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerDown, onPointerMove, onPointerUp]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    // Gentle underwater bobbing / current drift
    const bobY = Math.sin(t * 0.8) * 0.15;
    const bobX = Math.cos(t * 0.5) * 0.1;

    // Smooth camera depth tracking
    const currentY = camera.position.y;
    const desiredY = targetCamY + bobY;
    const newY = THREE.MathUtils.lerp(currentY, desiredY, delta * 3.5);

    // Orbit radius around center
    const radius = 18.0;
    const { theta, phi } = orbitAngle.current;

    const eyeX = radius * Math.sin(phi) * Math.sin(theta) + bobX;
    const eyeZ = radius * Math.sin(phi) * Math.cos(theta);

    camera.position.set(eyeX, newY, eyeZ);
    camera.lookAt(0, newY - 1.5, 0);
  });

  return null;
}

// ── 4. Main Exported Underwater Dive Overlay Component ────────────────────────

export default function UnderwaterDiveOverlay() {
  const { selectedLat, selectedLon, selectedDate, selectedDepth: depth, setDepth, mode, setMode } = useExplorerStore();
  
  // Fetch subsurface profile data
  const hasSelection = selectedLat !== null && selectedLon !== null;
  const queryParams = hasSelection ? { lat: selectedLat, lon: selectedLon, date: selectedDate } : null;
  const { data: profile } = useSubsurfaceProfile(queryParams);

  const [isCinematic, setIsCinematic] = useState(false);

  // Active ONLY when mode is explicitly set to 'dive' (not on every focus point pick)
  const isActive = mode === 'dive';

  if (!isActive) return null;

  const currentZone = getZone(depth);
  const tempVal = profile ? interpolate(profile.depths, profile.temperature, depth) : null;
  const pressureAtm = (depth / 10 + 1).toFixed(1);

  return (
    <div
      className="absolute inset-0 z-30 overflow-hidden select-none animate-fade-in"
      style={{
        pointerEvents: 'none',
      }}
    >
      {/* ── Three.js Full-Viewport Underwater Stage ─────────────────────── */}
      <div className="absolute inset-0 pointer-events-auto">
        <Canvas
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          camera={{
            fov: 55,
            near: 0.1,
            far: 120,
            position: [0, 2, 18],
          }}
        >
          <SceneAtmosphere currentDepth={depth} />
          <ambientLight intensity={depth > 1000 ? 0.08 : 0.35} color="#38bdf8" />
          <directionalLight
            position={[10, 20, 10]}
            intensity={depth > 1000 ? 0.1 : 1.6}
            color="#bae6fd"
          />

          <OceanSurface />
          <GodRaysGroup currentDepth={depth} />
          <MarineParticles currentDepth={depth} />
          <DepthScannerRing currentDepth={depth} variable="temperature" />
          <SeabedCaustics />

          <DiveCameraController
            targetDepth={depth}
            onDepthChange={(d) => setDepth(snapToNearestDepth(d))}
          />
        </Canvas>
      </div>

      {/* ── Submersible HUD Header & Telemetry ───────────────────────────── */}
      {!isCinematic && (
        <div className="absolute top-16 left-60 right-16 z-40 pointer-events-none flex items-start justify-between">
          {/* Left: Depth & Zone Badge */}
          <div
            className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-xl transition-all"
            style={{
              background: 'rgba(5, 11, 20, 0.75)',
              borderColor: 'rgba(76, 224, 210, 0.25)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 16px rgba(76, 224, 210, 0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full animate-ping bg-[#4CE0D2]" />
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#4CE0D2]">
                Underwater Dive Sim
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl font-light text-white tracking-tight">{depth}</span>
              <span className="font-mono text-xs text-white/40">m</span>
            </div>
            <span
              className="px-2 py-0.5 rounded text-[0.65rem] font-mono uppercase font-medium tracking-wider"
              style={{
                backgroundColor: `${currentZone.accentHex}20`,
                color: currentZone.accentHex,
                border: `1px solid ${currentZone.accentHex}40`,
              }}
            >
              {currentZone.name}
            </span>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setIsCinematic(!isCinematic)}
              className="px-3 py-2 rounded-lg border border-white/10 bg-[#050B14]/80 text-white/70 hover:text-white hover:border-[#4CE0D2]/40 text-xs font-mono tracking-wider flex items-center gap-1.5 backdrop-blur-md transition-all"
              title="Toggle HUD display"
            >
              <Eye size={14} />
              {isCinematic ? 'Show Telemetry' : 'Cinematic'}
            </button>
            <button
              onClick={() => {
                setMode('surface');
              }}
              className="px-3.5 py-2 rounded-lg border border-white/15 bg-[#050B14]/85 text-[#4CE0D2] hover:bg-[#4CE0D2]/15 hover:border-[#4CE0D2]/50 text-xs font-mono tracking-wider flex items-center gap-2 backdrop-blur-md transition-all shadow-lg"
              title="Return to Globe Overview"
            >
              <Minimize2 size={14} />
              Ascend to Globe
            </button>
          </div>
        </div>
      )}

      {/* ── Interactive Depth Rail & Dive Depth Controller (Right side) ── */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 pointer-events-auto flex flex-col items-center gap-3">
        <button
          onClick={() => setDepth(snapToNearestDepth(Math.max(0, depth - 100)))}
          disabled={depth <= 0}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-[#050B14]/80 border border-white/10 text-white/70 hover:text-[#4CE0D2] hover:border-[#4CE0D2]/50 disabled:opacity-30 disabled:pointer-events-none backdrop-blur-md transition-all"
          title="Ascend 100m"
        >
          <ArrowUpCircle size={16} />
        </button>

        {/* Vertical Depth Visualizer */}
        <div
          className="relative w-7 h-56 rounded-full p-1 flex flex-col items-center justify-between border"
          style={{
            background: 'rgba(5, 11, 20, 0.85)',
            borderColor: 'rgba(76, 224, 210, 0.2)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Depth fill track */}
          <div className="absolute inset-x-1 top-1 bottom-1 rounded-full bg-gradient-to-b from-[#4CE0D2]/40 via-[#1C5C6B]/40 to-[#050B14]" />

          {/* Current depth indicator pip */}
          <div
            className="absolute left-1 right-1 h-3 rounded-full bg-[#4CE0D2] shadow-[0_0_10px_#4CE0D2] transition-all duration-150"
            style={{
              top: `${Math.min(94, (depth / MAX_SIM_DEPTH) * 94)}%`,
            }}
          />

          {/* Depth labels */}
          <span className="font-mono text-[0.55rem] text-white/60 relative z-10">0m</span>
          <span className="font-mono text-[0.55rem] text-white/60 relative z-10">1000m</span>
          <span className="font-mono text-[0.55rem] text-white/60 relative z-10">2000m</span>
        </div>

        <button
          onClick={() => setDepth(snapToNearestDepth(Math.min(MAX_SIM_DEPTH, depth + 100)))}
          disabled={depth >= MAX_SIM_DEPTH}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-[#050B14]/80 border border-white/10 text-white/70 hover:text-[#4CE0D2] hover:border-[#4CE0D2]/50 disabled:opacity-30 disabled:pointer-events-none backdrop-blur-md transition-all"
          title="Dive 100m"
        >
          <ArrowDownCircle size={16} />
        </button>
      </div>

      {/* ── Telemetry Bottom Status Bar ─────────────────────────────────── */}
      {!isCinematic && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <div
            className="flex items-center gap-6 px-6 py-2.5 rounded-full border backdrop-blur-2xl text-xs font-mono shadow-2xl"
            style={{
              background: 'rgba(5, 11, 20, 0.85)',
              borderColor: 'rgba(76, 224, 210, 0.25)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(76, 224, 210, 0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              <Compass size={13} className="text-[#4CE0D2]" />
              <span className="text-white/40 uppercase text-[0.6rem]">Bearing:</span>
              <span className="text-white font-medium">360° Orbit</span>
            </div>

            <div className="h-3 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <Waves size={13} className="text-[#38bdf8]" />
              <span className="text-white/40 uppercase text-[0.6rem]">Pressure:</span>
              <span className="text-white font-medium">{pressureAtm} atm</span>
            </div>

            <div className="h-3 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <Activity size={13} className="text-[#ea641e]" />
              <span className="text-white/40 uppercase text-[0.6rem]">In-Situ Temp:</span>
              <span className="text-white font-medium">
                {tempVal !== null ? `${tempVal.toFixed(1)}°C` : '—'}
              </span>
            </div>

            <div className="h-3 w-px bg-white/10" />

            {/* User Navigation hint */}
            <div className="flex items-center gap-1.5 text-white/40 text-[0.65rem]">
              <span>[Drag mouse to Look Around • Scroll to Dive]</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
