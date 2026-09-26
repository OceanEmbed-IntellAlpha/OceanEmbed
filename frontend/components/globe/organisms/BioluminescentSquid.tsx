'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DEPTH_SCALE = 0.1;

/**
 * Procedural 3D Bioluminescent Firefly Squid (Watasenia scintillans)
 * Torpedo mantle with lateral steering fins, cluster of undulating tentacles,
 * twilight-adapted eyes, and glowing bioluminescent photophores.
 */
function createSquidMantleGeometry(): THREE.BufferGeometry {
  // ── 1. Streamlined Conical Mantle ──
  const mantleGeo = new THREE.ConeGeometry(0.48, 1.8, 16).toNonIndexed();
  mantleGeo.rotateZ(Math.PI / 2); // Point forward along +X
  const mPos = mantleGeo.attributes.position;
  for (let i = 0; i < mPos.count; i++) {
    const x = mPos.getX(i);
    let y = mPos.getY(i);
    let z = mPos.getZ(i);

    // Slightly flatten dorsoventrally
    y *= 0.75;
    z *= 0.85;

    // Bulge near mid-mantle
    if (x < 0.2 && x > -0.6) {
      const bulge = 1.0 + Math.sin((x + 0.6) / 0.8 * Math.PI) * 0.25;
      y *= bulge;
      z *= bulge;
    }
    mPos.setXYZ(i, x, y, z);
  }

  // ── 2. Diamond Lateral Fins (Top rear of mantle) ──
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(-0.45, 0.48);  // Wing peak
  finShape.lineTo(-0.85, 0);
  finShape.lineTo(-0.45, -0.48);
  finShape.closePath();

  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.015, bevelEnabled: false }).toNonIndexed();
  finGeo.rotateX(Math.PI / 2); // Lay horizontal
  finGeo.translate(0.55, 0.05, 0);

  // ── 3. Head & Large Eyes ──
  const headGeo = new THREE.SphereGeometry(0.32, 12, 10).toNonIndexed();
  headGeo.translate(-0.88, 0, 0);

  const eyeLeft = new THREE.SphereGeometry(0.08, 8, 8).toNonIndexed();
  eyeLeft.translate(-0.9, 0.08, 0.22);
  const eyeRight = new THREE.SphereGeometry(0.08, 8, 8).toNonIndexed();
  eyeRight.translate(-0.9, 0.08, -0.22);

  const parts = [mantleGeo, finGeo, headGeo, eyeLeft, eyeRight];
  parts.forEach((p) => {
    delete (p.attributes as Record<string, unknown>).uv;
  });

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();

  // ── 4. Shimmering Deep Twilight Coloration ──
  // - Mantle: Translucent deep ruby/crimson & sapphire (#1e1b4b / #4c0519)
  // - Photophore specks: Cyan glowing dots (#38bdf8 / #67e8f9)
  // - Eyes: Midnight indigo (#020617) with luminous rim
  const pos = merged.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (x < -0.82 && Math.abs(z) > 0.18) {
      color.set('#020617'); // Eye
    } else {
      // Bioluminescent photophore speckles
      const speckle = Math.sin(x * 16.0) * Math.cos(z * 16.0) * Math.sin(y * 16.0);
      if (speckle > 0.7) {
        color.set('#38bdf8'); // Glowing photophore
      } else {
        const normX = THREE.MathUtils.clamp((x + 1.0) / 1.8, 0, 1);
        color.set('#312e81').lerp(new THREE.Color('#4c0519'), normX); // Deep twilight ruby-indigo
      }
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

export function BioluminescentSquid({ currentDepth }: { currentDepth: number }) {
  const squadRef = useRef<THREE.Group>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);

  // Visible across the Mesopelagic twilight zone (180m to 780m)
  const isVisible = currentDepth >= 160 && currentDepth <= 820;

  const mantleGeo = useMemo(() => createSquidMantleGeometry(), []);

  // Tentacle curves
  const tentacleGeos = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (i / 6) * Math.PI * 2;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.0, Math.sin(angle) * 0.15, Math.cos(angle) * 0.15),
        new THREE.Vector3(-1.5, Math.sin(angle) * 0.25, Math.cos(angle) * 0.25),
        new THREE.Vector3(-2.2, Math.sin(angle) * 0.18, Math.cos(angle) * 0.18),
        new THREE.Vector3(-3.0, Math.sin(angle) * 0.35, Math.cos(angle) * 0.35),
      ]);
      return new THREE.TubeGeometry(curve, 20, 0.035, 6, false);
    });
  }, []);

  useFrame((state) => {
    if (!squadRef.current || !isVisible) return;
    const t = state.clock.getElapsedTime();

    // ── Jet Propulsion Dart Kinematics ──
    // Burst and glide motion: fast forward acceleration, slow drifting deceleration
    const jetPhase = (t * 1.6) % (Math.PI * 2);
    const jetBurst = Math.pow(Math.sin(jetPhase * 0.5), 4) * 1.5;

    const baseAngle = t * 0.25;
    const radius = 8.5;
    const x = Math.cos(baseAngle) * radius + Math.sin(t * 1.2) * jetBurst * 0.4;
    const z = Math.sin(baseAngle) * (radius * 0.8);
    const y = -(360 * DEPTH_SCALE) + Math.sin(t * 0.5) * 1.2;

    squadRef.current.position.set(x, y, z);

    // Tangent heading
    const tx = -Math.sin(baseAngle) * radius;
    const tz = Math.cos(baseAngle) * (radius * 0.8);
    const heading = Math.atan2(tz, tx);

    squadRef.current.rotation.y = -heading + Math.PI;
    squadRef.current.rotation.z = Math.sin(t * 0.8) * 0.15;

    // Bioluminescent pulse
    if (lightRef.current) {
      const pulse = 1.0 + Math.sin(t * 4.2) * 0.45;
      lightRef.current.intensity = pulse * 1.8;
    }
  });

  if (!isVisible) return null;

  return (
    <group ref={squadRef} scale={1.1}>
      <mesh geometry={mantleGeo}>
        <meshStandardMaterial
          vertexColors
          roughness={0.2}
          metalness={0.2}
          emissive="#38bdf8"
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Trailing Tentacles */}
      {tentacleGeos.map((geo, idx) => (
        <mesh key={idx} geometry={geo}>
          <meshStandardMaterial
            color="#4338ca"
            emissive="#38bdf8"
            emissiveIntensity={0.25}
            roughness={0.3}
          />
        </mesh>
      ))}

      {/* Bioluminescent Glow Point Light */}
      <pointLight
        ref={lightRef}
        color="#38bdf8"
        distance={18}
        decay={2.0}
        intensity={2.0}
      />
    </group>
  );
}
