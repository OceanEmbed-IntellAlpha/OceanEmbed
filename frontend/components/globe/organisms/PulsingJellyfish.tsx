'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const JELLY_COUNT = 9;
const DEPTH_SCALE = 0.1;

// Scattered depths across the mixed layer and thermocline (45m to 210m)
const JELLY_DEPTHS = [48, 62, 75, 88, 102, 125, 148, 178, 208];

export function PulsingJellyfish({ currentDepth }: { currentDepth: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  // Visible across the photic & thermocline layers (0m to 350m)
  const isVisible = currentDepth <= 360;

  // Organic, scattered spatial distribution (delicate size & natural distance)
  const jellies = useMemo(() => {
    const scatteredOffsets = [
      { x: 4.2, z: 3.8 },   // Midground right
      { x: 1.8, z: 2.8 },   // Midground center-left
      { x: 5.8, z: 1.5 },   // Mid-right
      { x: -1.8, z: 2.5 },  // Mid-left
      { x: 3.2, z: -1.8 },  // Tether flank
      { x: 6.2, z: 3.2 },   // Right flank
      { x: 0.5, z: -3.2 },  // Background deep
      { x: 3.8, z: 0.8 },   // Central
      { x: -3.0, z: -1.0 }, // Far left
    ];

    return Array.from({ length: JELLY_COUNT }, (_, i) => {
      const pos = scatteredOffsets[i % scatteredOffsets.length];
      return {
        baseX: pos.x,
        baseZ: pos.z,
        depthM: JELLY_DEPTHS[i],
        phase: i * 1.35,
        pulseSpeed: 1.3 + (i % 3) * 0.22,
        // Decreased, delicate, realistic small scale (reduced by ~55%)
        size: 0.35 + (i % 3) * 0.08,
      };
    });
  }, []);

  useFrame((state) => {
    if (!groupRef.current || !isVisible) return;
    const time = state.clock.getElapsedTime();

    groupRef.current.children.forEach((child, i) => {
      const data = jellies[i];
      if (!data) return;

      // Pulsing contraction and expansion
      const pulseCycle = (time * data.pulseSpeed + data.phase) % (Math.PI * 2);
      const contraction = Math.sin(pulseCycle);

      // Bell scale deformation (subtle squash & stretch)
      const scaleY = 1.0 + contraction * 0.22;
      const scaleXZ = 1.0 - contraction * 0.14;

      const bell = child.getObjectByName('bell');
      if (bell) {
        bell.scale.set(scaleXZ, scaleY, scaleXZ);
      }

      // Buoyant pulse thrust
      const upwardThrust = Math.max(0, contraction) * 0.08;
      const currentY = -(data.depthM * DEPTH_SCALE) + upwardThrust + Math.sin(time * 0.45 + i) * 0.18;
      const currentX = data.baseX + Math.sin(time * 0.18 + i * 0.7) * 0.35;
      const currentZ = data.baseZ + Math.cos(time * 0.14 + i * 0.7) * 0.35;

      child.position.set(currentX, currentY, currentZ);

      // Trailing tentacles undulating wave
      const tentacles = child.getObjectByName('tentacles');
      if (tentacles) {
        tentacles.children.forEach((tentacle, tIdx) => {
          const swayZ = Math.sin(time * 2.2 + tIdx * 0.5 + data.phase) * 0.12;
          const swayX = Math.cos(time * 1.8 + tIdx * 0.5 + data.phase) * 0.1;
          tentacle.rotation.z = swayZ;
          tentacle.rotation.x = swayX;
        });
      }
    });
  });

  if (!isVisible) return null;

  return (
    <group ref={groupRef} renderOrder={20}>
      {jellies.map((jelly, i) => (
        <group
          key={i}
          position={[jelly.baseX, -(jelly.depthM * DEPTH_SCALE), jelly.baseZ]}
          scale={[jelly.size, jelly.size, jelly.size]}
        >
          {/* ── 1. Delicate Translucent Umbrella Bell ── */}
          <mesh name="bell">
            <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#06b6d4"
              emissiveIntensity={1.2}
              roughness={0.25}
              metalness={0.1}
              transparent
              opacity={0.68}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* ── 2. Delicate Inner Gonad Organs (Aurelia 4-Leaf Pattern) ── */}
          <group position={[0, -0.1, 0]}>
            {[0, 1, 2, 3].map((petalIdx) => {
              const pAngle = (petalIdx / 4) * Math.PI * 2;
              const px = Math.cos(pAngle) * 0.22;
              const pz = Math.sin(pAngle) * 0.22;
              return (
                <mesh key={petalIdx} position={[px, 0, pz]}>
                  <sphereGeometry args={[0.09, 8, 8]} />
                  <meshBasicMaterial
                    color="#f472b6"
                    transparent
                    opacity={0.8}
                  />
                </mesh>
              );
            })}
            <mesh position={[0, 0.02, 0]}>
              <sphereGeometry args={[0.11, 10, 10]} />
              <meshBasicMaterial color="#a5f3fc" transparent opacity={0.85} />
            </mesh>
          </group>

          {/* ── 3. Central Fluted Oral Arms ── */}
          <group position={[0, -0.18, 0]}>
            {[0, 1, 2, 3].map((armIdx) => {
              const aAngle = (armIdx / 4) * Math.PI * 2 + 0.4;
              const ax = Math.cos(aAngle) * 0.12;
              const az = Math.sin(aAngle) * 0.12;
              return (
                <mesh key={armIdx} position={[ax, -0.5, az]}>
                  <cylinderGeometry args={[0.035, 0.01, 1.0, 5]} />
                  <meshStandardMaterial
                    color="#e0f2fe"
                    emissive="#38bdf8"
                    emissiveIntensity={1.1}
                    transparent
                    opacity={0.6}
                    depthWrite={false}
                  />
                </mesh>
              );
            })}
          </group>

          {/* ── 4. Trailing Marginal Rim Tentacles ── */}
          <group name="tentacles" position={[0, -0.12, 0]}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((tIdx) => {
              const tAngle = (tIdx / 8) * Math.PI * 2;
              const tx = Math.cos(tAngle) * 0.58;
              const tz = Math.sin(tAngle) * 0.58;
              return (
                <mesh key={tIdx} position={[tx, -0.7, tz]}>
                  <cylinderGeometry args={[0.008, 0.003, 1.4, 4]} />
                  <meshBasicMaterial
                    color="#67e8f9"
                    transparent
                    opacity={0.55}
                    depthWrite={false}
                  />
                </mesh>
              );
            })}
          </group>
        </group>
      ))}
    </group>
  );
}
