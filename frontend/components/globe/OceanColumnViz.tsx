'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSubsurfaceProfile } from '@/lib/api/queries';
import { getZone, interpolate, valueToHsl } from '@/components/cutaway/utils';
import { DEPTH_LEVELS, type DepthLevel } from '@/lib/api/types';
import { motion } from 'framer-motion';
import { 
  Compass, 
  Waves, 
  Thermometer, 
  Eye, 
  ArrowLeft,
  Gauge,
  Sparkles,
  MapPin
} from 'lucide-react';

const DEPTH_SCALE = 0.1; // 1000m -> 100 scene units

// ── 1. Shaders ────────────────────────────────────────────────────────────────

// Ocean surface with Gerstner Waves & Snell's Window
const OceanSurfaceShader = {
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    vec3 gerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
      float steepness = wave.z;
      float wavelength = wave.w;
      float k = 2.0 * 3.14159265 / wavelength;
      float c = sqrt(9.8 / k);
      vec2 d = normalize(wave.xy);
      float f = k * (dot(d, p.xz) - c * uTime * 0.7);
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

      p += gerstnerWave(vec4(1.0, 0.2, 0.18, 28.0), gridPoint, tangent, binormal);
      p += gerstnerWave(vec4(0.4, 0.9, 0.12, 16.0), gridPoint, tangent, binormal);
      p += gerstnerWave(vec4(-0.7, 0.7, 0.08, 9.0), gridPoint, tangent, binormal);

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

      bool isUnderwater = cameraPosition.y < vWorldPosition.y;
      if (isUnderwater) norm = -norm;

      float fresnel = clamp(1.0 - dot(viewDir, norm), 0.0, 1.0);
      float fresnelFactor = pow(fresnel, isUnderwater ? 2.5 : 4.0);

      vec3 halfVector = normalize(uSunDirection + viewDir);
      float spec = max(dot(norm, halfVector), 0.0);
      float specular = pow(spec, 120.0) * 2.5;

      float waveHeight = vWorldPosition.y;
      vec3 baseWater = mix(uDeepColor, uShallowColor, smoothstep(-1.0, 1.2, waveHeight));

      vec3 color = baseWater;
      if (isUnderwater) {
        float snellMask = smoothstep(0.3, 0.7, fresnel);
        float sunDot = max(dot(viewDir, uSunDirection), 0.0);
        vec3 skylight = mix(uShallowColor * 1.3, uSunColor * 1.2, pow(sunDot, 4.0));
        vec3 underwaterAmbient = mix(uDeepColor, uShallowColor * 0.7, 0.5);
        color = mix(underwaterAmbient, skylight, snellMask);
        color += uSunColor * specular * snellMask;
      } else {
        color = mix(baseWater, uShallowColor * 1.3, fresnelFactor);
        color += uSunColor * specular;
      }

      float distFromCenter = length(vUv - 0.5) * 2.0;
      float alpha = smoothstep(1.0, 0.3, distFromCenter) * 0.55;

      gl_FragColor = vec4(color, alpha);
    }
  `,
};

// Volumetric God Rays
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
    uniform float uDepth;
    uniform vec3 uColor;
    varying vec2 vUv;

    void main() {
      float y = clamp(vUv.y, 0.0, 1.0);
      float x = vUv.x - 0.5;

      float t = uTime * 1.4;
      float c1 = sin(x * 14.0 + t) * cos(y * 9.0 - t * 0.7);
      float c2 = sin(x * 9.0 - t * 1.1) * cos(y * 13.0 + t);
      float rayPattern = (c1 + c2) * 0.25 + 0.5;

      float coneWidth = mix(0.1, 0.45, y);
      float horizontalFalloff = smoothstep(coneWidth, 0.0, abs(x));

      // Physical sunlight extinction (Beer-Lambert)
      float depthFactor = clamp(1.0 - (uDepth / 250.0), 0.0, 1.0);
      float verticalFalloff = pow(clamp(1.0 - y, 0.0, 1.0), 1.8) * depthFactor;

      float intensity = rayPattern * horizontalFalloff * verticalFalloff;
      gl_FragColor = vec4(uColor, intensity * 0.9);
    }
  `,
};

