'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ContactShadows } from '@react-three/drei';

/**
 * High-End CAD Engineering Studio Environment matching the Ocean Twin theme:
 * - Deep abyss background (#020b14)
 * - Concentric CAD telemetry datum rings (#4CE0D2 biolume / #1C5C6B thermocline)
 * - Precision radial crosshairs and degree tick marks on floor pedestal
 * - Crisp studio lighting: key light, soft fill light, and bioluminescent rim light
 * - Zero ocean fog/water, providing crystal-clear CAD inspection of all glider parts
 */
export function GliderStudioEnvironment() {
  // Concentric floor datum geometry
  const ringInner = useMemo(() => new THREE.RingGeometry(1.35, 1.365, 80), []);
  const ringMid = useMemo(() => new THREE.RingGeometry(2.1, 2.115, 80), []);
  const ringOuter = useMemo(() => new THREE.RingGeometry(2.95, 2.965, 80), []);

  // Degree tick marks on pedestal (every 30 degrees)
  const tickGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12;
      const r1 = 2.115;
      const r2 = i % 2 === 0 ? 2.22 : 2.17;
      points.push(new THREE.Vector3(Math.cos(angle) * r1, 0, Math.sin(angle) * r1));
      points.push(new THREE.Vector3(Math.cos(angle) * r2, 0, Math.sin(angle) * r2));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return geom;
  }, []);

  return (
    <group position={[0, -0.65, 0]}>
      {/* ── STUDIO LIGHTING RIG ────────────────────────────────────── */}
      {/* Ambient base fill for dark chassis recesses */}
      <ambientLight intensity={1.1} color="#0d2238" />

      {/* Main Studio Key Light */}
      <directionalLight position={[6, 8, 5]} intensity={2.4} color="#ffffff" castShadow />

      {/* Cool Bioluminescent Rim Light (Emphasizes hull silhouette) */}
      <directionalLight position={[-6, 4, -4]} intensity={2.0} color="#4CE0D2" />

      {/* Warm Fill Light (Brings out yellow composite hull and gold transducers) */}
      <directionalLight position={[0, -2, 4]} intensity={0.8} color="#f59e0b" />

      {/* Top Overhead Light */}
      <directionalLight position={[0, 7, 0]} intensity={1.2} color="#bae6fd" />

      {/* Aft Backlight for Propeller Assembly */}
      <directionalLight position={[-5, 1, 0]} intensity={1.4} color="#38bdf8" />

      {/* ── CAD PEDESTAL & DATUM RINGS ─────────────────────────────── */}
      {/* Inner biolume cyan ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={ringInner}>
        <meshBasicMaterial
          color="#4CE0D2"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Mid thermocline ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={ringMid}>
        <meshBasicMaterial
          color="#1C5C6B"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer halo ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={ringOuter}>
        <meshBasicMaterial
          color="#0284c7"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Radial degree tick marks */}
      <lineSegments geometry={tickGeometry}>
        <lineBasicMaterial color="#1C5C6B" transparent opacity={0.45} />
      </lineSegments>

      {/* Primary CAD Axis Crosshairs */}
      <line>
        <bufferGeometry
          attach="geometry"
          {...new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-3.4, 0, 0),
            new THREE.Vector3(3.4, 0, 0),
          ])}
        />
        <lineBasicMaterial attach="material" color="#1C5C6B" transparent opacity={0.35} />
      </line>
      <line>
        <bufferGeometry
          attach="geometry"
          {...new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -3.4),
            new THREE.Vector3(0, 0, 3.4),
          ])}
        />
        <lineBasicMaterial attach="material" color="#1C5C6B" transparent opacity={0.35} />
      </line>

      {/* Soft Contact Shadow on Studio Pedestal */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.75}
        scale={7.0}
        blur={2.4}
        far={3}
        color="#01070e"
      />
    </group>
  );
}
