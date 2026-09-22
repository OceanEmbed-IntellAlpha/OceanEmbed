'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGliderStore } from './useGliderStore';
import { GLIDER_TRAJECTORY_CURVE } from './useGliderMission';

// Realistic Deep Ocean Palette — Natural Blues (no neon, no black)
// 1. Midnight (0.00 / 1.00)
const C_SKY_MIDNIGHT_TOP = new THREE.Color(0x0a1e3d);
const C_SKY_MIDNIGHT_HORIZ = new THREE.Color(0x133a60);
const C_OCEAN_MIDNIGHT_SURFACE = new THREE.Color(0x124f7a);
const C_OCEAN_MIDNIGHT_PHOTIC = new THREE.Color(0x0e4268);
const C_OCEAN_MIDNIGHT_MESO = new THREE.Color(0x0a3555);
const C_OCEAN_MIDNIGHT_ABYSS = new THREE.Color(0x072a46);
const C_KEY_MIDNIGHT = new THREE.Color(0x6ba3d6);
const C_HEMI_SKY_MIDNIGHT = new THREE.Color(0x1a4fa5);
const C_HEMI_GROUND_MIDNIGHT = new THREE.Color(0x0a3555);

// 2. Dawn / Sunrise (0.28)
const C_SKY_DAWN_TOP = new THREE.Color(0x165298);
const C_SKY_DAWN_HORIZ = new THREE.Color(0x8ec8e0);
const C_OCEAN_DAWN_SURFACE = new THREE.Color(0x1fadc5);
const C_OCEAN_DAWN_PHOTIC = new THREE.Color(0x118da8);
const C_OCEAN_DAWN_MESO = new THREE.Color(0x087090);
const C_OCEAN_DAWN_ABYSS = new THREE.Color(0x045570);
const C_KEY_DAWN = new THREE.Color(0xffedd5);
const C_HEMI_SKY_DAWN = new THREE.Color(0x7bb8d4);
const C_HEMI_GROUND_DAWN = new THREE.Color(0x045570);

// 3. High Noon / Daylight (0.50) — Natural realistic deep ocean (rich blue, not neon)
const C_SKY_NOON_TOP = new THREE.Color(0x0e4278);       // Deep sky cerulean
const C_SKY_NOON_HORIZ = new THREE.Color(0x87ceeb);     // Natural sky blue horizon
const C_OCEAN_NOON_SURFACE = new THREE.Color(0x1a9bb5);  // Natural ocean teal surface
const C_OCEAN_NOON_PHOTIC = new THREE.Color(0x0e7fa0);   // Deeper ocean blue-green
const C_OCEAN_NOON_MESO = new THREE.Color(0x066890);     // Deep ocean blue
const C_OCEAN_NOON_ABYSS = new THREE.Color(0x044e72);    // Deep sapphire (still clearly blue)
const C_KEY_NOON = new THREE.Color(0xfff8e8);
const C_HEMI_SKY_NOON = new THREE.Color(0x7abdd5);
const C_HEMI_GROUND_NOON = new THREE.Color(0x044e72);

// 4. Sunset / Golden Hour (0.75)
const C_SKY_SUNSET_TOP = new THREE.Color(0x241648);
const C_SKY_SUNSET_HORIZ = new THREE.Color(0xf0852e);
const C_OCEAN_SUNSET_SURFACE = new THREE.Color(0x1690a8);
const C_OCEAN_SUNSET_PHOTIC = new THREE.Color(0x0a7090);
const C_OCEAN_SUNSET_MESO = new THREE.Color(0x055878);
const C_OCEAN_SUNSET_ABYSS = new THREE.Color(0x034562);
const C_KEY_SUNSET = new THREE.Color(0xf0852e);
const C_HEMI_SKY_SUNSET = new THREE.Color(0xd96818);
const C_HEMI_GROUND_SUNSET = new THREE.Color(0x034562);