// Helper for thermocline hue
function getTempColorTarget(temp: number, s: number, l: number) {
  const norm = THREE.MathUtils.clamp((temp - 4) / 26, 0, 1);
  const hue = THREE.MathUtils.lerp(0.62, 0.03, norm);
  return new THREE.Color().setHSL(hue, s, l);
}


// ── 2. Scene Components ────────────────────────────────────────────────────────

function OceanSurfaceMesh() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(0.25, 0.9, 0.2).normalize() },
      uDeepColor: { value: new THREE.Color('#023859') },
      uShallowColor: { value: new THREE.Color('#38bdf8') },
      uSunColor: { value: new THREE.Color('#f0f9ff') },
    }),
    []
  );

  useFrame((_, delta) => {
    if (meshRef.current) {
      uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-10}>
      <planeGeometry args={[140, 140, 64, 64]} />
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

function GodRays({ depth, currentTemp }: { depth: number; currentTemp: number }) {
  const rayConfigs = useMemo(
    () => [
      { pos: [0, -12, 0], rot: [0.1, 0.05, 0.12], scale: [22, 28, 22] },
      { pos: [-4, -10, -3], rot: [-0.08, 0.1, -0.1], scale: [18, 24, 18] },
      { pos: [5, -14, 4], rot: [0.12, -0.05, 0.18], scale: [24, 32, 24] },
    ],
    []
  );

  const uniformsList = useMemo(
    () =>
      rayConfigs.map(() => ({
        uTime: { value: 0 },
        uDepth: { value: depth },
        uColor: { value: new THREE.Color('#38bdf8') },
      })),
    [rayConfigs, depth]
  );

  useFrame((_, delta) => {
    const targetColor = getTempColorTarget(currentTemp, 0.9, 0.6);
    uniformsList.forEach((u) => {
      u.uTime.value += delta;
      u.uDepth.value = depth;
      u.uColor.value.lerp(targetColor, delta * 3.0);
    });
  });

  if (depth > 280) return null;

  return (
    <group renderOrder={1}>
      {rayConfigs.map((cfg, i) => (
        <mesh
          key={i}
          position={cfg.pos as [number, number, number]}
          rotation={cfg.rot as [number, number, number]}
          scale={cfg.scale as [number, number, number]}
          renderOrder={1}
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

// Marine Snow & Plankton Particles with CanvasTexture
function MarineParticles({ depth, currentTemp }: { depth: number; currentTemp: number }) {
  const count = 1200;

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
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  const [positions, speeds, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const phs = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * 26;
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = -(Math.random() * 105);
      pos[i * 3 + 2] = Math.sin(theta) * r;

      spd[i] = 0.3 + Math.random() * 1.2;
      phs[i] = Math.random() * Math.PI * 2;
    }
    return [pos, spd, phs];
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTexture: { value: particleTexture },
      uColor: { value: new THREE.Color() },
      uOpacity: { value: 0.8 },
    }),
    [particleTexture]
  );

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    const isBiolume = depth > 200;
    const boost = isBiolume ? 2.5 : 1.2;
    
    // Tint marine snow slightly towards ambient temp color, but keep it mostly bright
    const targetColor = getTempColorTarget(currentTemp, 0.7, 0.75);
    if (!isBiolume) targetColor.lerp(new THREE.Color('#ffffff'), 0.5);
    
    uniforms.uColor.value.lerp(targetColor.multiplyScalar(boost), delta * 4.0);
  });

  return (
    <points renderOrder={3}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSpeed" count={count} array={speeds} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={count} array={phases} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={`
          uniform float uTime;
          attribute float aSpeed;
          attribute float aPhase;
          void main() {
            vec3 pos = position;
            float newY = pos.y - uTime * aSpeed * 0.4;
            pos.y = -mod(abs(newY), 105.0);
            pos.x += cos(uTime * 0.5 + aPhase) * 0.5;
            pos.z += sin(uTime * 0.4 + aPhase) * 0.5;

            vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = clamp(32.0 * (1.0 / max(0.1, -mvPos.z)), 1.0, 48.0);
            gl_Position = projectionMatrix * mvPos;
          }
        `}
        fragmentShader={`
          uniform sampler2D uTexture;
          uniform vec3 uColor;
          uniform float uOpacity;
          void main() {
            vec4 tex = texture2D(uTexture, gl_PointCoord);
            if (tex.a < 0.02) discard;
            gl_FragColor = vec4(uColor * tex.rgb, tex.a * uOpacity);
          }
        `}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// 3D Data-Driven Temperature Column Cylinder with Vertex Colors
function TemperatureColumnMesh({ 
  depths, 
  temperatures 
}: { 
  depths: number[]; 
  temperatures: number[] 
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  const { geometry, ringPositions } = useMemo(() => {
    const radialSegments = 32;
    const heightSegments = 64;
    const radius = 3.2;
    const totalHeight = 100; // 0 to -100

    const geom = new THREE.CylinderGeometry(
      radius,
      radius,
      totalHeight,
      radialSegments,
      heightSegments,
      true
    );
    // Center so top is at Y = 0, bottom at Y = -100
    geom.translate(0, -totalHeight / 2, 0);

    const posAttr = geom.attributes.position;
    const count = posAttr.count;
    const colors = new Float32Array(count * 3);

    // Color each vertex according to its depth
    for (let i = 0; i < count; i++) {
      const y = posAttr.getY(i);
      const depthM = -y / DEPTH_SCALE; // e.g. -20 -> 200m
      const temp = interpolate(depths, temperatures, depthM);

      // Temperature map: 4C (cold cyan-blue) to 30C (warm coral)
      const normTemp = THREE.MathUtils.clamp((temp - 4) / (30 - 4), 0, 1);
      const color = new THREE.Color();
      // Hue from 220 (deep blue) down to 10 (coral red)
      const hue = THREE.MathUtils.lerp(0.62, 0.03, normTemp);
      color.setHSL(hue, 0.9, 0.55);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Depth milestone rings
    const rings: { depth: number; y: number }[] = DEPTH_LEVELS.map((d) => ({
      depth: d,
      y: -(d * DEPTH_SCALE),
    }));

    return { geometry: geom, ringPositions: rings };
  }, [depths, temperatures]);

  // Top surface cap color matching 0m temperature (warm coral)
  const surfaceColor = useMemo(() => {
    const sst = temperatures[0] ?? 29.8;
    const norm = THREE.MathUtils.clamp((sst - 4) / 26, 0, 1);
    const c = new THREE.Color();
    c.setHSL(THREE.MathUtils.lerp(0.62, 0.03, norm), 0.92, 0.58);
    return c;
  }, [temperatures]);

  return (
    <group>
      {/* Semi-transparent thermal column cylinder */}
      <mesh ref={meshRef} geometry={geometry} renderOrder={5}>
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.82}
          roughness={0.15}
          metalness={0.05}
          side={THREE.DoubleSide}
          blending={THREE.NormalBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Surface disc cap at 0m (top of cylinder) so column is capped and visible from above */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
        <circleGeometry args={[3.2, 32]} />
        <meshBasicMaterial
          color={surfaceColor}
          transparent
          opacity={0.88}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Internal depth markers */}
      {ringPositions.map((r, i) => (
        <mesh key={i} position={[0, r.y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={7}>
          <ringGeometry args={[3.25, 3.42, 48]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={r.depth % 200 === 0 ? 0.75 : 0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// Holographic Scanner Ring with Local PointLight
function DepthScannerRing({ depth, currentTemp }: { depth: number; currentTemp: number }) {
  const ringRef = useRef<THREE.Group>(null!);
  const outerMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const innerMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);

  const targetY = -(depth * DEPTH_SCALE);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.position.y = THREE.MathUtils.lerp(
        ringRef.current.position.y,
        targetY,
        delta * 6.0
      );
      ringRef.current.rotation.y += delta * 0.5;
    }
    
    const baseColor = getTempColorTarget(currentTemp, 0.9, 0.6);
    if (outerMatRef.current) outerMatRef.current.color.lerp(baseColor.clone().multiplyScalar(2.8), delta * 4.0);
    if (innerMatRef.current) innerMatRef.current.color.lerp(baseColor, delta * 4.0);
    if (lightRef.current) lightRef.current.color.lerp(baseColor, delta * 4.0);
  });

  return (
    <group ref={ringRef} position={[0, targetY, 0]} renderOrder={10}>
      {/* Outer Torus scanner */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
        <torusGeometry args={[5.2, 0.09, 16, 48]} />
        <meshBasicMaterial ref={outerMatRef} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Inner reticle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
        <ringGeometry args={[4.2, 4.32, 48]} />
        <meshBasicMaterial ref={innerMatRef} transparent opacity={0.65} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Localized PointLight illuminating surrounding water */}
      <pointLight ref={lightRef} intensity={3.0} distance={25} decay={1.5} />
    </group>
  );
}

// Dynamic Underwater Lighting & Depth Camera Choreographer
function SceneRig({ depth, currentTemp }: { depth: number; currentTemp: number }) {
  const { camera, scene } = useThree();
  const dirLightRef   = useRef<THREE.DirectionalLight>(null!);
  const hemiLightRef  = useRef<THREE.HemisphereLight>(null!);
  const fillLightRef  = useRef<THREE.PointLight>(null!);

  // Active depth position in scene units: Y = -(depth * DEPTH_SCALE)
  // Position camera so active depth level is vertically centered in view.
  const targetDepthY = -(depth * DEPTH_SCALE);
  const targetCamY = targetDepthY - 2.8;

  useFrame((state, delta) => {
    // Smooth camera depth lerp
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, delta * 4.0);

    // Subtle natural Lissajous water bobbing
    const t = state.clock.getElapsedTime();
    camera.position.x = 12.0 + Math.sin(t * 0.35) * 0.5;
    camera.position.z = 12.0 + Math.cos(t * 0.28) * 0.5;
    
    // Look directly at the thermal column at the active depth level!
    camera.lookAt(0, camera.position.y + 2.8, 0);

    // Smooth ambient background color transition based on temperature
    const bgTarget = getTempColorTarget(currentTemp, 0.7, 0.06); // Dark rich background
    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(bgTarget, delta * 2.0);
    }
    
    // Keep fill light locked to camera for consistent scene brightness
    if (fillLightRef.current) {
      fillLightRef.current.position.copy(camera.position);
      fillLightRef.current.color.lerp(getTempColorTarget(currentTemp, 0.8, 0.6), delta * 3.0);
    }

    if (dirLightRef.current) {
      const sunIntensity = Math.max(0.8, 2.8 * Math.exp(-0.005 * depth));
      dirLightRef.current.intensity = THREE.MathUtils.lerp(
        dirLightRef.current.intensity,
        sunIntensity,
        delta * 3.0
      );
      dirLightRef.current.position.set(10, camera.position.y + 30, 10);
    }

    if (hemiLightRef.current) {
      const ambientFactor = Math.max(0.65, 1.1 * Math.exp(-0.003 * depth));
      hemiLightRef.current.intensity = THREE.MathUtils.lerp(
        hemiLightRef.current.intensity,
        ambientFactor,
        delta * 3.0
      );
      hemiLightRef.current.color.lerp(getTempColorTarget(currentTemp, 0.9, 0.4), delta * 2.0);
      hemiLightRef.current.groundColor.lerp(getTempColorTarget(currentTemp, 0.8, 0.1), delta * 2.0);
    }
  });

  return (
    <>
      {/* Strong ambient so geometry is visible at all depths */}
      <ambientLight intensity={0.7} />

      {/* Sky/ground hemisphere */}
      <hemisphereLight
        ref={hemiLightRef}
        args={['#38bdf8', '#0c1a2e', 1.0]}
      />

      {/* Sun direction from above-right */}
      <directionalLight
        ref={dirLightRef}
        position={[10, 30, 10]}
        color="#d0f0ff"
        intensity={2.8}
        castShadow={false}
      />

      {/* Camera-following fill light — keeps near geometry visible */}
      <pointLight
        ref={fillLightRef}
        color="#7dd3fc"
        intensity={2.2}
        distance={70}
        decay={1.2}
      />
    </>
  );
}


// ── 3. Main Export Component ──────────────────────────────────────────────────

export default function OceanColumnViz({ onExit }: { onExit?: () => void }) {
  const selectedLat = useExplorerStore((s) => s.selectedLat);
  const selectedLon = useExplorerStore((s) => s.selectedLon);
  const selectedDate = useExplorerStore((s) => s.selectedDate);
  const selectedDepth = useExplorerStore((s) => s.selectedDepth);
  const clearSelectedPoint = useExplorerStore((s) => s.clearSelectedPoint);

  // Fetch real subsurface profile for this coordinate
  const { data: profile } = useSubsurfaceProfile(
    selectedLat !== null && selectedLon !== null
      ? { lat: selectedLat, lon: selectedLon, date: selectedDate }
      : null
  );

  const depths = useMemo(
    () => profile?.depths ?? [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000],
    [profile]
  );
  const temperatures = useMemo(
    () => profile?.temperature ?? [28.6, 28.5, 28.4, 28.1, 27.5, 26.0, 23.4, 20.8, 18.5, 16.2, 14.1, 10.8, 7.2, 6.1, 5.4],
    [profile]
  );

  const currentTemp = useMemo(
    () => interpolate(depths, temperatures, selectedDepth),
    [depths, temperatures, selectedDepth]
  );

  const zone = useMemo(() => getZone(selectedDepth), [selectedDepth]);

  if (selectedLat === null || selectedLon === null) return null;

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-auto overflow-hidden"
      style={{ background: '#020b18' }}
    >
      {/* 3D WebGL Canvas filling full viewport */}
      <Canvas
        camera={{ position: [12, -2.8, 12], fov: 52, near: 0.1, far: 400 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
      >
        {/* Deep ocean scene background (color will be animated by SceneRig) */}
        <color attach="background" args={['#020b18']} />

        <SceneRig depth={selectedDepth} currentTemp={currentTemp} />
        <OceanSurfaceMesh />
        <GodRays depth={selectedDepth} currentTemp={currentTemp} />
        <MarineParticles depth={selectedDepth} currentTemp={currentTemp} />
        <TemperatureColumnMesh depths={depths} temperatures={temperatures} />
        <DepthScannerRing depth={selectedDepth} currentTemp={currentTemp} />

        <EffectComposer multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.7} />
          <Vignette eskil={false} offset={0.25} darkness={0.4} />
          <Noise opacity={0.015} />
        </EffectComposer>
      </Canvas>

      {/* Subtle depth ambiance overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(2, 11, 20, 0.35) 85%, rgba(2, 11, 20, 0.65) 100%)',
        }}
      />

      {/* ── Back to Globe button ─────────────────────────────────────────── */}
      {onExit && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
          onClick={onExit}
          className="absolute top-20 left-72 z-50 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{
            background: 'rgba(2, 20, 35, 0.75)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#7dd3fc',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <ArrowLeft size={15} strokeWidth={2.2} />
          Back to Globe
        </motion.button>
      )}

      {/* ── Location chip ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
        style={{
          background: 'rgba(2, 20, 35, 0.65)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.18)',
          color: '#94a3b8',
        }}
      >
        <MapPin size={11} strokeWidth={2} className="text-sky-400" />
        <span className="text-sky-300 font-mono">
          {selectedLat.toFixed(3)}°{selectedLat >= 0 ? 'N' : 'S'}&nbsp;
          {selectedLon.toFixed(3)}°{selectedLon >= 0 ? 'E' : 'W'}
        </span>
      </motion.div>
    </div>
  );
}
