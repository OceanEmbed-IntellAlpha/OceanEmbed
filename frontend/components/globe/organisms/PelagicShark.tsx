'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DEPTH_SCALE = 0.1;

/**
 * Procedural 3D Pelagic Shark (Silky / Oceanic Whitetip)
 * Streamlined fusiform predatory fuselage, tall dorsal fin,
 * asymmetrical heterocercal caudal tail, swept pectoral fins,
 * and realistic counter-shading coloration.
 */
function createSharkGeometry(): THREE.BufferGeometry {
  // 1. Predatory Body
  const bodyGeo = new THREE.SphereGeometry(1.6, 24, 16).toNonIndexed();
  const pos = bodyGeo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Lateral streamlining
    z *= 0.38;
    y *= 0.52;

    if (x > 0) {
      // Snout tapering to pointed apex with slight downward snout slope
      const headTaper = 1.0 - (x / 1.6) * 0.55;
      y = (y - 0.08 * (x / 1.6)) * headTaper;
      z *= headTaper;
    } else {
      // Tail root tapering towards peduncle
      const tailTaper = 1.0 + (x / 1.6) * 0.85;
      y *= Math.max(0.12, tailTaper);
      z *= Math.max(0.12, tailTaper);
    }
    pos.setXYZ(i, x, y, z);
  }

  // 2. High Dorsal Fin
  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(0.2, 0);
  dorsalShape.lineTo(-0.25, 0.72);  // Tall apex leaning backward
  dorsalShape.lineTo(-0.65, 0);
  dorsalShape.closePath();

  const dorsalGeo = new THREE.ExtrudeGeometry(dorsalShape, { depth: 0.03, bevelEnabled: false }).toNonIndexed();
  dorsalGeo.translate(0, 0.5, 0);

  // 3. Second Dorsal & Anal Fin
  const secDorsalShape = new THREE.Shape();
  secDorsalShape.moveTo(0, 0);
  secDorsalShape.lineTo(-0.15, 0.22);
  secDorsalShape.lineTo(-0.3, 0);
  secDorsalShape.closePath();
  const secDorsalGeo = new THREE.ExtrudeGeometry(secDorsalShape, { depth: 0.02, bevelEnabled: false }).toNonIndexed();
  secDorsalGeo.translate(-0.85, 0.18, 0);

  // 4. Heterocercal Caudal Tail Fin (Tall upper lobe, shorter lower lobe)
  const tailShape = new THREE.Shape();
  tailShape.moveTo(-1.3, 0.05);
  tailShape.lineTo(-2.2, 0.88);   // Epic upper lobe
  tailShape.lineTo(-1.85, 0.08);  // Fork notch
  tailShape.lineTo(-2.1, -0.42);  // Lower lobe
  tailShape.lineTo(-1.3, -0.05);
  tailShape.closePath();

  const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.035, bevelEnabled: false }).toNonIndexed();

  // 5. Large Swept-Back Pectoral Fins (Left & Right)
  const pectShape = new THREE.Shape();
  pectShape.moveTo(0, 0);
  pectShape.lineTo(-0.65, -0.48);
  pectShape.lineTo(-0.52, 0);
  pectShape.closePath();

  const leftPectGeo = new THREE.ExtrudeGeometry(pectShape, { depth: 0.02, bevelEnabled: false }).toNonIndexed();
  leftPectGeo.rotateY(0.48);
  leftPectGeo.rotateX(0.2);
  leftPectGeo.translate(0.35, -0.15, 0.32);

  const rightPectGeo = leftPectGeo.clone();
  rightPectGeo.scale(1, 1, -1);

  // 6. Eyes (Dark glossy pupils)
  const eyeLeft = new THREE.SphereGeometry(0.065, 8, 8).toNonIndexed();
  eyeLeft.translate(1.05, 0.1, 0.25);
  const eyeRight = new THREE.SphereGeometry(0.065, 8, 8).toNonIndexed();
  eyeRight.translate(1.05, 0.1, -0.25);

  const allParts = [bodyGeo, dorsalGeo, secDorsalGeo, tailGeo, leftPectGeo, rightPectGeo, eyeLeft, eyeRight];
  allParts.forEach((part) => {
    delete (part.attributes as Record<string, unknown>).uv;
  });

  const merged = BufferGeometryUtils.mergeGeometries(allParts, false);
  merged.computeVertexNormals();

  // 7. Counter-Shading Vertex Colors
  // - Dorsal back: Deep oceanic slate grey-blue (#1e293b / #334155)
  // - Flank: Cool steel grey (#64748b)
  // - Belly: Clean porcelain white (#f8fafc)
  // - Fin tips: Subtle darker slate edge
  const mPos = merged.attributes.position;
  const colors = new Float32Array(mPos.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < mPos.count; i++) {
    const x = mPos.getX(i);
    const y = mPos.getY(i);
    const z = mPos.getZ(i);

    // Eye detection
    if (x > 0.98 && Math.abs(z) > 0.2 && y > 0.04) {
      color.set('#020617'); // Dark eye
    } else {
      const normY = THREE.MathUtils.clamp((y + 0.35) / 0.85, 0, 1);
      if (normY < 0.35) {
        // Pure white ventral belly
        color.set('#f8fafc').lerp(new THREE.Color('#e2e8f0'), normY / 0.35);
      } else if (normY < 0.68) {
        // Lateral steel transition
        color.set('#64748b').lerp(new THREE.Color('#475569'), (normY - 0.35) / 0.33);
      } else {
        // Oceanic slate grey/blue back
        color.set('#1e293b').lerp(new THREE.Color('#0f172a'), (normY - 0.68) / 0.32);
      }
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

export function PelagicShark({ currentDepth }: { currentDepth: number }) {
  const shark1Ref = useRef<THREE.Group>(null!);
  const shark2Ref = useRef<THREE.Group>(null!);

  const isVisible = currentDepth < 190;

  const geometry = useMemo(() => createSharkGeometry(), []);

  useFrame((state) => {
    if (!shark1Ref.current || !isVisible) return;
    const t = state.clock.getElapsedTime();

    // ── Primary Shark: Patrols majestically at ~35m depth ──
    const speed = 0.38;
    const radiusX = 14.0;
    const radiusZ = 9.0;
    const angle1 = t * speed;

    const x1 = Math.cos(angle1) * radiusX;
    const z1 = Math.sin(angle1) * radiusZ;
    const y1 = -(35 * DEPTH_SCALE) + Math.sin(t * 0.45) * 0.6;

    shark1Ref.current.position.set(x1, y1, z1);

    // Heading tangent to elliptical orbit
    const tx1 = -Math.sin(angle1) * radiusX;
    const tz1 = Math.cos(angle1) * radiusZ;
    const heading1 = Math.atan2(tz1, tx1);

    // Sinusoidal body yaw swim undulation
    const swimSway1 = Math.sin(t * 2.2) * 0.08;
    shark1Ref.current.rotation.y = -heading1 + Math.PI + swimSway1;
    shark1Ref.current.rotation.z = Math.sin(t * 0.4) * 0.08; // Subtle banking roll

    // ── Secondary Shark: Slightly deeper at ~65m depth on opposite orbit ──
    if (shark2Ref.current) {
      const angle2 = t * (speed * 0.85) + Math.PI * 0.8;
      const x2 = Math.cos(angle2) * (radiusX * 1.2);
      const z2 = Math.sin(angle2) * (radiusZ * 1.15);
      const y2 = -(65 * DEPTH_SCALE) + Math.cos(t * 0.35) * 0.8;

      shark2Ref.current.position.set(x2, y2, z2);

      const tx2 = -Math.sin(angle2) * (radiusX * 1.2);
      const tz2 = Math.cos(angle2) * (radiusZ * 1.15);
      const heading2 = Math.atan2(tz2, tx2);

      const swimSway2 = Math.sin(t * 1.9 + 1.2) * 0.07;
      shark2Ref.current.rotation.y = -heading2 + Math.PI + swimSway2;
      shark2Ref.current.rotation.z = Math.cos(t * 0.3) * 0.06;
    }
  });

  if (!isVisible) return null;

  return (
    <>
      <group ref={shark1Ref}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.25}
            metalness={0.15}
            clearcoat={0.6}
            clearcoatRoughness={0.2}
          />
        </mesh>
      </group>

      <group ref={shark2Ref} scale={0.88}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.25}
            metalness={0.15}
            clearcoat={0.6}
            clearcoatRoughness={0.2}
          />
        </mesh>
      </group>
    </>
  );
}
