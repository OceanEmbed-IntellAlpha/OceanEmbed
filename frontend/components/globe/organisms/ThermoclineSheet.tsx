'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

const DEPTH_SCALE = 0.1;
const PYCNOCLINE_PARTICLE_COUNT = 90;

interface ThermoclineSheetProps {
  depths: readonly number[];
  temperatures: readonly number[];
}

export function ThermoclineSheet({ depths, temperatures }: ThermoclineSheetProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const particlesRef = useRef<THREE.Points>(null!);
  const ringGroupRef = useRef<THREE.Group>(null!);

  // Find 20°C Isotherm depth (Z20) via linear interpolation
  const z20Depth = useMemo(() => {
    if (!depths || !temperatures || depths.length < 2) return 115;
    for (let i = 0; i < temperatures.length - 1; i++) {
      const t1 = temperatures[i];
      const t2 = temperatures[i + 1];
      if ((t1 >= 20 && t2 <= 20) || (t1 <= 20 && t2 >= 20)) {
        const factor = (20 - t1) / (t2 - t1);
        return depths[i] + factor * (depths[i + 1] - depths[i]);
      }
    }
    return 115;
  }, [depths, temperatures]);

  const yPos = -(z20Depth * DEPTH_SCALE);

  // Scattered Pycnocline Particulates: organic matter and marine aggregates trapped at density jump
  const particlesData = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PYCNOCLINE_PARTICLE_COUNT * 3);
    const colors = new Float32Array(PYCNOCLINE_PARTICLE_COUNT * 3);
    const colorAmber = new THREE.Color('#f59e0b');
    const colorCyan = new THREE.Color('#38bdf8');
    const tempColor = new THREE.Color();

    for (let i = 0; i < PYCNOCLINE_PARTICLE_COUNT; i++) {
      // Scattered organically around the central zone
      const rad = 2.0 + Math.random() * 14.0;
      const angle = Math.random() * Math.PI * 2;
      const px = Math.cos(angle) * rad;
      const pz = Math.sin(angle) * rad;
      // Staggered slightly above and below the isotherm (within ±1.2 units / ~12m)
      const py = (Math.random() - 0.5) * 2.2;

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;

      // Color gradient between warm thermocline amber and upper teal
      const mixRatio = 0.3 + Math.random() * 0.7;
      tempColor.copy(colorAmber).lerp(colorCyan, mixRatio * 0.4);
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Gentle internal density wave undulation
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(t * 0.7) * 0.18;
    }
    if (ringGroupRef.current) {
      ringGroupRef.current.rotation.z = t * 0.03;
      ringGroupRef.current.position.y = Math.sin(t * 0.7 + 0.5) * 0.15;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.02;
    }
  });

  return (
    <group position={[0, yPos, 0]}>
      {/* ── Refined Translucent Isotherm Sheet (Reduced size, delicate opacity) ── */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[22, 48]} />
        <meshStandardMaterial
          color="#d97706"
          emissive="#b45309"
          emissiveIntensity={0.25}
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Stratified Internal Wave Contour Rings ── */}
      <group ref={ringGroupRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[12, 12.18, 48]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
          <ringGeometry args={[18, 18.22, 48]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* ── Scattered Pycnocline Particulate Aggregates ── */}
      <points ref={particlesRef} geometry={particlesData}>
        <pointsMaterial
          size={0.18}
          vertexColors
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* ── Scientific 3D Billboard Label in Camera Sightline ── */}
      <Billboard position={[-2.5, 0.4, 2.8]}>
        <Text
          color="#fbbf24"
          fontSize={0.52}
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
          outlineWidth={0.05}
          outlineColor="#020617"
          material-depthTest={false}
        >
          {`Z20 THERMOCLINE BOUNDARY (20°C) • ${z20Depth.toFixed(0)}m`}
        </Text>
      </Billboard>
    </group>
  );
}
