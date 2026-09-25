'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DEPTH_SCALE = 0.1;

interface LurkerDef {
  ref: React.MutableRefObject<THREE.Group>;
  lightRef: React.MutableRefObject<THREE.PointLight>;
  baseX: number;
  baseZ: number;
  depthM: number;
  scale: number;
  driftSpeed: number;
  driftRangeX: number;
  driftRangeZ: number;
  rotY: number;
  pulseSpeed: number;
}

export function AbyssalAnglerfish({ currentDepth }: { currentDepth: number }) {
  const angler1Ref = useRef<THREE.Group>(null!);
  const angler2Ref = useRef<THREE.Group>(null!);
  const angler3Ref = useRef<THREE.Group>(null!);
  const angler4Ref = useRef<THREE.Group>(null!);

  const light1Ref = useRef<THREE.PointLight>(null!);
  const light2Ref = useRef<THREE.PointLight>(null!);
  const light3Ref = useRef<THREE.PointLight>(null!);
  const light4Ref = useRef<THREE.PointLight>(null!);

  // Visible across the bathypelagic midnight zone (starts becoming visible > 480m)
  const isVisible = currentDepth >= 450;

  useFrame((state) => {
    if (!angler1Ref.current || !isVisible) return;
    const time = state.clock.getElapsedTime();

    // 1. Primary Anglerfish: positioned at ~705m (directly in view at 700m camera target)
    const x1 = 3.2 + Math.sin(time * 0.22) * 0.8;
    const z1 = 1.8 + Math.cos(time * 0.18) * 0.6;
    const y1 = -(705 * DEPTH_SCALE) + Math.sin(time * 0.35) * 0.35;
    angler1Ref.current.position.set(x1, y1, z1);
    angler1Ref.current.rotation.y = Math.PI * 0.84 + Math.sin(time * 0.2) * 0.08;
    angler1Ref.current.rotation.z = Math.sin(time * 0.3) * 0.04;
    if (light1Ref.current) {
      const pulse1 = 1.0 + Math.sin(time * 3.2) * 0.35 + (Math.sin(time * 6.5) > 0.85 ? 0.4 : 0);
      light1Ref.current.intensity = pulse1 * 2.8;
    }

    // 2. Secondary Scattered Anglerfish: upper-left at ~675m
    if (angler2Ref.current) {
      const x2 = -3.2 + Math.cos(time * 0.19) * 0.7;
      const z2 = 2.6 + Math.sin(time * 0.15) * 0.5;
      const y2 = -(675 * DEPTH_SCALE) + Math.sin(time * 0.28 + 1.2) * 0.3;
      angler2Ref.current.position.set(x2, y2, z2);
      angler2Ref.current.rotation.y = -Math.PI * 0.3 + Math.cos(time * 0.18) * 0.08;
      if (light2Ref.current) {
        light2Ref.current.intensity = (0.9 + Math.sin(time * 2.7 + 1.5) * 0.3) * 2.2;
      }
    }

    // 3. Third Scattered Anglerfish: deep background at ~735m
    if (angler3Ref.current) {
      const x3 = 1.8 + Math.sin(time * 0.16 + 2.0) * 0.9;
      const z3 = -3.2 + Math.cos(time * 0.22 + 1.0) * 0.7;
      const y3 = -(735 * DEPTH_SCALE) + Math.sin(time * 0.3 + 2.5) * 0.4;
      angler3Ref.current.position.set(x3, y3, z3);
      angler3Ref.current.rotation.y = Math.PI * 0.35 + Math.sin(time * 0.17) * 0.07;
      if (light3Ref.current) {
        light3Ref.current.intensity = (0.8 + Math.sin(time * 3.6 + 3.0) * 0.25) * 2.0;
      }
    }

    // 4. Fourth Scattered Anglerfish: deep left background at ~765m
    if (angler4Ref.current) {
      const x4 = -4.5 + Math.cos(time * 0.14) * 0.8;
      const z4 = -1.8 + Math.sin(time * 0.2) * 0.6;
      const y4 = -(765 * DEPTH_SCALE) + Math.sin(time * 0.25 + 0.8) * 0.35;
      angler4Ref.current.position.set(x4, y4, z4);
      angler4Ref.current.rotation.y = -Math.PI * 0.6 + Math.cos(time * 0.15) * 0.06;
      if (light4Ref.current) {
        light4Ref.current.intensity = (0.7 + Math.sin(time * 2.2 + 0.5) * 0.25) * 1.8;
      }
    }
  });

  if (!isVisible) return null;

  return (
    <>
      {/* ── 1. Primary Anglerfish (Directly in view at 700m - Refined Delicate Size) ── */}
      <group ref={angler1Ref} scale={[0.28, 0.28, 0.28]}>
        {/* Main Body */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.9, 20, 16]} />
          <meshStandardMaterial color="#020617" roughness={0.9} metalness={0.15} />
        </mesh>

        {/* Lower Jaw */}
        <mesh position={[0.45, -0.28, 0]} rotation={[0, 0, -0.22]}>
          <coneGeometry args={[0.72, 0.95, 16]} />
          <meshStandardMaterial color="#050b14" roughness={0.85} metalness={0.2} />
        </mesh>

        {/* Needle Teeth */}
        {[-0.3, -0.15, 0.0, 0.15, 0.3].map((xOffset, i) => (
          <mesh key={i} position={[0.78 + xOffset * 0.22, -0.08, (i % 2 === 0 ? 0.28 : -0.28)]} rotation={[0, 0, Math.PI / 4]}>
            <coneGeometry args={[0.035, 0.32, 5]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.2} metalness={0.6} transparent opacity={0.9} />
          </mesh>
        ))}

        {/* Illicium Fishing Rod */}
        <mesh position={[0.48, 0.92, 0]} rotation={[0, 0, -0.42]}>
          <cylinderGeometry args={[0.03, 0.03, 1.25, 8]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>

        {/* Bioluminescent Esca Lure */}
        <group position={[1.05, 1.38, 0]}>
          <mesh>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshBasicMaterial color="#00ffff" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.28, 16, 16]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} depthWrite={false} />
          </mesh>
          <pointLight ref={light1Ref} color="#00ffff" intensity={2.8} distance={14.0} decay={1.8} />
        </group>

        {/* Caudal Fin */}
        <mesh position={[-0.95, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.4, 0.65, 4]} />
          <meshStandardMaterial color="#090d16" roughness={0.9} transparent opacity={0.8} />
        </mesh>
      </group>

      {/* ── 2. Secondary Scattered Anglerfish (~675m, Left Midground) ── */}
      <group ref={angler2Ref} scale={[0.22, 0.22, 0.22]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.9, 16, 12]} />
          <meshStandardMaterial color="#020617" roughness={0.9} />
        </mesh>
        <mesh position={[0.45, -0.28, 0]} rotation={[0, 0, -0.22]}>
          <coneGeometry args={[0.7, 0.9, 12]} />
          <meshStandardMaterial color="#050b14" />
        </mesh>
        <mesh position={[0.48, 0.92, 0]} rotation={[0, 0, -0.42]}>
          <cylinderGeometry args={[0.025, 0.025, 1.1, 6]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <group position={[1.0, 1.3, 0]}>
          <mesh>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshBasicMaterial color="#00f2fe" />
          </mesh>
          <pointLight ref={light2Ref} color="#00f2fe" intensity={2.2} distance={12.0} decay={1.9} />
        </group>
        <mesh position={[-0.95, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.38, 0.6, 4]} />
          <meshStandardMaterial color="#090d16" roughness={0.9} />
        </mesh>
      </group>

      {/* ── 3. Third Scattered Anglerfish (~735m, Deep Void Lurker) ── */}
      <group ref={angler3Ref} scale={[0.24, 0.24, 0.24]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.9, 16, 12]} />
          <meshStandardMaterial color="#020617" roughness={0.9} />
        </mesh>
        <mesh position={[0.45, -0.28, 0]} rotation={[0, 0, -0.22]}>
          <coneGeometry args={[0.7, 0.9, 12]} />
          <meshStandardMaterial color="#050b14" />
        </mesh>
        <mesh position={[0.48, 0.92, 0]} rotation={[0, 0, -0.42]}>
          <cylinderGeometry args={[0.025, 0.025, 1.1, 6]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <group position={[1.0, 1.3, 0]}>
          <mesh>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <pointLight ref={light3Ref} color="#38bdf8" intensity={2.0} distance={12.0} decay={2.0} />
        </group>
        <mesh position={[-0.95, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.38, 0.6, 4]} />
          <meshStandardMaterial color="#090d16" roughness={0.9} />
        </mesh>
      </group>

      {/* ── 4. Fourth Scattered Anglerfish (~765m, Distant Background Prowler) ── */}
      <group ref={angler4Ref} scale={[0.18, 0.18, 0.18]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.9, 14, 10]} />
          <meshStandardMaterial color="#020617" roughness={0.95} />
        </mesh>
        <mesh position={[0.45, -0.28, 0]} rotation={[0, 0, -0.22]}>
          <coneGeometry args={[0.68, 0.85, 10]} />
          <meshStandardMaterial color="#050b14" />
        </mesh>
        <mesh position={[0.48, 0.92, 0]} rotation={[0, 0, -0.42]}>
          <cylinderGeometry args={[0.025, 0.025, 1.0, 6]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <group position={[1.0, 1.25, 0]}>
          <mesh>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshBasicMaterial color="#00ffff" />
          </mesh>
          <pointLight ref={light4Ref} color="#00ffff" intensity={1.8} distance={10.0} decay={2.0} />
        </group>
      </group>
    </>
  );
}
