'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';


interface GliderDeviceModelProps {
  position?: [number, number, number];
  scale?: number;
  active?: boolean;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

const HIDE_KEYWORDS = [
  'camera_target',
  'exploded_view',
  'label_',
  'explode_',
  'interior',
  'actuator',
  'gearbox',
  'drive_shaft',
  'ballast_tank',
];

export function GliderDeviceModel({
  position = [3.0, -0.35, 0],
  scale = 0.48,
  active = true,
  onPointerOver,
  onPointerOut,
}: GliderDeviceModelProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);


  // Load GLB
  const { scene } = useGLTF('/glider/glider3.glb');

  // Prepare model: apply consistent premium aerodynamic materials
  const clonedScene = useMemo(() => {
    const root = scene.clone(true);

    const yellowBodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f59e0b'), // Warm safety yellow
      roughness: 0.32,
      metalness: 0.12,
    });

    const graphiteAccentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'), // Matte dark graphite
      roughness: 0.4,
      metalness: 0.25,
    });

    const metalSparMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#94a3b8'), // Metallic titanium
      roughness: 0.25,
      metalness: 0.85,
    });

    root.traverse((child) => {
      const name = (child.name || '').toLowerCase();
      const shouldHide = HIDE_KEYWORDS.some((kw) => name.includes(kw));

      if (shouldHide) {
        child.visible = false;
      } else if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (name.includes('hull_main') || name.includes('hull_rear') || name.includes('fin_') || name.includes('control_aileron')) {
          // Yellow wings and body
          mesh.material = yellowBodyMat;
        } else if (name.includes('hull_nose') || name.includes('rudder') || name.includes('antenna') || name.includes('rear_cap')) {
          // Carbon graphite nose and rudder
          mesh.material = graphiteAccentMat;
        } else if (name.includes('propeller') || name.includes('nose_cap') || name.includes('wing_spar')) {
          // Titanium metal components
          mesh.material = metalSparMat;
        } else {
          mesh.material = yellowBodyMat;
        }
      }
    });

    return root;
  }, [scene]);

  // Natural hydrodynamic flight banking and subtle oscillation
  useFrame((state, delta) => {
    if (!active || !groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // Slow, serene underwater glide drift (period ~14s)
    const targetY = Math.sin(t * 0.45) * 0.025;
    groupRef.current.position.y = THREE.MathUtils.damp(
      groupRef.current.position.y,
      targetY,
      2.5,
      delta
    );

    // Natural hydrodynamic flight angles (descending diagonally towards center)
    const basePitch = -0.3;  // Downward dive pitch
    const baseRoll = 0.42;   // Banked wing roll
    const baseYaw = -0.72;   // Heading towards center-bottom

    groupRef.current.rotation.x = basePitch + Math.sin(t * 0.28) * 0.012;
    groupRef.current.rotation.z = baseRoll + Math.sin(t * 0.35) * 0.015;
    groupRef.current.rotation.y = baseYaw + Math.sin(t * 0.22) * 0.010;

    // Smooth hover micro-scale
    const targetScale = hovered ? scale * 1.05 : scale;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 6, delta)
    );
  });

  return (
    <group position={position}>
      {/* Underwater Glider 3D Mesh */}
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

useGLTF.preload('/glider/glider3.glb');
