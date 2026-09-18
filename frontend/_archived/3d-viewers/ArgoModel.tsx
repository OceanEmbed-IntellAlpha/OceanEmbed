'use client';

import * as THREE from 'three';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { GLTF } from 'three-stdlib';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useArgoStore } from './useArgoStore';
import { ARGO_REGISTRY, ARGO_CORE_PARTS, SYSTEM_COLORS } from '@/lib/data/argoRegistry';
import { ARGO_TRAJECTORY_CURVE } from './useArgoMission';

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh>;
  materials: Record<string, THREE.MeshStandardMaterial>;
};

export const DUAL_EXPLODED_POSITIONS: Record<string, { x: number; y: number; z: number; rx?: number; ry?: number; rz?: number }> = {
  // Top-Left
  GPS_Receiver: { x: -1.18, y: 0.96, z: 0.05, rz: 0.25 },
  GPS_Ring_1: { x: -1.18, y: 0.94, z: 0.05, rz: 0.25 },
  GPS_Ring_2: { x: -1.18, y: 0.96, z: 0.05, rz: 0.25 },
  GPS_Ring_3: { x: -1.18, y: 0.98, z: 0.05, rz: 0.25 },
  CTD_Internal_Rod_1: { x: -1.20, y: 0.88, z: 0.05, rz: 0.25 },
  CTD_Internal_Rod_2: { x: -1.18, y: 0.88, z: 0.05, rz: 0.25 },
  CTD_Internal_Rod_3: { x: -1.16, y: 0.88, z: 0.05, rz: 0.25 },

  // Top-Right
  Antenna_Tip: { x: 1.18, y: 1.48, z: 0, rz: -0.15 },
  Antenna_Rod: { x: 1.15, y: 1.34, z: 0, rz: -0.15 },
  Antenna_GPS_Module: { x: 1.11, y: 1.20, z: 0, rz: -0.15 },
  CTD_Sensor_Payload: { x: 1.08, y: 1.05, z: 0, rz: -0.15 },
  Sensor_Port: { x: 1.11, y: 1.05, z: 0.03, rz: -0.15 },
  Top_End_Cap: { x: 1.04, y: 0.90, z: 0, rz: -0.15 },
  Deployment_Lifting_Bail: { x: 1.07, y: 0.93, z: 0.03, rz: -0.15 },
  Stability_Collar_1: { x: 1.02, y: 0.82, z: 0, rz: -0.15 },
  Stability_Collar_2: { x: 1.00, y: 0.77, z: 0, rz: -0.15 },

  // Center-Left
  Cutaway_Hull_Cover: { x: -1.14, y: 0.58, z: 0.12, ry: 0.2, rz: -0.3 },
  Internal_Rib_1: { x: -1.08, y: 0.34, z: -0.02 },
  Internal_Rib_2: { x: -1.08, y: 0.42, z: -0.02 },
  Internal_Rib_3: { x: -1.08, y: 0.50, z: -0.02 },
  Internal_Rib_4: { x: -1.08, y: 0.58, z: -0.02 },
  Internal_Rib_5: { x: -1.08, y: 0.66, z: -0.02 },
  Pressure_Hull_Shell: { x: -0.92, y: 0.52, z: -0.08, rz: -0.25 },
  Lower_Pressure_Case: { x: -1.08, y: 0.20, z: 0 },

  // Center-Right
  Control_Electronics_CPU: { x: 0.98, y: 0.58, z: 0.04, rz: -0.2 },
  Battery_Module_1: { x: 0.88, y: 0.36, z: 0.02, rz: -0.2 },
  Battery_Module_2: { x: 0.90, y: 0.40, z: 0.02, rz: -0.2 },
  Battery_Module_3: { x: 0.92, y: 0.44, z: 0.02, rz: -0.2 },
  Battery_Module_4: { x: 0.94, y: 0.48, z: 0.02, rz: -0.2 },
  Battery_Module_5: { x: 0.96, y: 0.52, z: 0.02, rz: -0.2 },
  Battery_Module_6: { x: 0.98, y: 0.56, z: 0.02, rz: -0.2 },

  // Bottom-Right
  Piston_Mechanism: { x: 1.14, y: 0.06, z: 0.08, rz: -0.35 },
  Internal_Reservoir: { x: 1.02, y: -0.08, z: 0.05, rz: -0.35 },

  // Bottom-Left
  Buoyancy_Bladder: { x: -1.06, y: -0.12, z: 0.06, rz: -0.3 },
  Bottom_Cap: { x: -1.18, y: -0.24, z: 0.08, rz: -0.3 },
};

// CAD section clipping plane for Cutaway architecture (matching Glider's HULL_CUT_PLANE)
// Slices front half (Z > 0.015 towards camera), making it completely transparent while keeping the back half solid DoubleSide
export const ARGO_HULL_CUT_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.015);

export const MESH_REFS: Record<string, THREE.Mesh> = {};

