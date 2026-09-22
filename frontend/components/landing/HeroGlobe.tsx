'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import {
  TEXTURE_URLS,
  EARTH,
  SOUNDING_STATIONS,
  SoundingStation,
  ARGO_FLOATS,
  ArgoFloat,
  latLngToVector3,
} from './GlobeConfig';

// ─── Atmospheric Limb Shaders (Razor-thin Rayleigh Scattering) ────────────────

const atmosphereVert = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const outerAtmosphereFrag = `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    float grazing = 1.0 - max(dot(-vNormal, viewDir), 0.0);
    float intensity = pow(grazing, 6.5);
    gl_FragColor = vec4(uColor, intensity * 0.9);
  }
`;

const innerRimFrag = `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
    float intensity = pow(rim, 4.5) * 0.7;
    gl_FragColor = vec4(uColor, intensity);
  }
`;

// ─── 1. Photorealistic Earth & Atmospheric Limb ───────────────────────────────

function EarthSurface() {
  const [earthMap, bumpMap] = useLoader(THREE.TextureLoader, [
    TEXTURE_URLS.earth,
    TEXTURE_URLS.bump,
  ]);

  useMemo(() => {
    earthMap.colorSpace = THREE.SRGBColorSpace;
  }, [earthMap]);

  return (
    <mesh>
      <sphereGeometry args={[EARTH.radius, 64, 64]} />
      <meshStandardMaterial
        map={earthMap}
        bumpMap={bumpMap}
        bumpScale={0.014}
        roughness={0.65}
        metalness={0.06}
      />
    </mesh>
  );
}

