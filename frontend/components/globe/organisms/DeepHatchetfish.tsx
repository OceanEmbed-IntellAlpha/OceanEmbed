'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const HATCHET_COUNT = 10;
const DEPTH_SCALE = 0.1;

/**
 * Procedural 3D Deep-Sea Hatchetfish (Argyropelecus hemigymnus)
 * Laterally ultra-compressed silver blade body, tubular upward-pointing eyes,
 * and bright ventral photophore rows casting cyan counter-illumination downwards.
 */
function createHatchetfishGeometry(): THREE.BufferGeometry {
  // ── 1. Hatchet-Blade Body Profile ──
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(0.5, 0.1);       // Snout top
  bodyShape.lineTo(0.3, 0.45);      // Forehead
  bodyShape.lineTo(-0.25, 0.52);    // Dorsal crest
  bodyShape.lineTo(-0.55, 0.12);    // Tail peduncle top
  bodyShape.lineTo(-0.95, 0.22);    // Caudal upper tip
  bodyShape.lineTo(-0.85, 0);       // Fork notch
  bodyShape.lineTo(-0.95, -0.22);   // Caudal lower tip
  bodyShape.lineTo(-0.55, -0.08);   // Tail peduncle bottom
  bodyShape.lineTo(-0.2, -0.65);    // Deep sternal keel (hatchet chest!)
  bodyShape.lineTo(0.25, -0.55);    // Ventral throat
  bodyShape.lineTo(0.5, -0.15);     // Lower jaw
  bodyShape.closePath();

  // Very thin extrusion (blade-like cross section)
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, { depth: 0.04, bevelEnabled: false }).toNonIndexed();
  bodyGeo.center();

  // ── 2. Tubular Upward-Looking Eyes (Binocular Mesopelagic Adaptation) ──
  const eyeTubeLeft = new THREE.CylinderGeometry(0.065, 0.065, 0.12, 10).toNonIndexed();
  eyeTubeLeft.rotateX(0.15);
  eyeTubeLeft.translate(0.12, 0.35, 0.06);

  const eyeTubeRight = new THREE.CylinderGeometry(0.065, 0.065, 0.12, 10).toNonIndexed();
  eyeTubeRight.rotateX(-0.15);
  eyeTubeRight.translate(0.12, 0.35, -0.06);

  const parts = [bodyGeo, eyeTubeLeft, eyeTubeRight];
  parts.forEach((p) => {
    delete (p.attributes as Record<string, unknown>).uv;
  });

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();

  // ── 3. Mirror-Silver & Ventral Photophore Coloration ──
  const pos = merged.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (y > 0.38) {
      // Large dark upward telescopic lens
      color.set('#0f172a');
    } else if (y < -0.32) {
      // Ventral photophore light-producing organs (bright glowing cyan!)
      color.set('#38bdf8');
    } else {
      // Mirror-like metallic silver body
      const normY = THREE.MathUtils.clamp((y + 0.3) / 0.6, 0, 1);
      color.set('#94a3b8').lerp(new THREE.Color('#e2e8f0'), normY);
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

export function DeepHatchetfish({ currentDepth }: { currentDepth: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const isVisible = currentDepth >= 220 && currentDepth <= 850;

  const geometry = useMemo(() => createHatchetfishGeometry(), []);

  // School members formation
  const schoolData = useMemo(() => {
    return Array.from({ length: HATCHET_COUNT }, (_, i) => ({
      baseX: 2.5 + (i % 3) * 1.8 - 1.5,
      baseZ: -2.0 + Math.floor(i / 3) * 1.6,
      depthM: 410 + (i % 4) * 45,
      speed: 0.6 + (i % 3) * 0.15,
      phase: i * 0.9,
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current || !isVisible) return;
    const t = state.clock.getElapsedTime();

    schoolData.forEach((fish, i) => {
      // Hovering buoyancy dynamics with synchronized gentle schooling drift
      const x = fish.baseX + Math.sin(t * 0.4 + fish.phase) * 1.2;
      const z = fish.baseZ + Math.cos(t * 0.35 + fish.phase) * 0.8;
      const y = -(fish.depthM * DEPTH_SCALE) + Math.sin(t * fish.speed + fish.phase) * 0.35;

      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.PI * 0.25 + Math.sin(t * 0.6 + fish.phase) * 0.1;
      dummy.rotation.z = Math.sin(t * 0.8 + fish.phase) * 0.05;
      dummy.scale.setScalar(0.75);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!isVisible) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, HATCHET_COUNT]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.15}
        metalness={0.85}
        emissive="#38bdf8"
        emissiveIntensity={0.25}
      />
    </instancedMesh>
  );
}