// Pre-allocated scratch objects to avoid per-frame GC allocations
const _scratchVec3 = new THREE.Vector3();
const _scratchScale = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _scratchEuler = new THREE.Euler();
const _scratchColor = new THREE.Color();
const _scratchTargetPos = new THREE.Vector3();

function DeepSeaLight() {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (lightRef.current) {
      const depth = useArgoStore.getState().telemetry.depth;
      // Fade in subtle vehicle LED smoothly when below 300m photic zone
      const intensity = Math.max(0, Math.min(1, (depth - 300) / 300)) * 3.5;
      lightRef.current.intensity = intensity;
    }
  });
  return <pointLight ref={lightRef} distance={6} decay={2} color="#7dd3fc" position={[0, 0.5, 0.5]} />;
}

function ArgoNode({
  nodeName,
  geometry,
  material,
  position,
  rotation,
}: {
  nodeName: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const viewMode = useArgoStore((s) => s.viewMode);
  const selectedPart = useArgoStore((s) => s.selectedPart);
  const hoveredPart = useArgoStore((s) => s.hoveredPart);
  const setSelectedPart = useArgoStore((s) => s.setSelectedPart);
  const setHoveredPart = useArgoStore((s) => s.setHoveredPart);

  // Clone material on mount
  const clonedMaterial = useMemo(() => {
    const mat = (material as THREE.MeshStandardMaterial).clone();
    mat.transparent = true;
    return mat;
  }, [material]);

  const registryInfo = ARGO_REGISTRY[nodeName] || ARGO_CORE_PARTS[nodeName];

  useEffect(() => {
    if (meshRef.current) {
      MESH_REFS[nodeName] = meshRef.current;
    }
    return () => {
      delete MESH_REFS[nodeName];
    };
  }, [nodeName]);

  // Pre-cache original transform data once at first render
  const origPosRef = useRef<THREE.Vector3 | null>(null);
  const origRotRef = useRef<THREE.Euler | null>(null);
  const origColorRef = useRef<THREE.Color | null>(null);
  // Per-node scratch objects to avoid per-frame allocations
  const nodeTargetColor = useRef(new THREE.Color());
  const nodeTargetQuat = useRef(new THREE.Quaternion());
  const nodeTargetEuler = useRef(new THREE.Euler());
  const nodeScaleVec = useRef(new THREE.Vector3(1, 1, 1));

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    // Initialize original transform data on first frame only
    if (!origPosRef.current && position) {
      origPosRef.current = new THREE.Vector3(...position);
      origRotRef.current = new THREE.Euler(...(rotation || [0, 0, 0]));
      origColorRef.current = (material as THREE.MeshStandardMaterial).color
        ? (material as THREE.MeshStandardMaterial).color.clone()
        : new THREE.Color(1, 1, 1);
    }
    const origPos = origPosRef.current;
    const origRot = origRotRef.current;
    const origColor = origColorRef.current;
    if (!origPos || !origRot || !origColor) return;

    let targetX = origPos.x;
    let targetY = origPos.y;
    let targetZ = origPos.z;
    let targetRX = origRot.x;
    let targetRY = origRot.y;
    let targetRZ = origRot.z;

    const targetScale = 1;
    let targetOpacity = 1;
    // Re-use scratch color instead of cloning per frame
    nodeTargetColor.current.copy(origColor);
    let isVisible = true;

    const isCutawayMode = viewMode === 'cutaway';
    const isExplodedMode = viewMode === 'exploded';
    const isHullShell = nodeName === 'Pressure_Hull_Shell' || nodeName === 'Lower_Pressure_Case';

    if (isExplodedMode) {
      if (clonedMaterial.clippingPlanes) {
        clonedMaterial.clippingPlanes = null;
        clonedMaterial.side = THREE.FrontSide;
        clonedMaterial.needsUpdate = true;
      }
      if (nodeName === 'Cutaway_Hull_Cover') {
        isVisible = true;
      }
      const dest = DUAL_EXPLODED_POSITIONS[nodeName];
      if (dest) {
        targetX = dest.x;
        targetY = dest.y;
        targetZ = dest.z;
        targetRX = dest.rx ?? origRot.x;
        targetRY = dest.ry ?? origRot.y;
        targetRZ = dest.rz ?? origRot.z;
      }
    } else if (isCutawayMode) {
      // Cutaway: make front half of pressure hull completely transparent using clipping plane (matching Glider)
      if (nodeName === 'Cutaway_Hull_Cover') {
        isVisible = false; // Hide cutaway cover so front is completely open
      } else if (isHullShell) {
        if (!clonedMaterial.clippingPlanes) {
          clonedMaterial.clippingPlanes = [ARGO_HULL_CUT_PLANE];
          clonedMaterial.clipShadows = true;
          clonedMaterial.side = THREE.DoubleSide;
          clonedMaterial.needsUpdate = true;
        }
        targetOpacity = 1.0;
      } else {
        // Internal components (battery stack, CPU, reservoir) are 100% visible inside the cutaway hull
        if (clonedMaterial.clippingPlanes) {
          clonedMaterial.clippingPlanes = null;
          clonedMaterial.side = THREE.FrontSide;
          clonedMaterial.needsUpdate = true;
        }
        targetOpacity = 1.0;
      }
    } else {
      // Exterior and Mission modes: solid assembled shell
      if (clonedMaterial.clippingPlanes) {
        clonedMaterial.clippingPlanes = null;
        clonedMaterial.side = THREE.FrontSide;
        clonedMaterial.needsUpdate = true;
      }
      if (nodeName === 'Cutaway_Hull_Cover') {
        isVisible = false;
      }
    }

    // Interactive selection and hover highlighting
    const isNodeSelected = selectedPart === nodeName;
    const isNodeHovered = hoveredPart === nodeName || hovered;

    if (isNodeSelected) {
      nodeTargetColor.current.set('#38d9f5'); // Cyan primary highlight
      targetOpacity = 1.0;
    } else if (isNodeHovered) {
      nodeTargetColor.current.set('#7dd3fc');
    } else if (selectedPart) {
      // De-emphasize unselected parts slightly
      targetOpacity = Math.min(targetOpacity, 0.45);
    }

    mesh.visible = isVisible;
    clonedMaterial.opacity = THREE.MathUtils.lerp(clonedMaterial.opacity, targetOpacity, delta * 5);
    clonedMaterial.color.lerp(nodeTargetColor.current, delta * 5);
    nodeScaleVec.current.set(targetScale, targetScale, targetScale);
    mesh.scale.lerp(nodeScaleVec.current, delta * 8);
    mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, targetX, delta * 5);
    mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, delta * 5);
    mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, targetZ, delta * 5);

    nodeTargetEuler.current.set(targetRX, targetRY, targetRZ);
    nodeTargetQuat.current.setFromEuler(nodeTargetEuler.current);
    mesh.quaternion.slerp(nodeTargetQuat.current, delta * 5);
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Only select if it's one of the core parts or in CAD mode
    setSelectedPart(selectedPart === nodeName ? null : nodeName);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    setHoveredPart(nodeName);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    setHoveredPart(null);
    document.body.style.cursor = 'auto';
  };

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={clonedMaterial}
      position={position}
      rotation={rotation}
      name={nodeName}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}