function AtmosphereLimb() {
  const outerUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color('#38BDF8') } }),
    []
  );
  const innerUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color('#0284C7') } }),
    []
  );

  return (
    <>
      <mesh>
        <sphereGeometry args={[EARTH.radius * 1.002, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVert}
          fragmentShader={innerRimFrag}
          uniforms={innerUniforms}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH.radius * 1.016, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVert}
          fragmentShader={outerAtmosphereFrag}
          uniforms={outerUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

// ─── 2. Oceanographic Computational Inference Grid (0.25° Resolution) ────────

function OceanographicGrid() {
  const linesGeo = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const r = EARTH.radius + 0.0012;

    // Latitude parallels across the North Indian Ocean (0° to 25°N)
    for (let lat = 0; lat <= 25; lat += 5) {
      for (let lng = 50; lng <= 100; lng += 1.5) {
        const [x1, y1, z1] = latLngToVector3(lat, lng, r);
        const [x2, y2, z2] = latLngToVector3(lat, lng + 1.5, r);
        points.push(new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2));
      }
    }

    // Longitude meridians (55°E to 95°E)
    for (let lng = 55; lng <= 95; lng += 5) {
      for (let lat = 0; lat <= 25; lat += 1.5) {
        const [x1, y1, z1] = latLngToVector3(lat, lng, r);
        const [x2, y2, z2] = latLngToVector3(lat + 1.5, lng, r);
        points.push(new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2));
      }
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <lineSegments geometry={linesGeo}>
      <lineBasicMaterial
        color="#00D2FF"
        transparent
        opacity={0.14}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

// ─── 3. Volumetric Bathymetric Sounding Column (0m to 2000m) ───────────────────
// A cohesive, physical 3D bathymetric water column sample:
// Anchored directly to the ocean surface, enclosed in a subtle translucent glass cylinder,
// displaying 5 calibrated depth strata platforms and an animated vertical scanning wave.

function SubsurfaceSoundingPillar({
  station,
  isActive,
  isConversionActive,
}: {
  station: SoundingStation;
  isActive: boolean;
  isConversionActive: boolean;
}) {
  const pulseRingRef = useRef<THREE.Mesh>(null!);
  const waveDiscRef = useRef<THREE.Mesh>(null!);

  const pos = useMemo(() => {
    const [x, y, z] = latLngToVector3(station.lat, station.lng, EARTH.radius);
    return new THREE.Vector3(x, y, z);
  }, [station.lat, station.lng]);

  const normal = useMemo(() => pos.clone().normalize(), [pos]);
  const orientationQuat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return q;
  }, [normal]);

  const pillarHeight = 0.18;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pulseRingRef.current) {
      const p = (t * 0.7) % 1;
      const scale = 0.6 + p * 2.4;
      pulseRingRef.current.scale.set(scale, scale, scale);
      (pulseRingRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        (1 - p) * (isActive ? 0.9 : 0.4)
      );
    }
    if (waveDiscRef.current) {
      const waveT = (t * 0.85) % 1;
      // Inversion wave scans vertically through the column (0m to 2000m)
      waveDiscRef.current.position.y = (1 - waveT) * pillarHeight;
      (waveDiscRef.current.material as THREE.MeshBasicMaterial).opacity =
        Math.sin(waveT * Math.PI) * (isActive ? 0.95 : 0.5);
    }
  });

  return (
    <group position={pos} quaternion={orientationQuat}>
      {/* ── Surface Coordinate Beacon ── */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.008, 0.013, 24]} />
        <meshBasicMaterial
          color={isActive ? '#00E5FF' : '#38BDF8'}
          transparent
          opacity={isActive ? 0.9 : 0.35}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.002, 0]}>
        <sphereGeometry args={[isActive ? 0.0035 : 0.0022, 12, 12]} />
        <meshBasicMaterial color={isActive ? '#ffffff' : '#7DD3FC'} />
      </mesh>

      {/* Surface Acoustic Ripple */}
      {isActive && (
        <mesh ref={pulseRingRef} position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.012, 0.02, 32]} />
          <meshBasicMaterial
            color="#00E5FF"
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ── Volumetric Column Core: Rendered Exclusively on Active Basin ── */}
      {isActive && (
        <>
          {/* Central Luminous Fiber Core */}
          <mesh position={[0, pillarHeight / 2, 0]}>
            <cylinderGeometry args={[0.0008, 0.0008, pillarHeight, 8]} />
            <meshBasicMaterial
              color="#00E5FF"
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Unified Cylindrical Glass Sheath */}
          <mesh position={[0, pillarHeight / 2, 0]}>
            <cylinderGeometry args={[0.009, 0.005, pillarHeight, 16, 1, true]} />
            <meshBasicMaterial
              color="#00D2FF"
              transparent
              opacity={0.14}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Traveling Neural Inversion Scanner Wave */}
          <mesh ref={waveDiscRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.002, 0.012, 24]} />
            <meshBasicMaterial
              color="#2DD4BF"
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* ── 5 Discrete Depth Strata Platforms ── */}
          {/* 1. Surface (0m) - Warm Coral */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.01, 0.013, 24]} />
            <meshBasicMaterial color="#F97316" transparent opacity={0.85} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>

          {/* 2. Mixed Layer (50m) */}
          <mesh position={[0, pillarHeight * 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.008, 0.011, 20]} />
            <meshBasicMaterial color="#FBBF24" transparent opacity={0.75} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>

          {/* 3. Thermocline (200m - Z20 Core) */}
          <mesh position={[0, pillarHeight * 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.011, 0.014, 24]} />
            <meshBasicMaterial color="#2DD4BF" transparent opacity={0.9} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>

          {/* 4. Intermediate Layer (1000m) */}
          <mesh position={[0, pillarHeight * 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.007, 0.01, 20]} />
            <meshBasicMaterial color="#38BDF8" transparent opacity={0.7} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>

          {/* 5. Abyssal Floor (2000m) */}
          <mesh position={[0, pillarHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.005, 0.008, 20]} />
            <meshBasicMaterial color="#818CF8" transparent opacity={0.8} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── 4. In-Situ ARGO Profiling Floats (Ground Truth) ──────────────────────────

