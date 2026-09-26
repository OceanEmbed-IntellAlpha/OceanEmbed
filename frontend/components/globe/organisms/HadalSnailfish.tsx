'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DEPTH_SCALE = 0.1;

/**
 * Procedural 3D Mariana Hadal Snailfish (Pseudoliparis swirei)
 * The deepest living vertebrate known on Earth.
 * Bulbous rounded head, translucent gelatinous body,
 * broad fluttering pectoral wings, and undulating continuous tail fold.
 */
function createSnailfishGeometry(): THREE.BufferGeometry {
  // ── 1. Bulbous Tadpole-Like Head and Body ──
  const bodyGeo = new THREE.SphereGeometry(1.0, 32, 24);
  const pos = bodyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Lateral shape
    z *= 0.55;
    y *= 0.65;

    if (x > 0) {
      // Blunt, soft, rounded bulldog forehead
      const taper = 1.0 - (x / 1.0) * 0.25;
      y *= taper;
      z *= taper;
    } else {
      // Slender ribbon-like tail taper
      const taper = 1.0 + (x / 1.0) * 0.82;
      y = y * Math.max(0.12, taper);
      z = z * Math.max(0.08, taper);
    }
    pos.setXYZ(i, x, y, z);
  }
  bodyGeo.computeVertexNormals();

  // ── 2. Broad Fan-Like Pectoral Wings (Fluttering fins) ──
  const pectShape = new THREE.Shape();
  pectShape.moveTo(0, 0);
  pectShape.lineTo(-0.45, 0.45);
  pectShape.lineTo(-0.65, 0.2);
  pectShape.lineTo(-0.55, -0.35);
  pectShape.lineTo(-0.25, -0.45);
  pectShape.closePath();

  const leftPectGeo = new THREE.ExtrudeGeometry(pectShape, { depth: 0.015, bevelEnabled: false, curveSegments: 24 });
  leftPectGeo.rotateY(0.42);
  leftPectGeo.rotateX(0.25);
  leftPectGeo.translate(0.15, -0.12, 0.42);

  const rightPectGeo = leftPectGeo.clone();
  rightPectGeo.scale(1, 1, -1);

  // ── 3. Continuous Ribbon Tail Fin Fold ──
  const tailFoldShape = new THREE.Shape();
  tailFoldShape.moveTo(-0.4, 0.15);
  tailFoldShape.lineTo(-1.6, 0.25);
  tailFoldShape.lineTo(-1.9, 0);
  tailFoldShape.lineTo(-1.6, -0.25);
  tailFoldShape.lineTo(-0.4, -0.15);
  tailFoldShape.closePath();

  const tailFoldGeo = new THREE.ExtrudeGeometry(tailFoldShape, { depth: 0.01, bevelEnabled: false, curveSegments: 24 });

  // ── 4. Tiny Vestigial Eyes (Adapted for extreme darkness) ──
  const eyeLeft = new THREE.SphereGeometry(0.04, 16, 16);
  eyeLeft.translate(0.65, 0.15, 0.32);
  const eyeRight = new THREE.SphereGeometry(0.04, 16, 16);
  eyeRight.translate(0.65, 0.15, -0.32);

  const parts = [bodyGeo, leftPectGeo, rightPectGeo, tailFoldGeo, eyeLeft, eyeRight];
  const nonIndexedParts = parts.map((p) => {
    delete (p.attributes as Record<string, unknown>).uv;
    return p.toNonIndexed();
  });

  const merged = BufferGeometryUtils.mergeGeometries(nonIndexedParts, false);


  // ── 5. Translucent Ghost Pink Hadal Pigment ──
  const mPos = merged.attributes.position;
  const colors = new Float32Array(mPos.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < mPos.count; i++) {
    const x = mPos.getX(i);
    const y = mPos.getY(i);
    const z = mPos.getZ(i);

    if (x > 0.6 && Math.abs(z) > 0.28) {
      color.set('#334155'); // Reduced eye
    } else {
      // Translucent pale pearlescent pink
      color.set('#fbcfe8').lerp(new THREE.Color('#fdf2f8'), 0.5);
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

export function HadalSnailfish({ currentDepth }: { currentDepth: number }) {
  const fishRef = useRef<THREE.Group>(null!);

  // Visible at deepest trench depths (> 850m)
  const isVisible = currentDepth >= 850;

  const geometry = useMemo(() => createSnailfishGeometry(), []);

  useFrame((state) => {
    if (!fishRef.current || !isVisible) return;
    const t = state.clock.getElapsedTime();

    // Gliding gracefully near the trench floor at ~960m
    const speed = 0.32;
    const radius = 6.5;
    const angle = t * speed + 1.2;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * (radius * 0.75);
    const y = -(960 * DEPTH_SCALE) + Math.sin(t * 0.5) * 0.5;

    fishRef.current.position.set(x, y, z);

    // Tangent heading
    const tx = -Math.sin(angle) * radius;
    const tz = Math.cos(angle) * (radius * 0.75);
    const heading = Math.atan2(tz, tx);

    // Gentle tadpole tail undulation
    const tailSway = Math.sin(t * 2.8) * 0.12;
    fishRef.current.rotation.y = -heading + Math.PI + tailSway;
    fishRef.current.rotation.z = Math.sin(t * 0.4) * 0.08;
  });

  if (!isVisible) return null;

  return (
    <group ref={fishRef} scale={1.05}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.88}
          roughness={0.15}
          metalness={0.1}
          emissive="#f472b6"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}
