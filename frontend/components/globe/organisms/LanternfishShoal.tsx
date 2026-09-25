'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const LANTERNFISH_COUNT = 20;
const DEPTH_SCALE = 0.1;

/**
 * Creates an authentic, slender 3D Mesopelagic Lanternfish (Myctophidae)
 * with reduced delicate proportions, large twilight-adapted eye, forked tail,
 * and luminous ventral photophore rows.
 */
function createLanternfishGeometry(): THREE.BufferGeometry {
  // 1. Slender delicate fusiform body (reduced size)
  const bodyGeo = new THREE.SphereGeometry(0.42, 16, 10).toNonIndexed();
  const pos = bodyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    z *= 0.25;
    y *= 0.38;

    if (x > 0) {
      const taper = 1.0 - (x / 0.42) * 0.35;
      y *= taper;
      z *= taper;
    } else {
      const taper = 1.0 + (x / 0.42) * 0.78;
      y = y * Math.max(0.14, taper);
      z = z * Math.max(0.12, taper);
    }
    pos.setXYZ(i, x, y, z);
  }

  // 2. Delicate Caudal Tail
  const tailShape = new THREE.Shape();
  tailShape.moveTo(-0.35, 0.02);
  tailShape.lineTo(-0.7, 0.22);
  tailShape.lineTo(-0.55, 0);
  tailShape.lineTo(-0.7, -0.22);
  tailShape.lineTo(-0.35, -0.02);
  tailShape.closePath();
  const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.01, bevelEnabled: false }).toNonIndexed();

  // 3. Dorsal Fin
  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(0.06, 0);
  dorsalShape.lineTo(-0.08, 0.16);
  dorsalShape.lineTo(-0.2, 0);
  dorsalShape.closePath();
  const dorsalGeo = new THREE.ExtrudeGeometry(dorsalShape, { depth: 0.008, bevelEnabled: false }).toNonIndexed();
  dorsalGeo.translate(0, 0.13, 0);

  // 4. Large Mesopelagic Eyes (Adapted for twilight zone bioluminescence)
  const eyeLeft = new THREE.SphereGeometry(0.055, 8, 8).toNonIndexed();
  eyeLeft.translate(0.26, 0.04, 0.075);
  const eyeRight = new THREE.SphereGeometry(0.055, 8, 8).toNonIndexed();
  eyeRight.translate(0.26, 0.04, -0.075);

  const parts = [bodyGeo, tailGeo, dorsalGeo, eyeLeft, eyeRight];
  parts.forEach((p) => {
    delete (p.attributes as Record<string, unknown>).uv;
  });

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();

  // Color: Dark silvery twilight tone with glowing cyan photophore belly
  const mPos = merged.attributes.position;
  const colors = new Float32Array(mPos.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < mPos.count; i++) {
    const x = mPos.getX(i);
    const y = mPos.getY(i);
    const z = mPos.getZ(i);

    // Large glowing reflective eye
    if (x > 0.22 && x < 0.32 && Math.abs(z) > 0.06) {
      color.set('#38bdf8'); // Tapetum lucidum reflection
    } else if (y < -0.07) {
      // Ventral photophore series (counter-illumination cyan glow)
      color.set('#00f2fe');
    } else {
      // Deep twilight silver-indigo body
      color.set('#1e293b').lerp(new THREE.Color('#090d16'), Math.max(0, y * 2.5));
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

export function LanternfishShoal({ currentDepth }: { currentDepth: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  // Visible across the mesopelagic twilight zone (120m to 800m)
  const isVisible = currentDepth >= 100 && currentDepth <= 820;

  const fishData = useMemo(() => {
    // Organically scattered across the deep scattering layer (~420m to ~590m)
    const baseDepths = [
      430, 450, 470, 485, 500, 515, 530, 545, 565, 580,
      440, 460, 480, 495, 510, 525, 540, 555, 570, 590,
    ];

    // Wide organic 3D scatter in the horizontal plane (not clustered)
    const positions = [
      { x: 3.8, z: 3.5 },
      { x: 1.5, z: 1.8 },
      { x: 5.4, z: 1.2 },
      { x: -1.8, z: 2.4 },
      { x: 2.2, z: -2.5 },
      { x: 6.2, z: 4.8 },
      { x: -3.5, z: 1.0 },
      { x: 4.5, z: -1.0 },
      { x: -2.0, z: -3.2 },
      { x: 0.8, z: 4.5 },
      { x: 5.0, z: -3.0 },
      { x: -0.5, z: -1.5 },
      { x: 2.8, z: 5.2 },
      { x: -4.2, z: -1.8 },
      { x: 3.0, z: -4.5 },
      { x: -2.8, z: 3.8 },
      { x: 1.2, z: -3.8 },
      { x: 4.0, z: 2.8 },
      { x: -1.2, z: -4.2 },
      { x: 6.0, z: -0.5 },
    ];

    return Array.from({ length: LANTERNFISH_COUNT }, (_, i) => {
      const pos = positions[i % positions.length];
      return {
        centerX: pos.x,
        centerZ: pos.z,
        depthM: baseDepths[i % baseDepths.length],
        orbitRadiusX: 1.4 + (i % 4) * 0.6,
        orbitRadiusZ: 1.1 + ((i + 2) % 3) * 0.7,
        angle: (i / LANTERNFISH_COUNT) * Math.PI * 2,
        speed: 0.28 + ((i * 37) % 10) * 0.02,
        // Decreased, slender, authentic small lanternfish size
        scale: 0.22 + ((i * 19) % 10) * 0.008,
        phase: (i * 1.414) % (Math.PI * 2),
      };
    });
  }, []);

  const fishGeometry = useMemo(() => createLanternfishGeometry(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current || !isVisible) return;
    const time = state.clock.getElapsedTime();

    fishData.forEach((f, i) => {
      const currentAngle = f.angle + time * f.speed * 0.22;
      const x = f.centerX + Math.cos(currentAngle) * f.orbitRadiusX;
      const z = f.centerZ + Math.sin(currentAngle) * f.orbitRadiusZ;
      // Gentle vertical buoyancy drifting
      const y = -(f.depthM * DEPTH_SCALE) + Math.sin(time * 0.7 + f.phase) * 0.35;

      dummy.position.set(x, y, z);

      // Orient forward in direction of motion
      const nextAngle = currentAngle + 0.04;
      const nextX = f.centerX + Math.cos(nextAngle) * f.orbitRadiusX;
      const nextZ = f.centerZ + Math.sin(nextAngle) * f.orbitRadiusZ;
      dummy.lookAt(nextX, y, nextZ);

      // Subtle gentle tail swish
      dummy.rotation.y += Math.sin(time * 3.8 + i) * 0.08;
      dummy.scale.setScalar(f.scale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!isVisible) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[fishGeometry, undefined, LANTERNFISH_COUNT]}
      position={[0, 0, 0]}
    >
      <meshStandardMaterial
        vertexColors
        emissive="#00f2fe"
        emissiveIntensity={1.9}
        roughness={0.3}
        metalness={0.7}
      />
    </instancedMesh>
  );
}