function ArgoFloatBeacon({ float }: { float: ArgoFloat }) {
  const rippleRef = useRef<THREE.Mesh>(null!);
  const beaconRef = useRef<THREE.Mesh>(null!);

  const pos = useMemo(() => {
    const [x, y, z] = latLngToVector3(float.lat, float.lng, EARTH.radius + 0.001);
    return new THREE.Vector3(x, y, z);
  }, [float.lat, float.lng]);

  const normal = useMemo(() => pos.clone().normalize(), [pos]);
  const orientationQuat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return q;
  }, [normal]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (rippleRef.current) {
      const ripT = (t * 0.5 + float.cycle * 0.05) % 1;
      const s = 0.5 + ripT * 2.2;
      rippleRef.current.scale.set(s, s, s);
      (rippleRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - ripT) * 0.65);
    }
    if (beaconRef.current) {
      const blink = Math.sin(t * 5.0 + float.cycle) > 0.3 ? 1.0 : 0.25;
      (beaconRef.current.material as THREE.MeshBasicMaterial).opacity = blink;
    }
  });

  return (
    <group position={pos} quaternion={orientationQuat}>
      <mesh position={[0, 0.004, 0]}>
        <sphereGeometry args={[0.0032, 10, 10]} />
        <meshBasicMaterial color="#10B981" />
      </mesh>
      <mesh ref={beaconRef} position={[0, 0.008, 0]}>
        <sphereGeometry args={[0.0015, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh ref={rippleRef} position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.006, 0.012, 20]} />
        <meshBasicMaterial
          color="#10B981"
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ─── 5. High-Fidelity Sentinel-3 Spacecraft 3D Model ─────────────────────────
// Detailed multi-payload Earth observation satellite (SRAL Altimeter, MWR Radiometer,
// SLSTR Thermal Scanner, Articulated Blue Photovoltaic Wings, and MLI Gold Thermal Insulation)

function SentinelCraftModel({
  leftBeaconRef,
  rightBeaconRef,
}: {
  leftBeaconRef: React.RefObject<THREE.Mesh>;
  rightBeaconRef: React.RefObject<THREE.Mesh>;
}) {
  return (
    <group scale={0.25}>
      {/* ── Main Avionics Bus: Octagonal MLI Thermal Blanket ── */}
      <mesh>
        <cylinderGeometry args={[0.046, 0.046, 0.18, 8]} />
        <meshStandardMaterial
          color="#F59E0B"
          metalness={0.94}
          roughness={0.22}
          emissive="#78350F"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Dorsal Anti-Sun Ceramic Radiator Panel (Zenith facing, +Y) */}
      <mesh position={[0, 0.048, 0]}>
        <boxGeometry args={[0.078, 0.010, 0.16]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.35} metalness={0.1} />
      </mesh>

      {/* Titanium Structural Collars (Forward & Aft Equipment Bays) */}
      <mesh position={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.048, 0.048, 0.02, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, -0.08]}>
        <cylinderGeometry args={[0.048, 0.048, 0.02, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.25} />
      </mesh>

      {/* ── Primary Ocean Remote Sensing Instruments (Nadir Deck, -Y) ── */}
      {/* 1. Synthetic Aperture Radar Altimeter (SRAL) Ku/C-Band Parabolic Dish */}
      <group position={[0, -0.052, 0.01]} rotation={[Math.PI, 0, 0]}>
        {/* Parabolic Reflector */}
        <mesh>
          <cylinderGeometry args={[0.028, 0.012, 0.018, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.7} roughness={0.2} />
        </mesh>
        {/* Central Microwave Sub-Reflector Feed Horn */}
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.002, 0.002, 0.014, 8]} />
          <meshBasicMaterial color="#FBBF24" />
        </mesh>
        {/* Antenna Ring Lip */}
        <mesh position={[0, 0.009, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.026, 0.029, 20]} />
          <meshBasicMaterial color="#38BDF8" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 2. Microwave Radiometer (MWR) Dual Atmospheric Water-Vapor Horns */}
      <mesh position={[0.016, -0.052, -0.03]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.009, 0.016, 12]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[-0.016, -0.052, -0.03]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.009, 0.016, 12]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* 3. SLSTR Infrared Sea Surface Temperature (SST) Radiometer Optical Housing */}
      <mesh position={[0, -0.048, 0.06]}>
        <boxGeometry args={[0.024, 0.012, 0.022]} />
        <meshStandardMaterial color="#0F172A" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── Solar Array Wings (Port & Starboard Wings) ── */}
      {/* Port Solar Wing (Left, -X) */}
      <group position={[-0.24, 0, 0]}>
        {/* Main Photovoltaic Panel */}
        <mesh>
          <boxGeometry args={[0.28, 0.006, 0.11]} />
          <meshStandardMaterial
            color="#0284C7"
            metalness={0.7}
            roughness={0.2}
            emissive="#0369A1"
            emissiveIntensity={0.2}
          />
        </mesh>
        {/* Solar Cell Grid Lines Overlay */}
        <mesh position={[0, 0.004, 0]}>
          <boxGeometry args={[0.27, 0.001, 0.10]} />
          <meshBasicMaterial color="#38BDF8" transparent opacity={0.45} />
        </mesh>
        {/* Gold Thermal Underside */}
        <mesh position={[0, -0.004, 0]}>
          <boxGeometry args={[0.28, 0.001, 0.11]} />
          <meshStandardMaterial color="#D97706" metalness={0.85} roughness={0.3} />
        </mesh>
        {/* Port Wingtip Red Nav Beacon */}
        <mesh ref={leftBeaconRef} position={[-0.145, 0, 0]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color="#EF4444" />
        </mesh>
      </group>

      {/* Starboard Solar Wing (Right, +X) */}
      <group position={[0.24, 0, 0]}>
        {/* Main Photovoltaic Panel */}
        <mesh>
          <boxGeometry args={[0.28, 0.006, 0.11]} />
          <meshStandardMaterial
            color="#0284C7"
            metalness={0.7}
            roughness={0.2}
            emissive="#0369A1"
            emissiveIntensity={0.2}
          />
        </mesh>
        {/* Solar Cell Grid Lines Overlay */}
        <mesh position={[0, 0.004, 0]}>
          <boxGeometry args={[0.27, 0.001, 0.10]} />
          <meshBasicMaterial color="#38BDF8" transparent opacity={0.45} />
        </mesh>
        {/* Gold Thermal Underside */}
        <mesh position={[0, -0.004, 0]}>
          <boxGeometry args={[0.28, 0.001, 0.11]} />
          <meshStandardMaterial color="#D97706" metalness={0.85} roughness={0.3} />
        </mesh>
        {/* Starboard Wingtip Green Nav Beacon */}
        <mesh ref={rightBeaconRef} position={[0.145, 0, 0]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color="#10B981" />
        </mesh>
      </group>

      {/* Solar Wing Drive Yoke Cylinders */}
      <mesh position={[-0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.009, 0.009, 0.04, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>
      <mesh position={[0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.009, 0.009, 0.04, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      {/* ── Communications & Attitude Determination ── */}
      {/* High-Gain Steerable X-Band Telemetry Dish (Zenith facing, +Y) */}
      <group position={[0.02, 0.065, -0.03]} rotation={[-0.4, 0.3, 0]}>
        <mesh>
          <sphereGeometry args={[0.02, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.002, 0.002, 0.012, 6]} />
          <meshBasicMaterial color="#FBBF24" />
        </mesh>
      </group>

      {/* Dual Star Tracker Optical Baffles (Angled at 45° to space) */}
      <mesh position={[0.028, 0.048, 0.04]} rotation={[0.4, 0.3, 0]}>
        <cylinderGeometry args={[0.005, 0.003, 0.016, 8]} />
        <meshStandardMaterial color="#0F172A" metalness={0.9} />
      </mesh>
      <mesh position={[-0.028, 0.048, 0.04]} rotation={[0.4, -0.3, 0]}>
        <cylinderGeometry args={[0.005, 0.003, 0.016, 8]} />
        <meshStandardMaterial color="#0F172A" metalness={0.9} />
      </mesh>

      {/* DORIS Precise Orbit Determination Helical Antenna Mast */}
      <mesh position={[0, 0.05, 0.07]}>
        <cylinderGeometry args={[0.002, 0.002, 0.035, 6]} />
        <meshStandardMaterial color="#FBBF24" metalness={0.9} />
      </mesh>

      {/* 4 Corner RCS Reaction Control Thruster Pods */}
      {[
        [0.038, 0.03, 0.06],
        [-0.038, 0.03, 0.06],
        [0.038, 0.03, -0.06],
        [-0.038, 0.03, -0.06],
      ].map((pt, idx) => (
        <mesh key={idx} position={pt as [number, number, number]}>
          <boxGeometry args={[0.008, 0.008, 0.008]} />
          <meshStandardMaterial color="#334155" metalness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── 6. Regional Orbital Flight & Synthetic Aperture Scanning System ──────────
// Smoothly anchors its inclined orbital patrol directly over the active ocean basin
// (Arabian Sea, Bay of Bengal, or Equatorial Ridge), banking with real flight physics.
// Emits traveling altimeter radar pulse packets, holographic SAR swath, and surface echoes.

interface PrecisionSentinelProps {
  activeStation: SoundingStation;
  isScanningActive?: boolean;
}

function PrecisionSentinelSatellite({
  activeStation,
  isScanningActive = true,
}: PrecisionSentinelProps) {
  const satGroupRef = useRef<THREE.Group>(null!);
  const swathConeOuterRef = useRef<THREE.Mesh>(null!);
  const swathConeInnerRef = useRef<THREE.Mesh>(null!);
  const wavefront0Ref = useRef<THREE.Mesh>(null!);
  const wavefront1Ref = useRef<THREE.Mesh>(null!);
  const wavefront2Ref = useRef<THREE.Mesh>(null!);
  const footprintRef = useRef<THREE.Group>(null!);
  const echoRing1Ref = useRef<THREE.Mesh>(null!);
  const echoRing2Ref = useRef<THREE.Mesh>(null!);
  const leftBeaconRef = useRef<THREE.Mesh>(null!);
  const rightBeaconRef = useRef<THREE.Mesh>(null!);

  // Wide-swath SAR holographic fan beam
  const swathMeshRef = useRef<THREE.Mesh>(null!);

  // Ground track trail ribbon
  const maxTrail = 24;
  const trailPositions = useMemo(() => new Float32Array(maxTrail * 3), [maxTrail]);
  const trailColors = useMemo(() => {
    const arr = new Float32Array(maxTrail * 3);
    for (let i = 0; i < maxTrail; i++) {
      const alpha = Math.pow(1 - i / (maxTrail - 1), 1.6);
      arr[i * 3 + 0] = 0.0;
      arr[i * 3 + 1] = 0.85 * alpha;
      arr[i * 3 + 2] = 1.0 * alpha;
    }
    return arr;
  }, [maxTrail]);

  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    return geo;
  }, [trailPositions, trailColors]);

  const trailLineObj = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(trailGeo, mat);
    line.frustumCulled = false;
    return line;
  }, [trailGeo]);

  // Swath Fan Geometry (Triangle from satellite apex to 2 across-track ocean surface points)
  const swathPositions = useMemo(() => new Float32Array(9), []);
  const swathGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(swathPositions, 3));
    return geo;
  }, [swathPositions]);

  // Smooth dynamic anchor coordinates over the active oceanic basin
  // Tailored oceanic anchor points & expansive patrol radii strictly within ocean waters
  const regionConfig = useMemo(() => {
    if (activeStation.id.includes('BB')) {
      // Central Bay of Bengal (deep offshore waters)
      return {
        lat: 13.5,
        lng: 88.0,
        radiusX: 0.18,
        radiusY: 0.14,
        inclination: 0.45,
      };
    }
    if (activeStation.id.includes('EQ')) {
      // Equatorial Indian Ocean
      return {
        lat: 1.0,
        lng: 76.5,
        radiusX: 0.22,
        radiusY: 0.11,
        inclination: 0.18,
      };
    }
    // Arabian Sea (deep waters west of India)
    return {
      lat: 14.2,
      lng: 65.5,
      radiusX: 0.18,
      radiusY: 0.14,
      inclination: 0.50,
    };
  }, [activeStation.id]);

  const currentAnchorRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...latLngToVector3(regionConfig.lat, regionConfig.lng, 1.0))
  );

  const prevStationId = useRef(activeStation.id);
  useEffect(() => {
    if (prevStationId.current !== activeStation.id) {
      prevStationId.current = activeStation.id;
      // Pre-fill trail with current anchor so no artifact lines jump across the Earth
      const [ax, ay, az] = latLngToVector3(regionConfig.lat, regionConfig.lng, EARTH.radius + 0.001);
      for (let i = 0; i < maxTrail; i++) {
        trailPositions[i * 3 + 0] = ax;
        trailPositions[i * 3 + 1] = ay;
        trailPositions[i * 3 + 2] = az;
      }
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.computeBoundingSphere();
    }
  }, [activeStation.id, maxTrail, trailPositions, trailGeo, regionConfig]);

  const trailCount = useRef(0);
  const lastSampleTime = useRef(0);

  useFrame((state, delta) => {
    if (!satGroupRef.current) return;
    const t = state.clock.getElapsedTime();

    // 1. Smoothly interpolate regional orbit anchor across ocean basins
    const targetAnchor = new THREE.Vector3(
      ...latLngToVector3(regionConfig.lat, regionConfig.lng, 1.0)
    );
    currentAnchorRef.current.lerp(targetAnchor, delta * 3.2);
    const anchorNormal = currentAnchorRef.current.clone().normalize();

    // 2. Build local Tangent Basis on the Earth Sphere
    const globalNorth = new THREE.Vector3(0, 1, 0);
    const eastVec = new THREE.Vector3().crossVectors(globalNorth, anchorNormal).normalize();
    const northVec = new THREE.Vector3().crossVectors(anchorNormal, eastVec).normalize();

    // 3. Inclined Elliptical Orbit parameters strictly within ocean waters
    // Stately, majestic orbital speed (one smooth orbit loop ~26 seconds)
    const orbitSpeed = 0.24;
    const orbitAngle = t * orbitSpeed;
    const { inclination, radiusX, radiusY } = regionConfig;

    const cosA = Math.cos(orbitAngle);
    const sinA = Math.sin(orbitAngle);
    const u1 = cosA * radiusX;
    const v1 = sinA * radiusY;

    const cosInc = Math.cos(inclination);
    const sinInc = Math.sin(inclination);
    const dx = u1 * cosInc - v1 * sinInc;
    const dy = u1 * sinInc + v1 * cosInc;

    // Exact analytical derivatives d/d(orbitAngle) for jitter-free heading
    const du_dt = -sinA * radiusX;
    const dv_dt = cosA * radiusY;
    const ddx = du_dt * cosInc - dv_dt * sinInc;
    const ddy = du_dt * sinInc + dv_dt * cosInc;

    // Sub-satellite Nadir point on Ocean Surface (radius 1.001)
    const surfaceDir = new THREE.Vector3()
      .copy(anchorNormal)
      .addScaledVector(eastVec, dx)
      .addScaledVector(northVec, dy)
      .normalize();
    const surfacePos = surfaceDir.clone().multiplyScalar(EARTH.radius + 0.001);

    // Satellite Position in Low Earth Orbit (radius 1.25, altitude 0.25)
    const orbitAltitude = 0.25;
    const satPos = surfaceDir.clone().multiplyScalar(EARTH.radius + orbitAltitude);

    // 4. Exact Analytical Flight Direction on the Sphere
    const tangentPlaneVel = new THREE.Vector3()
      .addScaledVector(eastVec, ddx)
      .addScaledVector(northVec, ddy);

    const fwdVelocity = tangentPlaneVel
      .clone()
      .sub(surfaceDir.clone().multiplyScalar(tangentPlaneVel.dot(surfaceDir)))
      .normalize();

    // Right-Handed Body Frame (LVLH Frame: det === +1.0 strictly)
    // +Y (Zenith): Deep Space (+Y dorsal radiators and star trackers)
    // -Y (Nadir): Earth Surface (-Y radar dish and radiometric scanners)
    // +Z (Flight): Nose Forward along orbital velocity
    // +X (Starboard): Right Solar Wing (+Y x +Z = +X)
    const zenithUp = surfaceDir.clone();
    const fwdDir = fwdVelocity.clone();
    const starboardRight = new THREE.Vector3().crossVectors(zenithUp, fwdDir).normalize();
    const trueUp = new THREE.Vector3().crossVectors(fwdDir, starboardRight).normalize();

    // Orthonormal rotation matrix (pure SO(3), zero reflection, zero negative trace)
    const rotMatrix = new THREE.Matrix4().makeBasis(starboardRight, trueUp, fwdDir);

    // Bulletproof finite guard & smooth quaternion slerp
    if (
      Number.isFinite(satPos.x) && Number.isFinite(satPos.y) && Number.isFinite(satPos.z)
    ) {
      satGroupRef.current.position.copy(satPos);

      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
      if (
        Number.isFinite(targetQuat.x) &&
        Number.isFinite(targetQuat.y) &&
        Number.isFinite(targetQuat.z) &&
        Number.isFinite(targetQuat.w)
      ) {
        satGroupRef.current.quaternion.slerp(targetQuat, Math.min(1.0, delta * 14.0));
      }
    }

    // 5. Update Volumetric Microwave Swath Cones (Soft Natural Atmospheric Scan)
    const dist = satPos.distanceTo(surfacePos);
    const midPoint = new THREE.Vector3().addVectors(satPos, surfacePos).multiplyScalar(0.5);
    const beamDir = new THREE.Vector3().subVectors(surfacePos, satPos).normalize();
    const beamQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamDir);

    if (swathConeOuterRef.current) {
      swathConeOuterRef.current.position.copy(midPoint);
      swathConeOuterRef.current.quaternion.copy(beamQuat);
      swathConeOuterRef.current.scale.set(1, dist, 1);
    }
    if (swathConeInnerRef.current) {
      swathConeInnerRef.current.position.copy(midPoint);
      swathConeInnerRef.current.quaternion.copy(beamQuat);
      swathConeInnerRef.current.scale.set(1, dist, 1);
    }

    // 6. Propagating Atmospheric Microwave Wavefronts (Natural Radio Energy Packets)
    const waveRefs = [wavefront0Ref, wavefront1Ref, wavefront2Ref];
    waveRefs.forEach((ref, idx) => {
      if (!ref.current) return;
      const prog = (t * 1.35 + idx * 0.333) % 1;
      const wavePos = new THREE.Vector3().lerpVectors(satPos, surfacePos, prog);
      const waveRadius = 0.003 * (1 - prog) + 0.034 * prog;
      ref.current.position.copy(wavePos);
      ref.current.quaternion.copy(beamQuat);
      ref.current.scale.set(waveRadius, 1, waveRadius);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(prog * Math.PI) * 0.32;
    });

    // 7. Wide-Swath Holographic SAR Fan Beam (Synthetic Aperture Radar)
    const swathHalfWidth = 0.038;
    const pLeft = surfacePos.clone().addScaledVector(starboardRight, swathHalfWidth);
    const pRight = surfacePos.clone().addScaledVector(starboardRight, -swathHalfWidth);

    swathPositions[0] = satPos.x;
    swathPositions[1] = satPos.y;
    swathPositions[2] = satPos.z;

    swathPositions[3] = pLeft.x;
    swathPositions[4] = pLeft.y;
    swathPositions[5] = pLeft.z;

    swathPositions[6] = pRight.x;
    swathPositions[7] = pRight.y;
    swathPositions[8] = pRight.z;

    swathGeo.attributes.position.needsUpdate = true;
    swathGeo.computeBoundingSphere();

    // 8. Ground Track Swath Ribbon (Scan History)
    if (t - lastSampleTime.current > 0.06) {
      lastSampleTime.current = t;
      // Shift older positions
      for (let i = maxTrail - 1; i > 0; i--) {
        trailPositions[i * 3 + 0] = trailPositions[(i - 1) * 3 + 0];
        trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
        trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
      }
      trailPositions[0] = surfacePos.x;
      trailPositions[1] = surfacePos.y;
      trailPositions[2] = surfacePos.z;
      trailCount.current = Math.min(trailCount.current + 1, maxTrail);
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.computeBoundingSphere();
    }

    // 9. Update Natural Ocean Surface Swath Footprint & Echo Ripples
    if (footprintRef.current) {
      footprintRef.current.position.copy(surfacePos);
      const footQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        surfaceDir
      );
      footprintRef.current.quaternion.copy(footQuat);
    }

    if (echoRing1Ref.current && echoRing2Ref.current) {
      const e1 = (t * 1.8) % 1;
      const e2 = (t * 1.8 + 0.5) % 1;
      const s1 = 0.8 + e1 * 2.2;
      const s2 = 0.8 + e2 * 2.2;
      echoRing1Ref.current.scale.set(s1, s1, s1);
      echoRing2Ref.current.scale.set(s2, s2, s2);
      (echoRing1Ref.current.material as THREE.MeshBasicMaterial).opacity =
        Math.pow(1 - e1, 1.6) * 0.45;
      (echoRing2Ref.current.material as THREE.MeshBasicMaterial).opacity =
        Math.pow(1 - e2, 1.6) * 0.45;
    }

    // 10. Blinking Strobe Navigation Beacons on Solar Wingtips
    if (leftBeaconRef.current && rightBeaconRef.current) {
      const blink = Math.sin(t * 8.0) > 0.2 ? 1 : 0.2;
      (leftBeaconRef.current.material as THREE.MeshBasicMaterial).opacity = blink;
      (rightBeaconRef.current.material as THREE.MeshBasicMaterial).opacity = blink;
    }
  });

  return (
    <>
      {/* ── High-Fidelity Sentinel-3 Spacecraft ── */}
      <group ref={satGroupRef} frustumCulled={false}>
        <SentinelCraftModel
          leftBeaconRef={leftBeaconRef}
          rightBeaconRef={rightBeaconRef}
        />
      </group>

      {/* ── Soft Volumetric Microwave Radar Swath Cones (Natural Light Beam) ── */}
      {/* Outer Volumetric Swath Sheath */}
      <mesh ref={swathConeOuterRef} frustumCulled={false}>
        <cylinderGeometry args={[0.034, 0.003, 1, 32, 1, true]} />
        <meshBasicMaterial
          color="#38BDF8"
          transparent
          opacity={isScanningActive ? 0.14 : 0.08}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Inner Volumetric Core Sheath */}
      <mesh ref={swathConeInnerRef} frustumCulled={false}>
        <cylinderGeometry args={[0.016, 0.0015, 1, 24, 1, true]} />
        <meshBasicMaterial
          color="#00E5FF"
          transparent
          opacity={isScanningActive ? 0.10 : 0.05}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Propagating Microwave Wavefronts (Natural Expanding Radio Waves) ── */}
      {[wavefront0Ref, wavefront1Ref, wavefront2Ref].map((wRef, idx) => (
        <mesh key={idx} ref={wRef} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
          <ringGeometry args={[0.85, 1.0, 32]} />
          <meshBasicMaterial
            color="#38BDF8"
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* ── Wide-Swath Holographic SAR Fan Curtain ── */}
      <mesh ref={swathMeshRef} geometry={swathGeo} frustumCulled={false}>
        <meshBasicMaterial
          color="#00E5FF"
          transparent
          opacity={isScanningActive ? 0.12 : 0.06}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Synthetic Aperture Ground Track Swath Ribbon ── */}
      <primitive object={trailLineObj} />

      {/* ── Natural Ocean Surface Swath Footprint & Echo Ripples ── */}
      <group ref={footprintRef} frustumCulled={false}>
        {/* Soft Bathymetric Ambient Illumination Spot on Ocean Water */}
        <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.034, 32]} />
          <meshBasicMaterial
            color="#00E5FF"
            transparent
            opacity={0.16}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Soft Inner Focal Spot */}
        <mesh position={[0, 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.012, 24]} />
          <meshBasicMaterial
            color="#38BDF8"
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Soft Water Microwave Echo Ripples */}
        <mesh ref={echoRing1Ref} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.016, 0.022, 32]} />
          <meshBasicMaterial
            color="#38BDF8"
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={echoRing2Ref} position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.016, 0.022, 32]} />
          <meshBasicMaterial
            color="#2DD4BF"
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  );
}

