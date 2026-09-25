'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const FISH_COUNT = 8;
const DEPTH_SCALE = 0.1;

/**
 * Creates an anatomically authentic 3D pelagic fish (Tuna / Indian Mackerel)
 * including fusiform body, forked caudal tail fin, dorsal fin, pectoral fins,
 * and realistic counter-shading vertex colors (oceanic navy back, silver belly, gold fins).
 */
function createRealisticFishGeometry(): THREE.BufferGeometry {
  // ── 1. Fusiform Streamlined Body ───────────────────────────────────────────
  const bodyGeo = new THREE.SphereGeometry(0.85, 24, 16).toNonIndexed();
  const pos = bodyGeo.attributes.position;
  
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Laterally compress (streamlined fish profile)
    z *= 0.32;
    y *= 0.52;

    if (x > 0) {
      // Taper snout towards front (pointed head)
      const headTaper = 1.0 - (x / 0.85) * 0.45;
      y *= headTaper;
      z *= headTaper;
    } else {
      // Taper peduncle towards tail root
      const tailTaper = 1.0 + (x / 0.85) * 0.78;
      y = y * Math.max(0.16, tailTaper);
      z = z * Math.max(0.12, tailTaper);
    }
    pos.setXYZ(i, x, y, z);
  }

  // ── 2. Forked Caudal Tail Fin (Crescent Tuna Tail) ─────────────────────────
  const tailShape = new THREE.Shape();
  tailShape.moveTo(-0.7, 0.04);
  tailShape.lineTo(-1.42, 0.45);   // Upper lobe tip
  tailShape.lineTo(-1.18, 0);      // Center fork notch
  tailShape.lineTo(-1.42, -0.45);  // Lower lobe tip
  tailShape.lineTo(-0.7, -0.04);
  tailShape.closePath();

  const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.018, bevelEnabled: false }).toNonIndexed();

  // ── 3. High Dorsal Fin (Top Spine) ─────────────────────────────────────────
  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(0.15, 0);
  dorsalShape.lineTo(-0.18, 0.36); // Fin peak leaning backward
  dorsalShape.lineTo(-0.42, 0);
  dorsalShape.closePath();

  const dorsalGeo = new THREE.ExtrudeGeometry(dorsalShape, { depth: 0.015, bevelEnabled: false }).toNonIndexed();
  dorsalGeo.translate(0, 0.3, 0);

  // ── 4. Pectoral Fins (Left & Right) ───────────────────────────────────────
  const pectShape = new THREE.Shape();
  pectShape.moveTo(0, 0);
  pectShape.lineTo(-0.32, -0.18);
  pectShape.lineTo(-0.25, 0);
  pectShape.closePath();

  const leftPectGeo = new THREE.ExtrudeGeometry(pectShape, { depth: 0.01, bevelEnabled: false }).toNonIndexed();
  leftPectGeo.rotateY(0.42);
  leftPectGeo.translate(0.22, -0.06, 0.15);

  const rightPectGeo = leftPectGeo.clone();
  rightPectGeo.scale(1, 1, -1);

  // ── 5. Glossy Eyes (Left & Right Spheres) ─────────────────────────────────
  const eyeLeftGeo = new THREE.SphereGeometry(0.06, 8, 8).toNonIndexed();
  eyeLeftGeo.translate(0.55, 0.08, 0.15);

  const eyeRightGeo = new THREE.SphereGeometry(0.06, 8, 8).toNonIndexed();
  eyeRightGeo.translate(0.55, 0.08, -0.15);

  // Unify attributes for merging
  const allParts = [bodyGeo, tailGeo, dorsalGeo, leftPectGeo, rightPectGeo, eyeLeftGeo, eyeRightGeo];
  allParts.forEach((part) => {
    delete (part.attributes as Record<string, unknown>).uv;
  });

  const merged = BufferGeometryUtils.mergeGeometries(allParts, false);
  merged.computeVertexNormals();

  // ── 6. Per-Vertex Counter-Shading Colors ───────────────────────────────────
  // Authentic pelagic coloration:
  // - Dorsal (top): Deep metallic oceanic navy blue (#0f3460 / #0a4b78)
  // - Lateral line (flank): Shimmering iridescent cyan / aquamarine (#38bdf8)
  // - Ventral (belly): Pearlescent silver-white (#f8fafc)
  // - Fin tips: Golden yellow accents (#facc15)
  // - Eyes: Dark glossy pupil (#020617)
  const mPos = merged.attributes.position;
  const colors = new Float32Array(mPos.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < mPos.count; i++) {
    const x = mPos.getX(i);
    const y = mPos.getY(i);
    const z = mPos.getZ(i);

    // Eye identification
    if (x > 0.48 && x < 0.62 && Math.abs(z) > 0.12 && y > 0.02 && y < 0.14) {
      color.set('#020617'); // Dark eye
    } else if (x < -0.85) {
      // Caudal tail fin
      color.set('#38bdf8').lerp(new THREE.Color('#facc15'), Math.min(1.0, Math.abs(y) * 2.0));
    } else if (y > 0.28) {
      // Dorsal fin
      color.set('#0369a1').lerp(new THREE.Color('#facc15'), 0.35);
    } else if (Math.abs(z) > 0.13 && x > 0.0) {
      // Pectoral fins
      color.set('#7dd3fc').lerp(new THREE.Color('#facc15'), 0.2);
    } else {
      // Body counter-shading
      const normY = THREE.MathUtils.clamp((y + 0.25) / 0.52, 0, 1);
      if (normY < 0.4) {
        // Pearlescent belly
        color.set('#ffffff').lerp(new THREE.Color('#cbd5e1'), normY / 0.4);
      } else if (normY < 0.72) {
        // Iridescent cyan lateral line
        color.set('#38bdf8').lerp(new THREE.Color('#0284c7'), (normY - 0.4) / 0.32);
      } else {
        // Deep oceanic navy blue back
        color.set('#0369a1').lerp(new THREE.Color('#082f49'), (normY - 0.72) / 0.28);
      }
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

export function SurfaceFishShoal({ currentDepth }: { currentDepth: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!);

  // Visible in the surface epipelagic photic layer (< 95m)
  const isVisible = currentDepth < 95;

  // Individual fish state in the shoal
  const fishData = useMemo(() => {
    return Array.from({ length: FISH_COUNT }, (_, i) => ({
      orbitRadius: 4.5 + Math.random() * 3.5, // Keep tight inside camera view
      angle: (i / FISH_COUNT) * Math.PI * 2 + (Math.random() * 0.4 - 0.2),
      speed: 0.5 + Math.random() * 0.35,
      y: -(Math.random() * 4.5 * DEPTH_SCALE * 10), // 0m to 45m depth
      bobFreq: 1.2 + Math.random() * 1.4,
      bobAmp: 0.15 + Math.random() * 0.2,
      scale: 0.38 + Math.random() * 0.12, // Realistic nimble surface fish size
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  const fishGeometry = useMemo(() => createRealisticFishGeometry(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Update instanced positions and dynamic tail-wag undulation
  useFrame((state) => {
    if (!meshRef.current || !isVisible) return;
    const time = state.clock.getElapsedTime();

    // Pass time to custom shader uniform for spine undulation
    if (materialRef.current && (materialRef.current as any).userData?.shader) {
      (materialRef.current as any).userData.shader.uniforms.uTime.value = time;
    }

    fishData.forEach((f, i) => {
      // Coordinated schooling trajectory
      const currentAngle = f.angle + time * f.speed * 0.22;
      const x = Math.cos(currentAngle) * f.orbitRadius;
      const z = Math.sin(currentAngle) * f.orbitRadius;
      const y = f.y + Math.sin(time * f.bobFreq + f.phase) * f.bobAmp;

      dummy.position.set(x, y, z);

      // Tangent forward alignment
      const nextAngle = currentAngle + 0.05;
      const nextX = Math.cos(nextAngle) * f.orbitRadius;
      const nextZ = Math.sin(nextAngle) * f.orbitRadius;
      dummy.lookAt(nextX, y, nextZ);

      dummy.scale.setScalar(f.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Custom vertex shader injection: fluid spine and tail-whip motion
  const onBeforeCompile = useMemo(() => {
    return (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uTime = { value: 0 };
      if (materialRef.current) {
        (materialRef.current as any).userData.shader = shader;
      }

      shader.vertexShader = `
        uniform float uTime;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        // Fluid traveling sine wave from head to tail:
        // x goes from +0.8 (snout) to -1.4 (tail)
        float wagFactor = smoothstep(0.3, -1.3, position.x);
        float wag = sin(uTime * 8.0 - position.x * 4.2) * wagFactor * 0.18;
        transformed.z += wag;
        `
      );
    };
  }, []);

  if (!isVisible) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[fishGeometry, undefined, FISH_COUNT]}
      position={[0, 0, 0]}
    >
      <meshStandardMaterial
        ref={materialRef}
        vertexColors
        roughness={0.22}
        metalness={0.8}
        envMapIntensity={1.4}
        onBeforeCompile={onBeforeCompile}
      />
    </instancedMesh>
  );
}
