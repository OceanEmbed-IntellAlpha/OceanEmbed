'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DEPTH_SCALE = 0.1;

/**
 * Procedural 3D Green Sea Turtle (Chelonia mydas)
 * Hydrodynamic domed carapace with scute mosaic coloration,
 * wing-like pectoral flippers flapping rhythmically,
 * trailing hind flippers, and raised reptilian head.
 */
function createTurtleBodyGeometry(): THREE.BufferGeometry {
  // ── 1. Domed Carapace (Upper Shell) ──
  const shellGeo = new THREE.SphereGeometry(1.1, 20, 14).toNonIndexed();
  const sPos = shellGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const x = sPos.getX(i);
    let y = sPos.getY(i);
    let z = sPos.getZ(i);

    // Oval teardrop shape
    z *= 0.78;
    y *= 0.42;

    // Flatten bottom
    if (y < 0) y *= 0.5;

    // Taper towards rear
    if (x < 0) {
      const taper = 1.0 + (x / 1.1) * 0.4;
      z *= Math.max(0.3, taper);
    }
    sPos.setXYZ(i, x, y, z);
  }

  // ── 2. Head and Neck ──
  const headGeo = new THREE.SphereGeometry(0.32, 14, 10).toNonIndexed();
  const hPos = headGeo.attributes.position;
  for (let i = 0; i < hPos.count; i++) {
    const x = hPos.getX(i);
    let y = hPos.getY(i);
    let z = hPos.getZ(i);
    z *= 0.65;
    y *= 0.75;
    if (x > 0) y -= 0.08 * (x / 0.32); // Beak dip
    hPos.setXYZ(i, x + 1.25, y + 0.18, z);
  }

  // ── 3. Rear Steering Flippers ──
  const rearShape = new THREE.Shape();
  rearShape.moveTo(0, 0);
  rearShape.lineTo(-0.45, 0.18);
  rearShape.lineTo(-0.55, 0);
  rearShape.lineTo(-0.4, -0.15);
  rearShape.closePath();

  const leftRearGeo = new THREE.ExtrudeGeometry(rearShape, { depth: 0.02, bevelEnabled: false }).toNonIndexed();
  leftRearGeo.rotateY(0.35);
  leftRearGeo.translate(-0.95, -0.05, 0.45);

  const rightRearGeo = leftRearGeo.clone();
  rightRearGeo.scale(1, 1, -1);

  // ── 4. Eyes ──
  const eyeLeft = new THREE.SphereGeometry(0.045, 8, 8).toNonIndexed();
  eyeLeft.translate(1.35, 0.26, 0.18);
  const eyeRight = new THREE.SphereGeometry(0.045, 8, 8).toNonIndexed();
  eyeRight.translate(1.35, 0.26, -0.18);

  const parts = [shellGeo, headGeo, leftRearGeo, rightRearGeo, eyeLeft, eyeRight];
  parts.forEach((p) => {
    delete (p.attributes as Record<string, unknown>).uv;
  });

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();

  // ── 5. Coloration ──
  // - Carapace: Olive green (#3f6212), dark emerald (#14532d), golden amber scute borders (#ca8a04)
  // - Skin/Head: Reptilian sage green (#4d7c0f)
  // - Plastron (underside): Warm pale cream (#fef08a / #fef9c3)
  const mPos = merged.attributes.position;
  const colors = new Float32Array(mPos.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < mPos.count; i++) {
    const x = mPos.getX(i);
    const y = mPos.getY(i);
    const z = mPos.getZ(i);

    if (x > 1.25 && Math.abs(z) > 0.14 && y > 0.2) {
      color.set('#0f172a'); // Eye
    } else if (y < -0.06 && x < 1.0) {
      // Plastron (belly)
      color.set('#fef08a').lerp(new THREE.Color('#d97706'), 0.2);
    } else if (x > 0.95) {
      // Head
      color.set('#4d7c0f');
    } else {
      // Carapace shell mosaic pattern
      const mosaic = Math.sin(x * 6.0) * Math.cos(z * 6.0);
      if (mosaic > 0.6) {
        color.set('#ca8a04'); // Amber scute border
      } else if (mosaic < -0.3) {
        color.set('#14532d'); // Dark emerald scute center
      } else {
        color.set('#3f6212'); // Rich olive green
      }
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

/** Wing-like front pectoral flipper */
function createFrontFlipperGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.3, 0.4, 0.9, 0.7, 1.25, 0.55); // Swept wing tip
  shape.bezierCurveTo(1.1, 0.2, 0.6, -0.15, 0.2, -0.2);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false }).toNonIndexed();
  geo.center();
  geo.computeVertexNormals();

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color('#3f6212');
  for (let i = 0; i < pos.count; i++) {
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export function SeaTurtle({ currentDepth }: { currentDepth: number }) {
  const turtleRef = useRef<THREE.Group>(null!);
  const leftWingRef = useRef<THREE.Group>(null!);
  const rightWingRef = useRef<THREE.Group>(null!);

  const isVisible = currentDepth < 130;

  const bodyGeo = useMemo(() => createTurtleBodyGeometry(), []);
  const flipperGeo = useMemo(() => createFrontFlipperGeometry(), []);

  useFrame((state) => {
    if (!turtleRef.current || !isVisible) return;
    const t = state.clock.getElapsedTime();

    // Gliding trajectory in the upper photic zone (~18m depth)
    const speed = 0.22;
    const radius = 10.5;
    const angle = t * speed + 2.5;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * (radius * 0.75);
    const y = -(28 * DEPTH_SCALE) + Math.sin(t * 0.3) * 0.4;

    turtleRef.current.position.set(x, y, z);

    // Tangent heading
    const tx = -Math.sin(angle) * radius;
    const tz = Math.cos(angle) * (radius * 0.75);
    const heading = Math.atan2(tz, tx);

    turtleRef.current.rotation.y = -heading + Math.PI;
    turtleRef.current.rotation.z = Math.sin(t * 0.25) * 0.12; // Gentle banking

    // ── Wing Flapping Kinematics (Power stroke & recovery) ──
    const flapCycle = Math.sin(t * 1.8);
    if (leftWingRef.current) {
      leftWingRef.current.rotation.x = flapCycle * 0.45;
      leftWingRef.current.rotation.z = 0.15 + flapCycle * 0.2;
    }
    if (rightWingRef.current) {
      rightWingRef.current.rotation.x = -flapCycle * 0.45;
      rightWingRef.current.rotation.z = -0.15 - flapCycle * 0.2;
    }
  });

  if (!isVisible) return null;

  return (
    <group ref={turtleRef} scale={1.15}>
      <mesh geometry={bodyGeo}>
        <meshStandardMaterial vertexColors roughness={0.35} metalness={0.1} />
      </mesh>

      {/* Left Front Flipper */}
      <group position={[0.45, 0.02, 0.75]} ref={leftWingRef}>
        <mesh geometry={flipperGeo}>
          <meshStandardMaterial vertexColors roughness={0.4} />
        </mesh>
      </group>

      {/* Right Front Flipper */}
      <group position={[0.45, 0.02, -0.75]} scale={[1, 1, -1]} ref={rightWingRef}>
        <mesh geometry={flipperGeo}>
          <meshStandardMaterial vertexColors roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
