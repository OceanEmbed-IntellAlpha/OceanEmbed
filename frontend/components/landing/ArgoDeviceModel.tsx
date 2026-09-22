'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';


interface ArgoDeviceModelProps {
  position?: [number, number, number];
  scale?: number;
  active?: boolean;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

const INTERIOR_KEYWORDS = [
  'battery',
  'buoyancy_bladder',
  'internal',
  'control_electronics',
  'ctd_internal',
  'piston',
  'cutaway_hull_cover',
];

// Offsets to snap the modular CAD meshes together flush (zero gaps)
const ASSEMBLY_OFFSETS: Record<string, number> = {
  bottom_cap: 0.015,
  lower_pressure_case: 0.073,
  stability_collar: -0.012,
  deployment_lifting_bail: -0.012,
  ctd_sensor: -0.066,
  sensor_port: -0.066,
  gps: -0.088,
  antenna_gps_module: -0.088,
  antenna_rod: -0.094,
  antenna_tip: -0.094,
};

export function ArgoDeviceModel({
  position = [-3.1, 0.25, 0],
  scale = 1.55,
  active = true,
  onPointerOver,
  onPointerOut,
}: ArgoDeviceModelProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);


  // Load GLB
  const { scene } = useGLTF('/device-viewer/argo_float.glb');

  // Clone and prepare model: assemble flush, hide interior meshes, enhance exterior PBR materials
  const clonedScene = useMemo(() => {
    const root = scene.clone(true);

    // Standardized premium ocean materials
    const yellowHullMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f59e0b'), // Warm safety yellow
      roughness: 0.3,
      metalness: 0.15,
    });

    const darkCollarMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'), // Matte graphite navy
      roughness: 0.45,
      metalness: 0.3,
    });

    const brushedMetalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#94a3b8'), // Polished stainless steel / titanium
      roughness: 0.25,
      metalness: 0.85,
    });

    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = (mesh.name || '').toLowerCase();
        const isInterior = INTERIOR_KEYWORDS.some((kw) => name.includes(kw));

        if (isInterior) {
          mesh.visible = false;
        } else {
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // Assemble modular parts flush to eliminate CAD exploded view gaps
          for (const [key, offset] of Object.entries(ASSEMBLY_OFFSETS)) {
            if (name.includes(key)) {
              mesh.position.y += offset;
              break;
            }
          }

          // Apply clean curated materials based on component type
          if (name.includes('hull') || name.includes('lower_pressure') || name.includes('bottom_cap')) {
            mesh.material = yellowHullMat;
          } else if (name.includes('collar') || name.includes('antenna_tip') || name.includes('bail') || name.includes('ctd_sensor')) {
            mesh.material = darkCollarMat;
          } else if (name.includes('antenna_rod') || name.includes('top_end_cap') || name.includes('gps')) {
            mesh.material = brushedMetalMat;
          } else {
            mesh.material = yellowHullMat;
          }
        }
      }
    });

    // Center model vertically so hull center sits at Y = 0
    root.position.y = -0.705;

    return root;
  }, [scene]);

  // Sounding profile depth line geometry
  const soundingLine = useMemo(() => {
    const points = [
      new THREE.Vector3(0, -0.65, 0),
      new THREE.Vector3(0, -2.1, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: '#38bdf8',
      dashSize: 0.06,
      gapSize: 0.04,
      transparent: true,
      opacity: 0.4,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }, []);

  // Gentle, natural ocean swell bobbing animation
  useFrame((state, delta) => {
    if (!active || !groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // Subtle, calm buoyancy swell (slow oceanic period ~12s)
    const targetY = Math.sin(t * 0.5) * 0.035;
    groupRef.current.position.y = THREE.MathUtils.damp(
      groupRef.current.position.y,
      targetY,
      2.5,
      delta
    );

    // Subtle pitch and roll from gentle ocean swells
    groupRef.current.rotation.z = Math.sin(t * 0.4) * 0.018;
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.012;

    // Slow continuous drift rotation
    groupRef.current.rotation.y += delta * 0.035;

    // Rotate depth marker ring slowly
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.1;
    }

    // Smooth hover micro-scale
    const targetScale = hovered ? scale * 1.04 : scale;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 6, delta)
    );
  });

  return (
    <group position={position}>
      {/* 200m Depth Slice Ring (Concentric bathymetric contour ring) */}
      <mesh
        ref={ringRef}
        position={[0, -0.65, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.38, 0.395, 64]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer subtle halo ring */}
      <mesh position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.49, 48]} />
        <meshBasicMaterial
          color="#0284c7"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Vertical Sounding Profile Line */}
      <primitive object={soundingLine} />

      {/* Argo Float 3D Mesh */}
      <group
        ref={groupRef}
        scale={scale}

        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
          onPointerOver?.();
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
          onPointerOut?.();
        }}
      >
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

useGLTF.preload('/device-viewer/argo_float.glb');