// ─── Master 3D Planetary Scene ────────────────────────────────────────────────

function MasterPlanetaryScene({
  activeStationId,
  activeConversionStep = 1,
}: {
  activeStationId: string;
  activeConversionStep?: number;
}) {
  const earthGroupRef = useRef<THREE.Group>(null!);
  const currentRotY = useRef(-2.75);
  const activeStation =
    SOUNDING_STATIONS.find((s) => s.id === activeStationId) || SOUNDING_STATIONS[0];

  // Dynamically centers the selected ocean basin directly towards the camera
  const targetRotY = useMemo(() => {
    if (activeStation.id.includes('BB')) return -3.12; // Bay of Bengal
    if (activeStation.id.includes('EQ')) return -2.92; // Equatorial
    return -2.75; // Arabian Sea (Default initial orientation)
  }, [activeStation.id]);

  useFrame((state, delta) => {
    if (!earthGroupRef.current) return;
    const t = state.clock.getElapsedTime();
    const swayY = Math.sin(t * 0.08) * 0.015;
    const swayX = Math.sin(t * 0.06) * 0.008;

    // Smooth planetary easing towards selected basin
    currentRotY.current = THREE.MathUtils.damp(currentRotY.current, targetRotY, 3.5, delta);

    earthGroupRef.current.rotation.y = currentRotY.current + swayY;
    earthGroupRef.current.rotation.x = 0.22 + swayX;
  });

  return (
    <>
      {/* ── Rotating Earth Globe with Subsurface Sounding Pillars & In-Orbit Satellite ── */}
      <group ref={earthGroupRef} rotation={[0.22, -2.75, 0]}>
        <EarthSurface />
        <AtmosphereLimb />
        <OceanographicGrid />

        {/* Subsurface Sounding Pillars (0m to 2000m) */}
        {SOUNDING_STATIONS.slice(0, 3).map((station) => (
          <SubsurfaceSoundingPillar
            key={station.id}
            station={station}
            isActive={station.id === activeStation.id}
            isConversionActive={station.id === activeStation.id && activeConversionStep === 3}
          />
        ))}

        {/* ARGO Autonomous Profiling Floats Fleet */}
        {ARGO_FLOATS.slice(0, 3).map((float) => (
          <ArgoFloatBeacon key={float.id} float={float} />
        ))}

        {/* ── Precision Sentinel-3 Observation Satellite & Dynamic Radar Altimeter Swath ── */}
        <PrecisionSentinelSatellite
          activeStation={activeStation}
          isScanningActive={activeConversionStep === 1}
        />
      </group>
    </>
  );
}