export function GliderOceanEnvironment() {
  const viewMode = useGliderStore((s) => s.viewMode);
  const missionTime = useGliderStore((s) => s.missionTime);
  const diurnalMode = useGliderStore((s) => s.diurnalMode);

  // Mesh & Light references
  const sunRef = useRef<THREE.Group>(null!);
  const moonRef = useRef<THREE.Group>(null!);
  const starsRef = useRef<THREE.Points>(null!);
  const marineSnowRef = useRef<THREE.Points>(null!);

  const ambientLightRef = useRef<THREE.AmbientLight>(null!);
  const sunLightRef = useRef<THREE.DirectionalLight>(null!);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null!);

  // Smooth continuous solar progress [0.0 - 1.0)
  const currentSolarRef = useRef<number>(0.50);

  // Reusable lerp color buffers
  const curSkyTop = useMemo(() => new THREE.Color(), []);
  const curSkyHoriz = useMemo(() => new THREE.Color(), []);
  const curOceanSurface = useMemo(() => new THREE.Color(), []);
  const curOceanPhotic = useMemo(() => new THREE.Color(), []);
  const curOceanMeso = useMemo(() => new THREE.Color(), []);
  const curOceanAbyss = useMemo(() => new THREE.Color(), []);
  const curKeyColor = useMemo(() => new THREE.Color(), []);
  const curHemiSky = useMemo(() => new THREE.Color(), []);
  const curHemiGround = useMemo(() => new THREE.Color(), []);

  // 1. World-Space Calibrated Seamless Ocean Shader (Pure, vibrant, radiant blue ocean)
  const oceanMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOceanSurface: { value: new THREE.Color(C_OCEAN_NOON_SURFACE) },
        uOceanPhotic: { value: new THREE.Color(C_OCEAN_NOON_PHOTIC) },
        uOceanMeso: { value: new THREE.Color(C_OCEAN_NOON_MESO) },
        uOceanAbyss: { value: new THREE.Color(C_OCEAN_NOON_ABYSS) },
        uSkyHoriz: { value: new THREE.Color(C_SKY_NOON_HORIZ) },
        uSkyTop: { value: new THREE.Color(C_SKY_NOON_TOP) },
        uTime: { value: 0 },
        uSunWorldPos: { value: new THREE.Vector3(-12.0, 4.2, -5.2) },
        uSunIntensity: { value: 0.4 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        uniform vec3 uOceanSurface;
        uniform vec3 uOceanPhotic;
        uniform vec3 uOceanMeso;
        uniform vec3 uOceanAbyss;
        uniform vec3 uSkyHoriz;
        uniform vec3 uSkyTop;
        uniform float uTime;
        uniform vec3 uSunWorldPos;
        uniform float uSunIntensity;

        void main() {
          float waterY = 1.35;
          float wy = vWorldPos.y;
          vec3 col;

          if (wy >= waterY) {
            // Atmospheric coastal sky hemisphere
            float skyH = clamp((wy - waterY) / 7.0, 0.0, 1.0);
            col = mix(uSkyHoriz, uSkyTop, pow(skyH, 0.65));

            // Radiant solar corona glow
            float sDist = length(vWorldPos - uSunWorldPos);
            float sGlow = exp(-sDist * 0.28) * uSunIntensity;
            col += vec3(1.0, 0.98, 0.88) * sGlow;
          } else {
            // Pure, vibrant ocean water column (Radiant cyan -> azure -> sapphire blue)
            float depth = clamp((waterY - wy) / 3.4, 0.0, 1.0);

            vec3 c0 = uOceanSurface; // Luminous cyan #67e8f9
            vec3 c1 = uOceanPhotic;  // Tropical turquoise #38d9f5
            vec3 c2 = uOceanMeso;    // Vibrant azure #0ea5e9
            vec3 c3 = uOceanAbyss;   // Rich deep ocean sapphire #0284c7 (NEVER black!)

            if (depth < 0.25) {
              float t = depth / 0.25;
              col = mix(c0, c1, smoothstep(0.0, 1.0, t));

              // Natural caustic shimmer in upper photic layer
              float c1Val = sin(vWorldPos.x * 1.8 + uTime * 1.1) * sin(vWorldPos.y * 3.2 + uTime * 0.8);
              float c2Val = cos(vWorldPos.x * 2.8 - uTime * 0.9) * sin(vWorldPos.y * 1.8 + uTime * 1.2);
              float caustic = pow(max(0.0, (c1Val + c2Val) * 0.45 + 0.5), 2.0) * (1.0 - t) * 0.12;
              col += vec3(0.2, 0.6, 0.75) * caustic;
            } else if (depth < 0.65) {
              float t = (depth - 0.25) / 0.40;
              col = mix(c1, c2, smoothstep(0.0, 1.0, t));
            } else {
              float t = (depth - 0.65) / 0.35;
              col = mix(c2, c3, smoothstep(0.0, 1.0, t));
            }
          }

          // Undulating crisp waterline wave right at waterY
          float waveDisplace = sin(vWorldPos.x * 1.5 + uTime * 1.8) * 0.02 + cos(vWorldPos.x * 3.0 - uTime * 2.2) * 0.01;
          float edgeDist = abs(wy - (waterY + waveDisplace));
           if (edgeDist < 0.04) {
             float edgeFade = 1.0 - edgeDist / 0.04;
             col += vec3(0.35, 0.75, 0.85) * edgeFade * 0.3;
           }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  // 2. Vast Bathymetric Seabed Geometry with soft topography (Illuminated shelf, not black mud)
  const seabedGeometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(160, 20, 96, 12);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const elevation =
        Math.sin(x * 0.22) * 0.12 +
        Math.cos(y * 0.28) * 0.06 +
        Math.sin(x * 0.55 + y * 0.4) * 0.03;
      pos.setZ(i, elevation);
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    return geom;
  }, []);

  // 3. Sawtooth Trajectory Line
  const trajectoryLine = useMemo(() => {
    const points = GLIDER_TRAJECTORY_CURVE.getPoints(160);
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: '#38d9f5',
      dashSize: 0.16,
      gapSize: 0.10,
      transparent: true,
      opacity: 0.90,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    return line;
  }, []);

  // 4. Starfield for night sky
  const starGeo = useMemo(() => {
    const count = 280;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = 1.45 + Math.random() * 8.0;
      positions[i * 3 + 2] = -5.5 + (Math.random() - 0.5) * 3.0;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, []);

  // 5. Marine Snow & Pelagic Particulates
  const snowData = useMemo(() => {
    const count = 160;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = -1.9 + Math.random() * 3.2;
      positions[i * 3 + 2] = -3.0 + Math.random() * 4.5;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geom, count };
  }, []);

  // Frame Animation Loop: Dynamic Diurnal Cycle, Waves, Particulates
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Diurnal Solar Target: Stay in brilliant midday/coastal sun during mission playback
    let targetSolar = 0.50;
    if (diurnalMode === 'noon') {
      targetSolar = 0.50;
    } else if (diurnalMode === 'sunset') {
      targetSolar = 0.75;
    } else if (diurnalMode === 'night') {
      targetSolar = 0.0;
    } else {
      // In auto mode, stay in pleasant midday hours (11:00 AM to 02:00 PM)
      targetSolar = 0.46 + missionTime * 0.12;
    }

    let diff = targetSolar - currentSolarRef.current;
    if (diff < -0.5) diff += 1.0;
    if (diff > 0.5) diff -= 1.0;

    currentSolarRef.current += diff * Math.min(1.0, delta * 2.0);
    if (currentSolarRef.current < 0) currentSolarRef.current += 1.0;
    if (currentSolarRef.current >= 1) currentSolarRef.current -= 1.0;

    const s = currentSolarRef.current;

    // 2. Diurnal Interpolation
    let phaseT = 0;
    let keyIntensity = 4.4;

    if (s < 0.25) {
      const raw = s / 0.25;
      phaseT = raw * raw * (3 - 2 * raw);
      curSkyTop.lerpColors(C_SKY_MIDNIGHT_TOP, C_SKY_DAWN_TOP, phaseT);
      curSkyHoriz.lerpColors(C_SKY_MIDNIGHT_HORIZ, C_SKY_DAWN_HORIZ, phaseT);
      curOceanSurface.lerpColors(C_OCEAN_MIDNIGHT_SURFACE, C_OCEAN_DAWN_SURFACE, phaseT);
      curOceanPhotic.lerpColors(C_OCEAN_MIDNIGHT_PHOTIC, C_OCEAN_DAWN_PHOTIC, phaseT);
      curOceanMeso.lerpColors(C_OCEAN_MIDNIGHT_MESO, C_OCEAN_DAWN_MESO, phaseT);
      curOceanAbyss.lerpColors(C_OCEAN_MIDNIGHT_ABYSS, C_OCEAN_DAWN_ABYSS, phaseT);
      curKeyColor.lerpColors(C_KEY_MIDNIGHT, C_KEY_DAWN, phaseT);
      curHemiSky.lerpColors(C_HEMI_SKY_MIDNIGHT, C_HEMI_SKY_DAWN, phaseT);
      curHemiGround.lerpColors(C_HEMI_GROUND_MIDNIGHT, C_HEMI_GROUND_DAWN, phaseT);
      keyIntensity = THREE.MathUtils.lerp(2.2, 4.0, phaseT);
    } else if (s < 0.50) {
      const raw = (s - 0.25) / 0.25;
      phaseT = raw * raw * (3 - 2 * raw);
      curSkyTop.lerpColors(C_SKY_DAWN_TOP, C_SKY_NOON_TOP, phaseT);
      curSkyHoriz.lerpColors(C_SKY_DAWN_HORIZ, C_SKY_NOON_HORIZ, phaseT);
      curOceanSurface.lerpColors(C_OCEAN_DAWN_SURFACE, C_OCEAN_NOON_SURFACE, phaseT);
      curOceanPhotic.lerpColors(C_OCEAN_DAWN_PHOTIC, C_OCEAN_NOON_PHOTIC, phaseT);
      curOceanMeso.lerpColors(C_OCEAN_DAWN_MESO, C_OCEAN_NOON_MESO, phaseT);
      curOceanAbyss.lerpColors(C_OCEAN_DAWN_ABYSS, C_OCEAN_NOON_ABYSS, phaseT);
      curKeyColor.lerpColors(C_KEY_DAWN, C_KEY_NOON, phaseT);
      curHemiSky.lerpColors(C_HEMI_SKY_DAWN, C_HEMI_SKY_NOON, phaseT);
      curHemiGround.lerpColors(C_HEMI_GROUND_DAWN, C_HEMI_GROUND_NOON, phaseT);
      keyIntensity = THREE.MathUtils.lerp(4.0, 4.8, phaseT);
    } else if (s < 0.75) {
      const raw = (s - 0.50) / 0.25;
      phaseT = raw * raw * (3 - 2 * raw);
      curSkyTop.lerpColors(C_SKY_NOON_TOP, C_SKY_SUNSET_TOP, phaseT);
      curSkyHoriz.lerpColors(C_SKY_NOON_HORIZ, C_SKY_SUNSET_HORIZ, phaseT);
      curOceanSurface.lerpColors(C_OCEAN_NOON_SURFACE, C_OCEAN_SUNSET_SURFACE, phaseT);
      curOceanPhotic.lerpColors(C_OCEAN_NOON_PHOTIC, C_OCEAN_SUNSET_PHOTIC, phaseT);
      curOceanMeso.lerpColors(C_OCEAN_NOON_MESO, C_OCEAN_SUNSET_MESO, phaseT);
      curOceanAbyss.lerpColors(C_OCEAN_NOON_ABYSS, C_OCEAN_SUNSET_ABYSS, phaseT);
      curKeyColor.lerpColors(C_KEY_NOON, C_KEY_SUNSET, phaseT);
      curHemiSky.lerpColors(C_HEMI_SKY_NOON, C_HEMI_SKY_SUNSET, phaseT);
      curHemiGround.lerpColors(C_HEMI_GROUND_NOON, C_HEMI_GROUND_SUNSET, phaseT);
      keyIntensity = THREE.MathUtils.lerp(4.8, 3.2, phaseT);
    } else {
      const raw = (s - 0.75) / 0.25;
      phaseT = raw * raw * (3 - 2 * raw);
      curSkyTop.lerpColors(C_SKY_SUNSET_TOP, C_SKY_MIDNIGHT_TOP, phaseT);
      curSkyHoriz.lerpColors(C_SKY_SUNSET_HORIZ, C_SKY_MIDNIGHT_HORIZ, phaseT);
      curOceanSurface.lerpColors(C_OCEAN_SUNSET_SURFACE, C_OCEAN_MIDNIGHT_SURFACE, phaseT);
      curOceanPhotic.lerpColors(C_OCEAN_SUNSET_PHOTIC, C_OCEAN_MIDNIGHT_PHOTIC, phaseT);
      curOceanMeso.lerpColors(C_OCEAN_SUNSET_MESO, C_OCEAN_MIDNIGHT_MESO, phaseT);
      curOceanAbyss.lerpColors(C_OCEAN_SUNSET_ABYSS, C_OCEAN_MIDNIGHT_ABYSS, phaseT);
      curKeyColor.lerpColors(C_KEY_SUNSET, C_KEY_MIDNIGHT, phaseT);
      curHemiSky.lerpColors(C_HEMI_SKY_SUNSET, C_HEMI_SKY_MIDNIGHT, phaseT);
      curHemiGround.lerpColors(C_HEMI_GROUND_SUNSET, C_HEMI_GROUND_MIDNIGHT, phaseT);
      keyIntensity = THREE.MathUtils.lerp(3.2, 2.2, phaseT);
    }

    // 3. Sun & Moon Arcs
    const isDayWindow = s >= 0.18 && s <= 0.82;
    let sunX = -14.0;
    let sunY = 1.35;
    let sunSine = 0;

    if (isDayWindow) {
      const sunTau = (s - 0.18) / (0.82 - 0.18);
      const angle = sunTau * Math.PI;
      sunSine = Math.sin(angle);
      sunX = -18.0 * Math.cos(angle);
      sunY = 1.45 + 4.5 * sunSine;
    }

    if (sunRef.current) {
      sunRef.current.position.set(sunX, sunY, -5.2);
      sunRef.current.visible = isDayWindow && sunY > 1.35;
    }

    // Moon
    const moonS = (s + 0.5) % 1.0;
    const isMoonWindow = moonS >= 0.18 && moonS <= 0.82;
    let moonX = 18.0;
    let moonY = 1.35;

    if (isMoonWindow) {
      const moonTau = (moonS - 0.18) / (0.82 - 0.18);
      const angle = moonTau * Math.PI;
      moonX = -18.0 * Math.cos(angle);
      moonY = 1.45 + 4.0 * Math.sin(angle);
    }

    if (moonRef.current) {
      moonRef.current.position.set(moonX, moonY, -5.2);
      moonRef.current.visible = isMoonWindow && moonY > 1.35;
    }

    // 4. Uniforms
    oceanMaterial.uniforms.uOceanSurface.value.copy(curOceanSurface);
    oceanMaterial.uniforms.uOceanPhotic.value.copy(curOceanPhotic);
    oceanMaterial.uniforms.uOceanMeso.value.copy(curOceanMeso);
    oceanMaterial.uniforms.uOceanAbyss.value.copy(curOceanAbyss);
    oceanMaterial.uniforms.uSkyHoriz.value.copy(curSkyHoriz);
    oceanMaterial.uniforms.uSkyTop.value.copy(curSkyTop);
    oceanMaterial.uniforms.uTime.value = t;
    oceanMaterial.uniforms.uSunWorldPos.value.set(sunX, sunY, -5.2);
    oceanMaterial.uniforms.uSunIntensity.value = sunSine * 0.4;

    // 5. Lighting (Natural Ocean Radiance)
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = 1.8;
      ambientLightRef.current.color.copy(curOceanSurface);
    }
    if (sunLightRef.current) {
      sunLightRef.current.position.set(sunX * 0.7, Math.max(3.0, sunY + 4.0), 8.0);
      sunLightRef.current.intensity = keyIntensity;
      sunLightRef.current.color.copy(curKeyColor);
    }
    if (hemiLightRef.current) {
      hemiLightRef.current.color.copy(curHemiSky);
      hemiLightRef.current.groundColor.copy(curHemiGround);
      hemiLightRef.current.intensity = 1.5;
    }

    // Stars
    if (starsRef.current) {
      let nightFactor = 0;
      if (s <= 0.16 || s >= 0.84) nightFactor = 1.0;
      else if (s > 0.16 && s < 0.28) nightFactor = 1.0 - (s - 0.16) / 0.12;
      else if (s > 0.72 && s < 0.84) nightFactor = (s - 0.72) / 0.12;
      const starsMat = starsRef.current.material as THREE.PointsMaterial;
      starsMat.opacity = nightFactor * 0.85;
      starsRef.current.visible = nightFactor > 0.01;
    }

    // Marine snow
    if (marineSnowRef.current) {
      const pos = marineSnowRef.current.geometry.attributes.position;
      for (let i = 0; i < snowData.count; i++) {
        let y = pos.getY(i) - delta * 0.035;
        const x = pos.getX(i) + Math.sin(t * 0.5 + i) * delta * 0.012;
        if (y < -2.1) y = 1.35;
        pos.setY(i, y);
        pos.setX(i, x);
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* ── BOUNDLESS SEAMLESS OCEAN & ATMOSPHERE BACKDROP ─────────── */}
      <mesh position={[0, 0.4, -6.5]}>
        <planeGeometry args={[160, 38]} />
        <primitive object={oceanMaterial} attach="material" />
      </mesh>

      {/* ── CELESTIAL SUN & NATURAL SOLAR CORONA ───────────────────── */}
      <group ref={sunRef} position={[-12.0, 4.2, -5.2]}>
        <mesh>
          <circleGeometry args={[0.75, 36]} />
          <meshBasicMaterial
            color="#fffbed"
            side={THREE.DoubleSide}
            transparent
            opacity={0.98}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <ringGeometry args={[0.72, 2.2, 36]} />
          <meshBasicMaterial
            color="#fed7aa"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* ── CELESTIAL MOON ─────────────────────────────────────────── */}
      <group ref={moonRef} position={[12.0, 4.2, -5.2]}>
        <mesh>
          <circleGeometry args={[0.55, 36]} />
          <meshBasicMaterial
            color="#f8fafc"
            side={THREE.DoubleSide}
            transparent
            opacity={0.95}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <ringGeometry args={[0.52, 1.6, 36]} />
          <meshBasicMaterial
            color="#93c5fd"
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* ── STARFIELD ──────────────────────────────────────────────── */}
      <points ref={starsRef} geometry={starGeo}>
        <pointsMaterial
          color="#ffffff"
          size={0.035}
          transparent
          opacity={0.0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* ── WATER SURFACE PLANE (Y = 1.35 Depth = 0m) ──────────────── */}
      <mesh
        position={[0, 1.35, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[160, 14, 48, 16]} />
        <meshStandardMaterial
          color="#0e8ca0"
          emissive="#044e72"
          emissiveIntensity={0.25}
          roughness={0.3}
          metalness={0.15}
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── ORGANIC BATHYMETRIC SEABED (Illuminated Marine Sapphire Shelf, Y = -2.0) ─ */}
      <mesh
        geometry={seabedGeometry}
        position={[0, -2.0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial
          color="#044e72"
          emissive="#03384f"
          emissiveIntensity={0.22}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* ── MARINE SNOW & ORGANIC PARTICULATE DRIFT ────────────────── */}
      <points ref={marineSnowRef} geometry={snowData.geom}>
        <pointsMaterial
          color="#a5f3fc"
          size={0.022}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* ── SAWTOOTH TRAJECTORY CURVE ──────────────────────────────── */}
      {viewMode === 'mission' && (
        <group>
          <primitive object={trajectoryLine} />
        </group>
      )}

      {/* ── NATURAL OCEAN ATMOSPHERIC LIGHTING ──────────────────────── */}
      <ambientLight ref={ambientLightRef} intensity={1.8} color="#1a9bb5" />
      <directionalLight
        ref={sunLightRef}
        position={[6, 9, 8]}
        intensity={3.8}
        color="#fff8e8"
      />
      <hemisphereLight
        ref={hemiLightRef}
        color="#7abdd5"
        groundColor="#044e72"
        intensity={1.2}
      />
    </group>
  );
}
