'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GliderPropellerWakeProps {
  active?: boolean;
  position?: [number, number, number];
}

const BUBBLE_COUNT = 120;
const VORTEX_RING_COUNT = 6;

export function GliderPropellerWake({
  active = true,
  position = [-1.18, 0, 0],
}: GliderPropellerWakeProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const ringsGroupRef = useRef<THREE.Group>(null!);

  // Scratch objects for 60fps zero-allocation per-frame transform updates
  const scratchMat = useMemo(() => new THREE.Matrix4(), []);
  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchScale = useMemo(() => new THREE.Vector3(), []);
  const scratchQuat = useMemo(() => new THREE.Quaternion(), []);

  // Pre-configured bubble particle physics state
  const particles = useMemo(() => {
    return Array.from({ length: BUBBLE_COUNT }, () => ({
      age: Math.random() * 1.5,
      life: 0.9 + Math.random() * 0.8,
      angle: Math.random() * Math.PI * 2,
      spinSpeed: 20 + Math.random() * 14,
      initialRadius: 0.02 + Math.random() * 0.045,
      driftY: (Math.random() - 0.25) * 0.08,
      phaseOffset: Math.random() * Math.PI * 2,
    }));
  }, []);

  // Bubble Sphere Geometry & Material
  const bubbleGeom = useMemo(() => new THREE.SphereGeometry(0.016, 8, 8), []);
  const bubbleMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#e6fbff',
      emissive: '#38d9f5',
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
  }, []);

  // Vortex Torus Ring Geometries
  const ringGeometries = useMemo(() => {
    return Array.from({ length: VORTEX_RING_COUNT }, (_, i) => {
      return new THREE.TorusGeometry(0.05 + i * 0.032, 0.007, 8, 28);
    });
  }, []);

  const ringMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#7beeff',
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    meshRef.current.visible = active;
    if (ringsGroupRef.current) {
      ringsGroupRef.current.visible = active;
    }

    if (!active) return;

    const t = state.clock.getElapsedTime();

    // 1. Helical Cavitation Bubble Stream (Spiraling backward along -X axis)
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const p = particles[i];
      p.age = (p.age + delta) % p.life;
      const progress = p.age / p.life;

      // Distance streaming backward from propeller (-X in glider local space)
      const dist = progress * 1.55;
      p.angle += delta * p.spinSpeed;

      // Cone expands outward radially as thrust dissipates
      const r = p.initialRadius + progress * 0.16;
      // Buoyant rise (+Y)
      const rise = progress * 0.12;

      // Local offsets relative to propeller hub
      // Glider faces +X, so wake streams along -X
      const x = -dist;
      const y = Math.sin(p.angle) * r + rise;
      const z = Math.cos(p.angle) * r;

      scratchPos.set(x, y, z);

      // Bubble shrinks and dissipates over its lifetime
      const scale = (1.0 - progress * 0.65) * (0.85 + Math.sin(t * 3.0 + p.phaseOffset) * 0.25);
      scratchScale.set(scale, scale, scale);

      scratchMat.compose(scratchPos, scratchQuat, scratchScale);
      meshRef.current.setMatrixAt(i, scratchMat);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    // 2. Expanding Vortex Wake Rings
    if (ringsGroupRef.current) {
      const rings = ringsGroupRef.current.children as THREE.Mesh[];
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        // Continuous looping pulse traveling backward along -X
        const cycleProgress = ((t * 3.2 + i * 0.6) % (VORTEX_RING_COUNT * 0.6)) / (VORTEX_RING_COUNT * 0.6);
        const ringDist = 0.08 + cycleProgress * 1.6;

        ring.position.set(-ringDist, cycleProgress * 0.08, 0);

        const s = 0.8 + cycleProgress * 1.3;
        ring.scale.set(s, s, s);

        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.48 * (1.0 - cycleProgress));
      }
    }
  });

  return (
    <group position={position}>
      {/* Micro-Bubble Cavitation Instanced Stream */}
      <instancedMesh
        ref={meshRef}
        args={[bubbleGeom, bubbleMat, BUBBLE_COUNT]}
        frustumCulled={false}
      />

      {/* Vortex Torus Wake Rings */}
      <group ref={ringsGroupRef}>
        {ringGeometries.map((geom, idx) => (
          <mesh
            key={idx}
            geometry={geom}
            material={ringMat}
            rotation={[0, Math.PI / 2, 0]}
          />
        ))}
      </group>
    </group>
  );
}
