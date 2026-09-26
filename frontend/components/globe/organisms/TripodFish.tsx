'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DEPTH_SCALE = 0.1;

/**
 * Procedural 3D Abyssal Tripod Fish (Bathypterois grallator)
 * Perched majestically upon the soft abyssal seabed on three elongated fin rays:
 * two stiff pelvic stilts and a long lower caudal tail ray.
 * Pectoral fins held high above the head like sensory antennae.
 */
function createTripodFishGeometry(): THREE.BufferGeometry {
  // ── 1. Slender Fish Body ──
  const bodyGeo = new THREE.SphereGeometry(1.2, 32, 24);
  const bPos = bodyGeo.attributes.position;
  for (let i = 0; i < bPos.count; i++) {
    const x = bPos.getX(i);
    let y = bPos.getY(i);
    let z = bPos.getZ(i);

    z *= 0.28;
    y *= 0.38;

    if (x > 0) {
      // Blunt duck-billed snout
      const taper = 1.0 - (x / 1.2) * 0.45;
      y *= taper;
      z *= taper;
    } else {
      // Slender tail peduncle
      const taper = 1.0 + (x / 1.2) * 0.75;
      y = y * Math.max(0.18, taper);
      z = z * Math.max(0.16, taper);
    }
    bPos.setXYZ(i, x, y, z);
  }
  bodyGeo.computeVertexNormals();

  // ── 2. Pelagic Stilt Ray #1 (Left Pelvic Stilt) ──
  const leftStiltGeo = new THREE.CylinderGeometry(0.025, 0.015, 3.2, 16);
  leftStiltGeo.rotateZ(0.28);
  leftStiltGeo.rotateX(-0.25);
  leftStiltGeo.translate(0.15, -1.6, 0.45);

  // ── 3. Pelagic Stilt Ray #2 (Right Pelvic Stilt) ──
  const rightStiltGeo = new THREE.CylinderGeometry(0.025, 0.015, 3.2, 16);
  rightStiltGeo.rotateZ(0.28);
  rightStiltGeo.rotateX(0.25);
  rightStiltGeo.translate(0.15, -1.6, -0.45);

  // ── 4. Caudal Tail Stilt #3 (Lower lobe extension stilt) ──
  const caudalStiltGeo = new THREE.CylinderGeometry(0.025, 0.015, 3.1, 16);
  caudalStiltGeo.rotateZ(-0.35);
  caudalStiltGeo.translate(-1.6, -1.45, 0);

  // ── 5. Antenna-Like Tactile Pectoral Rays (Pointing upwards & forward) ──
  const leftAntenna = new THREE.CylinderGeometry(0.018, 0.008, 1.8, 8);
  leftAntenna.rotateZ(-0.55);
  leftAntenna.rotateX(-0.22);
  leftAntenna.translate(0.55, 0.95, 0.22);

  const rightAntenna = new THREE.CylinderGeometry(0.018, 0.008, 1.8, 8);
  rightAntenna.rotateZ(-0.55);
  rightAntenna.rotateX(0.22);
  rightAntenna.translate(0.55, 0.95, -0.22);

  const parts = [bodyGeo, leftStiltGeo, rightStiltGeo, caudalStiltGeo, leftAntenna, rightAntenna];
  const nonIndexedParts = parts.map((p) => {
    delete (p.attributes as Record<string, unknown>).uv;
    return p.toNonIndexed();
  });

  const merged = BufferGeometryUtils.mergeGeometries(nonIndexedParts, false);


  // ── 6. Pale Abyssal Ghost Pigment ──
  const pos = merged.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < -1.0) {
      // Stilt tips touching mud
      color.set('#64748b');
    } else if (y > 0.8) {
      // Tactile sensory tips
      color.set('#a855f7');
    } else {
      // Pale pearl silver body
      color.set('#cbd5e1').lerp(new THREE.Color('#94a3b8'), 0.4);
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

export function TripodFish({ currentDepth }: { currentDepth: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  // Visible at deepest abyssal target (> 850m)
  const isVisible = currentDepth >= 850;

  const geometry = useMemo(() => createTripodFishGeometry(), []);

  useFrame((state) => {
    if (!groupRef.current || !isVisible) return;
    const t = state.clock.getElapsedTime();

    // Perched stationary facing the current, swaying gently like a sea lily
    groupRef.current.position.set(-2.2, -(980 * DEPTH_SCALE), 2.0);
    groupRef.current.rotation.y = Math.PI * 0.35 + Math.sin(t * 0.4) * 0.04;
    groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.02; // Sway
  });

  if (!isVisible) return null;

  return (
    <group ref={groupRef} scale={1.1}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={0.4}
          metalness={0.2}
          emissive="#a855f7"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}