// ─── Physically Grounded Lighting Rig ─────────────────────────────────────────

function PlanetaryLighting() {
  return (
    <>
      <ambientLight intensity={0.82} color="#e0f2fe" />
      <directionalLight position={[4.5, 3.2, 3.5]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-4.0, 1.2, -2.0]} intensity={0.65} color="#0284c7" />
      <directionalLight position={[0, -4.0, 1.0]} intensity={0.28} color="#0b2a3f" />
    </>
  );
}

// ─── Exported Component ───────────────────────────────────────────────────────

interface HeroGlobeProps {
  className?: string;
  activeStationId?: string;
  activeConversionStep?: number;
}

export default function HeroGlobe({
  className = '',
  activeStationId = 'STN-AS01',
  activeConversionStep = 1,
}: HeroGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const target =
      containerRef.current.closest('section') ||
      document.getElementById('hero-section') ||
      containerRef.current.parentElement;

    if (!target) return;

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative select-none ${className}`}
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
      }}
    >
      <Canvas
        frameloop={isVisible ? 'always' : 'never'}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        camera={{
          fov: 38,
          near: 0.1,
          far: 100,
          position: [0, 0, 3.12],
        }}
        style={{
          background: 'transparent',
        }}
      >
        <PlanetaryLighting />
        <MasterPlanetaryScene
          activeStationId={activeStationId}
          activeConversionStep={activeConversionStep}
        />
        {/* OrbitControls allows users to smoothly rotate the globe */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.5}
          dampingFactor={0.05}
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.75}
        />
      </Canvas>
    </div>
  );
}
