'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise, DepthOfField } from '@react-three/postprocessing';
import { Text, Billboard, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSubsurfaceProfile } from '@/lib/api/queries';
import { getZone, interpolate, valueToHsl } from '@/components/cutaway/utils';
import { DEPTH_LEVELS } from '@/lib/api/types';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin } from 'lucide-react';

const DEPTH_SCALE = 0.1;

// ── Helpers ──────────────────────────────────────────────────────────────────
function getTempColorTarget(temp: number, s: number, l: number) {
  const norm = THREE.MathUtils.clamp((temp - 4) / 26, 0, 1);
  const hue = THREE.MathUtils.lerp(0.62, 0.03, norm);
  return new THREE.Color().setHSL(hue, s, l);
}

// ── Shaders ──────────────────────────────────────────────────────────────────

const EcosystemShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uCamDepth;
    attribute float aSize;
    attribute float aSpeed;
    attribute float aPhase;
    attribute float aType; // 0.0 = Sunlit Fish, 1.0 = Bioluminescence

    varying float vType;
    varying float vAlpha;

    void main() {
      vType = aType;
      vec3 pos = position;

      if (aType < 0.5) {
        // Epipelagic Fish (Sunlit zone)
        // Fast horizontal movement
        pos.x += sin(uTime * aSpeed * 2.0 + aPhase) * 15.0;
        pos.z += cos(uTime * aSpeed * 1.5 + aPhase) * 15.0;
        // Keep them constrained to 0 to 250m depth (Y = 0 to -25)
        pos.y = -mod(abs(pos.y + uTime * aSpeed * 0.2), 25.0);
        
        // Fade out as camera goes deep
        vAlpha = smoothstep(30.0, 10.0, uCamDepth);
      } else {
        // Bioluminescent Orbs (Midnight zone)
        // Slow drifting
        pos.x += sin(uTime * aSpeed * 0.5 + aPhase) * 4.0;
        pos.y += cos(uTime * aSpeed * 0.3 + aPhase) * 4.0;
        // Constrain to 200m to 1000m (Y = -20 to -110)
        pos.y = -20.0 - mod(abs(pos.y + uTime * aSpeed), 90.0);
        
        // Fade in as camera goes deep, pulsate based on time
        float pulse = (sin(uTime * aSpeed * 3.0 + aPhase) * 0.5 + 0.5);
        float depthAlpha = smoothstep(10.0, 30.0, uCamDepth);
        vAlpha = depthAlpha * (0.3 + 0.7 * pulse);
      }

      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = aSize * (1.0 / max(0.1, -mvPos.z));
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexFish;
    uniform sampler2D uTexOrb;
    uniform vec3 uTempColor;

    varying float vType;
    varying float vAlpha;

    void main() {
      if (vAlpha < 0.01) discard;

      vec4 texColor;
      if (vType < 0.5) {
        // Fish glint
        texColor = texture2D(uTexFish, gl_PointCoord);
        if (texColor.a < 0.1) discard;
        // Silver/cyan reflection
        gl_FragColor = vec4(mix(vec3(0.8, 0.9, 1.0), uTempColor, 0.3), texColor.a * vAlpha * 0.6);
      } else {
        // Bioluminescent orb
        texColor = texture2D(uTexOrb, gl_PointCoord);
        if (texColor.a < 0.1) discard;
        // Bright neon glow
        vec3 bioColor = mix(vec3(0.0, 1.0, 0.8), vec3(0.2, 0.5, 1.0), vType); // subtle variation
        gl_FragColor = vec4(bioColor * 1.5, texColor.a * vAlpha);
      }
    }
  `
};

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

    #include <fog_pars_vertex>

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
      
      vec4 mvPosition = viewMatrix * worldPos;
      gl_Position = projectionMatrix * mvPosition;
      
      #include <fog_vertex>
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

    #include <fog_pars_fragment>

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 norm = normalize(vNormal);

      bool isUnderwater = cameraPosition.y < vWorldPosition.y;
      if (isUnderwater) norm = -norm;

      float fresnel = clamp(1.0 - dot(viewDir, norm), 0.0, 1.0);
      float fresnelFactor = pow(fresnel, isUnderwater ? 2.5 : 4.0);

      vec3 halfVector = normalize(uSunDirection + viewDir);
      float spec = max(dot(norm, halfVector), 0.0);
      float specular = pow(spec, 250.0) * 1.5; // Tighter, less blown out highlight

      float waveHeight = vWorldPosition.y;
      vec3 baseWater = mix(uDeepColor, uShallowColor, smoothstep(-2.0, 2.0, waveHeight));

      vec3 color = baseWater;
      if (isUnderwater) {
        float snellMask = smoothstep(0.4, 0.6, fresnel);
        float sunDot = max(dot(viewDir, uSunDirection), 0.0);
        vec3 skylight = mix(uShallowColor, uSunColor, pow(sunDot, 8.0)); // Softer skylight
        vec3 underwaterAmbient = mix(uDeepColor, uShallowColor * 0.5, 0.5);
        color = mix(underwaterAmbient, skylight, snellMask);
        color += uSunColor * specular * snellMask * 0.5; // Reduce pink/blowout artifacts
      } else {
        // Looking down at the ocean surface from above
        // Sky reflection
        vec3 skyReflection = mix(vec3(0.05, 0.15, 0.3), vec3(0.4, 0.6, 0.7), fresnelFactor);
        color = mix(uDeepColor * 0.8, skyReflection, 0.6);
        
        // Intense, sharp sun glint (specular path)
        float sunDot = max(dot(viewDir, uSunDirection), 0.0);
        float sunGlint = pow(sunDot, 128.0) * 2.0; // Sharp core
        float sunSpread = pow(sunDot, 32.0) * 0.5; // Wider glow
        color += uSunColor * (sunGlint + sunSpread) * fresnelFactor; // Only reflect strongly at glancing angles
      }

      // Smooth radial fade-out only when underwater so you don't see the edges
      float distFromCenter = length(vWorldPosition.xz) / 1000.0;
      float alpha = 1.0;
      if (isUnderwater) {
        alpha = smoothstep(1.0, 0.4, distFromCenter) * 0.6;
      } else {
        alpha = 0.98; // Solid ocean surface from above
      }

      gl_FragColor = vec4(color, alpha);
      
      #include <fog_fragment>
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

// ── Components ───────────────────────────────────────────────────────────────

function MarineSnowSystem({ depth, currentTemp }: { depth: number, currentTemp: number }) {
  const count = 1500; // Dense marine snow
  const { camera } = useThree();
  
  const [textures, geometry] = useMemo(() => {
    // 1. Generate Marine Snow Texture (Soft, irregular clump)
    const cSnow = document.createElement('canvas');
    cSnow.width = 32; cSnow.height = 32;
    const ctxS = cSnow.getContext('2d');
    if (ctxS) {
      const grad = ctxS.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255,255,255,0.8)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.4)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctxS.fillStyle = grad;
      ctxS.beginPath();
      // Irregular shape
      ctxS.moveTo(16, 0); ctxS.quadraticCurveTo(24, 8, 32, 16);
      ctxS.quadraticCurveTo(24, 24, 16, 32); ctxS.quadraticCurveTo(8, 24, 0, 16);
      ctxS.quadraticCurveTo(8, 8, 16, 0);
      ctxS.fill();
    }
    const texSnow = new THREE.CanvasTexture(cSnow);
    texSnow.colorSpace = THREE.SRGBColorSpace;

    // 2. Generate Bio-Orb Texture (Soft glow)
    const cOrb = document.createElement('canvas');
    cOrb.width = 32; cOrb.height = 32;
    const ctxO = cOrb.getContext('2d');
    if (ctxO) {
      const grad = ctxO.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.2, 'rgba(200,255,255,0.8)');
      grad.addColorStop(0.6, 'rgba(0,255,200,0.2)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctxO.fillStyle = grad;
      ctxO.fillRect(0,0,32,32);
    }
    const texOrb = new THREE.CanvasTexture(cOrb);
    texOrb.colorSpace = THREE.SRGBColorSpace;

    // 3. Geometry setup
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    const types = new Float32Array(count);

    for(let i=0; i<count; i++) {
      const isSnow = i < count * 0.98; // 98% snow, 2% rare bio flashes
      
      // Distribute closely around a cylinder matching the camera bounds
      const r = 2 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      pos[i*3] = 10 + Math.cos(theta) * r; // Offset to match camera X orbit
      pos[i*3+1] = -(Math.random() * 120); // Spread across depth
      pos[i*3+2] = 10 + Math.sin(theta) * r; // Offset to match camera Z orbit

      sizes[i] = isSnow ? 10 + Math.random() * 20 : 30 + Math.random() * 20;
      speeds[i] = 0.5 + Math.random() * 1.5;
      phases[i] = Math.random() * Math.PI * 2;
      types[i] = isSnow ? 0.0 : 1.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aType', new THREE.BufferAttribute(types, 1));

    return [{texSnow, texOrb}, geo];
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uCamDepth: { value: 0 },
    uTexSnow: { value: textures.texSnow },
    uTexOrb: { value: textures.texOrb },
    uTempColor: { value: new THREE.Color() },
    uSpotlightPos: { value: new THREE.Vector3() },
    uSpotlightDir: { value: new THREE.Vector3() },
    uSpotlightIntensity: { value: 0 },
  }), [textures]);

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.getElapsedTime();
    uniforms.uCamDepth.value = THREE.MathUtils.lerp(uniforms.uCamDepth.value, depth * DEPTH_SCALE, delta * 4.0);
    uniforms.uTempColor.value.lerp(getTempColorTarget(currentTemp, 0.8, 0.6), delta * 4.0);
    
    // Pass camera metrics to spotlight
    uniforms.uSpotlightPos.value.copy(camera.position);
    camera.getWorldDirection(uniforms.uSpotlightDir.value);
    
    // Spotlight turns on fully after 300m (30 on depthScale)
    const intensityTarget = depth > 300 ? 1.5 : 0.0;
    uniforms.uSpotlightIntensity.value = THREE.MathUtils.lerp(uniforms.uSpotlightIntensity.value, intensityTarget, delta * 2.0);
  });

  return (
    <points geometry={geometry} renderOrder={4}>
      <shaderMaterial
        vertexShader={EcosystemShader.vertexShader}
        fragmentShader={EcosystemShader.fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function OceanSurfaceMesh() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const uniforms = useMemo(() => THREE.UniformsUtils.merge([
    THREE.UniformsLib['fog'],
    {
      uTime: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(0.0, 50.0, -1000.0).normalize() },
      uDeepColor: { value: new THREE.Color('#023859') },
      uShallowColor: { value: new THREE.Color('#38bdf8') },
      uSunColor: { value: new THREE.Color('#ffecd6') }, // Warm sun color
    }
  ]), []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-10}>
      <planeGeometry args={[2500, 2500, 128, 128]} />
      <shaderMaterial
        vertexShader={OceanSurfaceShader.vertexShader}
        fragmentShader={OceanSurfaceShader.fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        fog={true}
      />
    </mesh>
  );
}

function GodRays({ depth, currentTemp }: { depth: number; currentTemp: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDepth: { value: depth },
      uColor: { value: new THREE.Color('#38bdf8') },
    }),
    [depth]
  );

  useFrame((_, delta) => {
    if (meshRef.current) {
      uniforms.uTime.value += delta;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -2, 0]} renderOrder={-5}>
      <cylinderGeometry args={[20, 20, 40, 32, 1, true]} />
      <shaderMaterial
        vertexShader={GodRaysShader.vertexShader}
        fragmentShader={GodRaysShader.fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        visible={depth >= 1.0} // Hide completely when above water
      />
    </mesh>
  );
}

// ── Camera & Environment Rig ─────────────────────────────────────────────────
function EnvironmentRig({ depth, currentTemp }: { depth: number, currentTemp: number }) {
  const { camera, scene } = useThree();
  const hemiRef = useRef<THREE.HemisphereLight>(null!);

  const targetY = -(depth * DEPTH_SCALE) - 2.8;

  // Setup fog once
  useEffect(() => {
    scene.fog = new THREE.FogExp2('#020b18', 0.02);
    return () => { scene.fog = null; };
  }, [scene]);

  useFrame((state, delta) => {
    const isAboveWater = depth < 1.0;

    // Plunge the camera
    let targetY = -(depth * DEPTH_SCALE);
    if (isAboveWater) {
      targetY = 2.0; // Place camera slightly above the water surface at 0m
    }
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 3.0);
    
    // Orbital sway + Slight upward tilt to see the surface and god rays
    const t = state.clock.getElapsedTime();
    camera.position.x = 10.0 + Math.sin(t * 0.2) * 2.0;
    camera.position.z = 10.0 + Math.cos(t * 0.15) * 2.0;
    
    // Camera LookAt Logic
    // At 0m, offset is 0 so camera is perfectly level (horizontal) to see the sharp horizon.
    // As you dive deeper, it gradually tilts upwards to see the surface/rays.
    const depthNorm = Math.min(1.0, Math.max(0, depth) / 800.0);
    const lookUpOffset = THREE.MathUtils.lerp(0.0, 5.0, depthNorm);
    camera.lookAt(0, camera.position.y + lookUpOffset, 0);

    // ── Scientific Wavelength Light Extinction & Atmosphere ──
    const bgColor = new THREE.Color();
    let fogDensityTarget = 0;

    if (isAboveWater) {
      // Very light atmospheric sky to ensure a sharp horizon line against the dark water
      // Matches the horizon color of the Sky component
      bgColor.set('#b5d6e6'); 
      fogDensityTarget = 0.0001; // Almost no fog above water so we can see the horizon
    } else {
      // Red absorbs first (0-50m). Green absorbs next (50-200m). Blue penetrates to 1000m.
      if (depth < 50) {
        // Epipelagic top: Mix of full spectrum cyan/blue to deep blue
        const dt = Math.max(0, depth) / 50.0;
        bgColor.lerpColors(new THREE.Color('#38bdf8'), new THREE.Color('#0277bd'), dt);
      } else if (depth < 200) {
        // Epipelagic bottom to Mesopelagic: Green fades, leaving intense monochromatic blue
        const dt = (depth - 50) / 150.0;
        bgColor.lerpColors(new THREE.Color('#0277bd'), new THREE.Color('#0d47a1'), dt);
      } else {
        // Bathypelagic: Monochromatic blue fades to absolute black
        const dt = Math.min(1.0, (depth - 200) / 600.0);
        bgColor.lerpColors(new THREE.Color('#0d47a1'), new THREE.Color('#010408'), dt);
      }
      // Fog density increases aggressively underwater to create volumetric murkiness
      fogDensityTarget = 0.02 + Math.min(1.0, depth / 400.0) * 0.12;
    }
    
    if (scene.background instanceof THREE.Color) scene.background.lerp(bgColor, delta * 4.0);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerp(bgColor, delta * 4.0);
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, fogDensityTarget, delta * 4.0);
    }

    // Submersible Headlight fades in below 300m
    if (hemiRef.current) {
      const targetIntensity = depth > 300 ? 0.0 : 1.2 * (1.0 - Math.min(1.0, depth / 300.0));
      hemiRef.current.intensity = THREE.MathUtils.lerp(hemiRef.current.intensity, targetIntensity, delta * 2.0);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemiRef} args={['#ffffff', '#000000', 1.0]} />
      {/* Surface directional light (sun) */}
      <directionalLight position={[10, 20, 10]} color="#ffffff" intensity={2.0} />
    </>
  );
}

// ── ROV Tether (Depth Reference) ─────────────────────────────────────────────
function ROVTether() {
  const markerCount = 20; // 0m to 1000m, every 50m
  const markerSpacing = 50 * DEPTH_SCALE; // 5 units

  return (
    <group position={[2, 0, -5]}> {/* Position it slightly in front and to the right of the camera */}
      {/* The Main Cable */}
      <mesh position={[0, -50, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 120, 8]} />
        <meshStandardMaterial color="#1a202c" roughness={0.8} metalness={0.2} />
      </mesh>
      
      {/* LED Depth Markers and Labels (Every 50m) */}
      {Array.from({ length: markerCount + 1 }).map((_, i) => (
        <group key={i} position={[0, -(i * markerSpacing), 0]}>
          <mesh>
            <cylinderGeometry args={[0.12, 0.12, 0.4, 16]} />
            <meshBasicMaterial toneMapped={false} color={[0, 4, 4]} />
          </mesh>
          <Billboard position={[1.5, 0, 0]}>
            <Text
              color={[0, 3, 3]} // High intensity RGB to force intense bloom
              fontSize={1.2}
              anchorX="center"
              anchorY="middle"
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
              outlineWidth={0.08}
              outlineColor="#000000"
              material-depthTest={false}
              renderOrder={999}
            >
              {`${i * 50}m`}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  );
}

// ── Surface Roof ─────────────────────────────────────────────────────────────
function OceanRoof() {
  return (
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[200, 200, 32, 32]} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function SplitOceanViz({ onExit }: { onExit?: () => void }) {
  const selectedLat = useExplorerStore((s) => s.selectedLat);
  const selectedLon = useExplorerStore((s) => s.selectedLon);
  const selectedDate = useExplorerStore((s) => s.selectedDate);
  const selectedDepth = useExplorerStore((s) => s.selectedDepth);
  const setDepth = useExplorerStore((s) => s.setDepth);
  const clearSelectedPoint = useExplorerStore((s) => s.clearSelectedPoint);

  const { data: profile } = useSubsurfaceProfile(
    selectedLat !== null && selectedLon !== null
      ? { lat: selectedLat, lon: selectedLon, date: selectedDate }
      : null
  );

  const depths = useMemo(() => profile?.depths ?? DEPTH_LEVELS, [profile]);
  const temperatures = useMemo(
    () => profile?.temperature ?? [28.6, 28.5, 28.4, 28.1, 27.5, 26.0, 23.4, 20.8, 18.5, 16.2, 14.1, 10.8, 7.2, 6.1, 5.4],
    [profile]
  );
  const currentTemp = useMemo(() => interpolate(depths, temperatures, selectedDepth), [depths, temperatures, selectedDepth]);

  if (selectedLat === null || selectedLon === null) return null;

  const handleWheel = (e: React.WheelEvent) => {
    // e.deltaY > 0 means scrolling down (going deeper)
    const direction = e.deltaY > 0 ? 1 : -1;
    
    // Find our current depth index and step to the next valid DepthLevel
    const currentIndex = DEPTH_LEVELS.indexOf(selectedDepth as any);
    if (currentIndex === -1) return;
    
    const newIndex = Math.max(0, Math.min(DEPTH_LEVELS.length - 1, currentIndex + direction));
    const newDepth = DEPTH_LEVELS[newIndex];
    
    if (newDepth !== selectedDepth) {
      setDepth(newDepth);
    }
  };

  return (
    <div 
      className="absolute inset-0 w-full h-full pointer-events-auto bg-[#010408]"
      onWheel={handleWheel}
    >
      <Canvas
        camera={{ position: [10, -2.8, 10], fov: 55, near: 0.1, far: 300 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#020b18']} />
        
        <EnvironmentRig depth={selectedDepth} currentTemp={currentTemp} />
        {selectedDepth < 1.0 && (
          <Sky 
            distance={450000} 
            sunPosition={[0, 50, -1000]} 
            inclination={0} 
            azimuth={0.25} 
            turbidity={0.6}
            rayleigh={1.2}
          />
        )}
        <OceanSurfaceMesh />
        <ROVTether />
        <GodRays depth={selectedDepth} currentTemp={currentTemp} />
        <MarineSnowSystem depth={selectedDepth} currentTemp={currentTemp} />

        <EffectComposer multisampling={0}>
          <DepthOfField target={[0, 0, 0]} focalLength={0.02} bokehScale={selectedDepth < 1.0 ? 0 : 4} height={480} />
          {/* High luminanceThreshold ensures only very bright objects (like LED text or direct sun) bloom, preventing the sky/water from blowing out */}
          <Bloom intensity={1.5} luminanceThreshold={0.9} luminanceSmoothing={0.9} />
          <Vignette eskil={false} offset={0.5} darkness={0.8} />
          <Noise opacity={0.035} />
        </EffectComposer>
      </Canvas>

      {/* ── UI Overlays ────────────────────────────────────────────────────── */}
      {onExit && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onExit}
          className="absolute top-20 left-72 z-50 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{
            background: 'rgba(2, 15, 25, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#e2e8f0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <ArrowLeft size={16} /> Back to Globe
        </motion.button>
      )}

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono"
        style={{
          background: 'rgba(2, 15, 25, 0.6)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#cbd5e1',
        }}
      >
        <MapPin size={12} className="text-white/50" />
        {selectedLat.toFixed(3)}°{selectedLat >= 0 ? 'N' : 'S'} &nbsp;
        {selectedLon.toFixed(3)}°{selectedLon >= 0 ? 'E' : 'W'}
      </motion.div>
    </div>
  );
}
