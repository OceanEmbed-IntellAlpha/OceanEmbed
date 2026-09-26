'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DEPTH_SCALE = 0.1;

/**
 * Procedural 3D Pelican Gulper Eel (Eurypharynx pelecanoides)
 * Enormous elastic pouch jaw, tiny eyes, extremely elongated whip-like body,
 * and a glowing bioluminescent caudal organ at the tail tip.
 */
function createGulperHeadGeometry(): THREE.BufferGeometry {
  // ── 1. Upper Skull (Small & narrow) ──
  const craniumGeo = new THREE.SphereGeometry(0.38, 14, 10).toNonIndexed();
  const cPos = craniumGeo.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    const x = cPos.getX(i);
    let y = cPos.getY(i);
    let z = cPos.getZ(i);
    z *= 0.45;
    y *= 0.55;
    if (x > 0) y += 0.05 * (x / 0.38);
    cPos.setXYZ(i, x, y + 0.15, z);
  }

  // ── 2. Massive Pelican Pouch Lower Jaw (Cavernous throat) ──
  const jawGeo = new THREE.SphereGeometry(1.2, 18, 12).toNonIndexed();
  const jPos = jawGeo.attributes.position;
  for (let i = 0; i < jPos.count; i++) {
    const x = jPos.getX(i);
    let y = jPos.getY(i);
    let z = jPos.getZ(i);

    // Deep hanging bag/pouch
    z *= 0.42;
    if (y > 0) y *= 0.1; // Open upper cavity
    else y *= 0.85;      // Deep elastic sack

    if (x < 0) {
      const taper = 1.0 + (x / 1.2) * 0.7;
      z *= taper;
      y *= taper;
    }
    jPos.setXYZ(i, x - 0.25, y - 0.35, z);
  }

  // ── 3. Tiny Eyes (At the very tip of the upper snout) ──
  const eyeLeft = new THREE.SphereGeometry(0.04, 6, 6).toNonIndexed();
  eyeLeft.translate(0.32, 0.22, 0.12);
  const eyeRight = new THREE.SphereGeometry(0.04, 6, 6).toNonIndexed();
  eyeRight.translate(0.32, 0.22, -0.12);

  const parts = [craniumGeo, jawGeo, eyeLeft, eyeRight];
  parts.forEach((p) => {
    delete (p.attributes as Record<string, unknown>).uv;
  });

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();

  // ── 4. Pitch Abyssal Black Pigment ──
  const pos = merged.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color('#0b0f19'); // Midnight velvet black
  for (let i = 0; i < pos.count; i++) {
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

export function GulperEel({ currentDepth }: { currentDepth: number }) {
  const eelRef = useRef<THREE.Group>(null!);
  const tailLightRef = useRef<THREE.PointLight>(null!);
  const bodyMeshRef = useRef<THREE.Mesh>(null!);

  // Visible in the deep bathypelagic midnight zone (> 650m)
  const isVisible = currentDepth >= 600;

  const headGeo = useMemo(() => createGulperHeadGeometry(), []);

  // Backbone control points for long whip tail
  const spinePoints = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => new THREE.Vector3(-i * 0.65 - 0.8, 0, 0));
  }, []);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(spinePoints), [spinePoints]);

  const bodyGeo = useMemo(() => {
    return new THREE.TubeGeometry(curve, 45, 0.12, 8, false);
  }, [curve]);

  useFrame((state) => {
    if (!eelRef.current || !isVisible) return;
    const t = state.clock.getElapsedTime();

    // ── Sinusoidal Swimming Undulation ──
    const x = 3.8 + Math.sin(t * 0.18) * 2.0;
    const z = -2.5 + Math.cos(t * 0.14) * 1.8;
    const y = -(890 * DEPTH_SCALE) + Math.sin(t * 0.3) * 0.8;

    eelRef.current.position.set(x, y, z);
    eelRef.current.rotation.y = Math.PI * 0.65 + Math.sin(t * 0.25) * 0.15;
    eelRef.current.rotation.z = Math.sin(t * 0.35) * 0.08;

    // Pulse caudal lure light (pink/crimson bioluminescent organ at tail tip!)
    if (tailLightRef.current) {
      const pulse = 1.0 + Math.sin(t * 5.0) * 0.5 + (Math.sin(t * 11.0) > 0.8 ? 0.6 : 0);
      tailLightRef.current.intensity = pulse * 2.2;
    }
  });

  if (!isVisible) return null;

  return (
    <group ref={eelRef} scale={1.2}>
      {/* Cavernous Pelican Jaw & Head */}
      <mesh geometry={headGeo}>
        <meshStandardMaterial
          vertexColors
          roughness={0.8}
          metalness={0.1}
          color="#0b0f19"
        />
      </mesh>

      {/* Slender Whip-like Eel Body */}
      <mesh ref={bodyMeshRef} geometry={bodyGeo}>
        <meshStandardMaterial
          color="#070a12"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Glowing Caudal Lure Organ at the Tail Tip */}
      <group position={[-9.5, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshBasicMaterial color="#f43f5e" />
        </mesh>
        <pointLight
          ref={tailLightRef}
          color="#f43f5e"
          distance={15}
          decay={2.0}
          intensity={2.2}
        />
      </group>
    </group>
  );
}