// Pre-allocated scratch vector for CAD mode target position
const _cadTargetPos = new THREE.Vector3(0, -0.35, 0);

export function ArgoModel({ scale = 1.15, ...props }: { scale?: number } & JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/glider/argo_float.glb') as GLTFResult;
  const group = useRef<THREE.Group>(null);

  const viewMode = useArgoStore((state) => state.viewMode);
  const missionTime = useArgoStore((state) => state.missionTime);

  useFrame((state, delta) => {
    if (!group.current) return;

    if (viewMode === 'mission') {
      // Dynamic vertical motion along the actual 2,000m Catmull-Rom Argo profiling trajectory
      const prog = Math.max(0, Math.min(0.999, missionTime));
      const pos = ARGO_TRAJECTORY_CURVE.getPointAt(prog);

      // Align vehicle center of mass (Y: ~0.45 in model space) with trajectory depth
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, pos.x, 0.15);
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, pos.y - 0.45, 0.15);
      group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, pos.z, 0.15);

      // Subtle dynamic float roll/heave from ocean waves & water displacement
      const t = state.clock.getElapsedTime();
      const waveRoll = Math.sin(t * 1.8) * 0.035;
      const wavePitch = Math.cos(t * 1.5) * 0.025;
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, waveRoll, delta * 4);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, wavePitch, delta * 4);
      group.current.rotation.y += delta * 0.08; // Gentle slow yaw rotation
    } else {
      // In CAD views (exterior, cutaway, exploded), vehicle centers at nominal origin
      group.current.position.lerp(_cadTargetPos, delta * 5);
      group.current.rotation.set(0, 0, 0);
    }
  });

  return (
    <group scale={scale} {...props}>
      <group ref={group} dispose={null}>
        {viewMode === 'mission' && <DeepSeaLight />}

        {/* Localized model lighting — short range so it only illuminates the float, not the ocean */}
        <pointLight position={[0, 0.8, 1.2]} intensity={1.8} distance={3.5} color="#e0f2fe" decay={2} />
        <pointLight position={[0, -0.4, -0.8]} intensity={1.0} distance={3.0} color="#bae6fd" decay={2} />

        {/* GLTF Parts */}
        {Object.keys(nodes).map((key) => {
          const node = nodes[key];
          if (node.type !== 'Mesh') return null;

          const material =
            materials[
              Object.keys(materials).find(
                (m) => materials[m].name === (node.material as THREE.Material).name
              ) || ''
            ] || node.material;

          return (
            <ArgoNode
              key={key}
              nodeName={key}
              geometry={node.geometry}
              material={material}
              position={[node.position.x, node.position.y, node.position.z]}
              rotation={[node.rotation.x, node.rotation.y, node.rotation.z]}
            />
          );
        })}
      </group>
    </group>
  );
}

useGLTF.preload('/glider/argo_float.glb');
