'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGliderStore } from './useGliderStore';
import { GLIDER_TRAJECTORY_CURVE } from './useGliderMission';
import { GliderPropellerWake } from './GliderPropellerWake';

// CAD section clipping plane for Cutaway architecture
const HULL_CUT_PLANE = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.015);

// Reference CAD Explosion Vectors (modular separation along precision axes)
const EXPLOSION_OFFSETS: Record<string, THREE.Vector3> = {
  // Exterior Modules (Disassembled outward from longitudinal centerline)
  Hull_Nose: new THREE.Vector3(1.35, 0, 0),
  Nose_Cap: new THREE.Vector3(1.48, 0, 0),
  CTD_Sensor_Suite: new THREE.Vector3(0.72, 0.05, 0),
  Pressure_Port: new THREE.Vector3(0.42, 0.38, 0.10),
  Fin_Left: new THREE.Vector3(0, 0, 1.25),
  Wing_Spar_Left: new THREE.Vector3(0, 0, 0.70),
  Fin_Right: new THREE.Vector3(0, 0, -1.25),
  Wing_Spar_Right: new THREE.Vector3(0, 0, -0.70),
  Lifting_Recovery_Bail: new THREE.Vector3(0, -0.65, 0),
  Hull_Rear: new THREE.Vector3(-1.10, 0, 0),
  Rear_Cap: new THREE.Vector3(-1.24, 0, 0),
  Propeller_Assembly: new THREE.Vector3(-2.10, 0, 0),
  Fin_Top: new THREE.Vector3(-0.35, 0.75, 0),
  Rudder_Tail_Fin: new THREE.Vector3(-0.35, 0.75, 0),
  GPS_Iridium_Antenna_Mast: new THREE.Vector3(-0.35, 1.35, 0),
  Antenna_Tip: new THREE.Vector3(-0.35, 1.50, 0),
  Control_Aileron_Left: new THREE.Vector3(-0.30, 0, 0.40),
  Control_Aileron_Right: new THREE.Vector3(-0.30, 0, -0.40),
  Fin_Bottom: new THREE.Vector3(-0.25, -0.65, 0),

  // Internal Payload Bays (Separated into tiered inspection bays)
  Battery_System: new THREE.Vector3(0, 0.75, 0),
  Buoyancy_System: new THREE.Vector3(0.15, -0.80, 0),
  Electronics_System: new THREE.Vector3(-0.30, -0.70, 0.35),
  Propulsion_System: new THREE.Vector3(-1.10, 0, 0),
};

export function GliderModel(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF('/glider/glider3.glb');

  const viewMode = useGliderStore((s) => s.viewMode);
  const missionTime = useGliderStore((s) => s.missionTime);
  const telemetry = useGliderStore((s) => s.telemetry);
  const missionStage = useGliderStore((s) => s.missionStage);
  const selectedPart = useGliderStore((s) => s.selectedPart);
  const hoveredPart = useGliderStore((s) => s.hoveredPart);
  const setSelectedPart = useGliderStore((s) => s.setSelectedPart);
  const setHoveredPart = useGliderStore((s) => s.setHoveredPart);

  const rootRef = useRef<THREE.Group>(null!);
  const satelliteGroupRef = useRef<THREE.Group>(null!);

  const isMission = viewMode === 'mission';
  const isCutaway = viewMode === 'cutaway';
  const isExploded = viewMode === 'exploded';

  // Map to record nominal original transforms of all 101 nodes in the GLB
  const originalPositions = useMemo(() => new Map<string, THREE.Vector3>(), []);

  // Pre-allocated scratch objects for 60fps zero-allocation kinematics
  const forwardAxis = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const rollAxis = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const alignQuat = useMemo(() => new THREE.Quaternion(), []);
  const rollQuat = useMemo(() => new THREE.Quaternion(), []);
  const scratchTargetPos = useMemo(() => new THREE.Vector3(), []);
  const zeroVector = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const zeroQuat = useMemo(() => new THREE.Quaternion(), []);

  // Clone scene, cache node map and mesh list once at mount (eliminates per-frame traverse)
  const { clonedScene, nodeMap, meshList } = useMemo(() => {
    const cloned = scene.clone(true);
    const nMap = new Map<string, THREE.Object3D>();
    const mList: THREE.Mesh[] = [];

    cloned.traverse((obj) => {
      if (obj.name) {
        originalPositions.set(obj.name, obj.position.clone());
        nMap.set(obj.name, obj);
      }

      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mList.push(mesh);
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((m) => {
              const clonedMat = m.clone() as THREE.MeshStandardMaterial;
              if ('roughness' in clonedMat) {
                clonedMat.roughness = Math.max(clonedMat.roughness ?? 0.3, 0.25);
              }
              return clonedMat;
            });
          } else {
            const clonedMat = mesh.material.clone() as THREE.MeshStandardMaterial;
            if ('roughness' in clonedMat) {
              clonedMat.roughness = Math.max(clonedMat.roughness ?? 0.3, 0.25);
            }
            mesh.material = clonedMat;
          }
        }
      }
    });

    return { clonedScene: cloned, nodeMap: nMap, meshList: mList };
  }, [scene, originalPositions]);

  // Reactive emissive highlighting on hover / selection (Runs ONLY on state change, not per-frame)
  useEffect(() => {
    if (!meshList.length) return;
    for (let i = 0; i < meshList.length; i++) {
      const mesh = meshList[i];
      const isTarget =
        mesh.name === selectedPart ||
        mesh.name === hoveredPart ||
        (mesh.parent && (mesh.parent.name === selectedPart || mesh.parent.name === hoveredPart));

      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.emissive) {
        if (isTarget) {
          if (!mesh.userData.origEmissive) {
            mesh.userData.origEmissive = mat.emissive.clone();
          }
          mat.emissive.set('#38d9f5');
          mat.emissiveIntensity = 0.6;
        } else if (mesh.userData.origEmissive) {
          mat.emissive.copy(mesh.userData.origEmissive);
          mat.emissiveIntensity = 0.0;
        }
      }
    }
  }, [meshList, selectedPart, hoveredPart]);

  // View Mode Orchestration (Cutaway clipping, Interior vs Exterior visibility)
  useEffect(() => {
    if (!clonedScene) return;

    const interiorGroup = clonedScene.getObjectByName('Interior');
    const exteriorGroup = clonedScene.getObjectByName('Exterior');
    const propellerAssembly = clonedScene.getObjectByName('Propeller_Assembly');
    const hullMain = clonedScene.getObjectByName('Hull_Main') as THREE.Mesh | undefined;

    // Exterior assembly & Propeller are always visible across all views
    if (exteriorGroup) exteriorGroup.visible = true;
    if (propellerAssembly) propellerAssembly.visible = true;

    if (isCutaway || isExploded) {
      // Reveal internal chassis, battery, buoyancy bladders, avionics, motor
      if (interiorGroup) interiorGroup.visible = true;

      // Apply CAD section cutaway to Hull_Main to reveal interior
      if (hullMain && hullMain.material) {
        const mat = hullMain.material as THREE.MeshStandardMaterial;
        mat.clippingPlanes = [HULL_CUT_PLANE];
        mat.clipShadows = true;
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
      }
    } else {
      // Exterior and Mission mode: Interior sealed inside hull
      if (interiorGroup) interiorGroup.visible = false;

      // Close hull cutaway clipping
      if (hullMain && hullMain.material) {
        const mat = hullMain.material as THREE.MeshStandardMaterial;
        mat.clippingPlanes = null;
        mat.side = THREE.FrontSide;
        mat.needsUpdate = true;
      }
    }
  }, [clonedScene, isCutaway, isExploded]);

  // Per-frame physics, flight kinematics, and smooth CAD explosion interpolation
  useFrame((state, delta) => {
    if (!rootRef.current || !clonedScene) return;

    const propAxis = nodeMap.get('PROP_ROTATION_AXIS') || nodeMap.get('Propeller_Hub');
    const batteryGroup = nodeMap.get('Battery_System') || nodeMap.get('Battery_Main');

    // 1. Mission Hydrodynamic Flight Simulation
    if (isMission) {
      const prog = Math.max(0, Math.min(0.999, missionTime));
      const pos = GLIDER_TRAJECTORY_CURVE.getPointAt(prog);
      const tangent = GLIDER_TRAJECTORY_CURVE.getTangentAt(prog).normalize();

      // Lerp root along 3D trajectory curve
      rootRef.current.position.lerp(pos, 0.2);

      // Align nose with trajectory tangent
      alignQuat.setFromUnitVectors(forwardAxis, tangent);

      // Hydrodynamic wing roll sway
      const rollAngle = Math.sin(state.clock.getElapsedTime() * 1.5) * 0.04;
      rollQuat.setFromAxisAngle(rollAxis, rollAngle);
      alignQuat.multiply(rollQuat);

      rootRef.current.quaternion.slerp(alignQuat, 0.16);

      // Propeller spin during propulsion phases
      if (propAxis && missionStage.motorRunning) {
        propAxis.rotation.x += delta * 28;
      }

      // Battery Mass Shifter Kinematics (+75mm dive trim, -80mm climb trim)
      if (batteryGroup) {
        const origX = originalPositions.get(batteryGroup.name)?.x ?? 0;
        const targetShiftX = origX + (telemetry.batteryShiftMM / 75) * 0.08;
        batteryGroup.position.x = THREE.MathUtils.damp(batteryGroup.position.x, targetShiftX, 3.5, delta);
      }

      // Ensure all other objects return smoothly to their nominal positions
      originalPositions.forEach((origPos, name) => {
        if (name !== 'Battery_System' && name !== 'Battery_Main' && name !== 'PROP_ROTATION_AXIS') {
          const obj = nodeMap.get(name);
          if (obj) {
            obj.position.lerp(origPos, 0.2);
          }
        }
      });

      // Surfaced Antenna Transmission Rings
      if (satelliteGroupRef.current) {
        const isSurfaced = prog < 0.14 || prog > 0.88;
        satelliteGroupRef.current.visible = isSurfaced;
        if (isSurfaced) {
          const t = state.clock.getElapsedTime();
          satelliteGroupRef.current.children.forEach((ring, idx) => {
            const p = (t * 1.8 + idx * 0.25) % 1.0;
            ring.scale.setScalar(0.4 + p * 2.5);
            (ring as THREE.Mesh).material = new THREE.MeshBasicMaterial({
              color: '#f59e0b',
              side: THREE.DoubleSide,
              transparent: true,
              opacity: Math.max(0, 0.8 - p * 0.8),
            });
          });
        }
      }
    } else {
      // 2. CAD Studio Inspection Modes (Exterior, Cutaway, Exploded)
      rootRef.current.position.lerp(zeroVector, 0.12);
      rootRef.current.quaternion.slerp(zeroQuat, 0.12);

      if (satelliteGroupRef.current) {
        satelliteGroupRef.current.visible = false;
      }

      // Gentle calm buoyancy floating swell
      const t = state.clock.getElapsedTime();
      clonedScene.position.y = Math.sin(t * 0.5) * 0.02;
      clonedScene.rotation.z = Math.sin(t * 0.4) * 0.01;

      // Slow propeller rotation in CAD mode if propulsion system is examined
      if (propAxis && (selectedPart === 'Propulsion_System' || selectedPart === 'Propeller_Assembly')) {
        propAxis.rotation.x += delta * 6;
      }

      // CAD Explosion interpolation using direct nodeMap lookups
      originalPositions.forEach((origPos, name) => {
        const obj = nodeMap.get(name);
        if (!obj) return;

        if (isExploded) {
          const offset = EXPLOSION_OFFSETS[name];
          if (offset) {
            scratchTargetPos.copy(origPos).addScaledVector(offset, 0.85);
            obj.position.lerp(scratchTargetPos, 0.15);
          } else {
            obj.position.lerp(origPos, 0.15);
          }
        } else {
          obj.position.lerp(origPos, 0.15);
        }
      });
    }
  });

  // Pointer interaction handlers
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.object?.name) {
      setHoveredPart(e.object.name);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredPart(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.object?.name) {
      setSelectedPart(selectedPart === e.object.name ? null : e.object.name);
    }
  };

  return (
    <group ref={rootRef} {...props}>
      <primitive
        object={clonedScene}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />

      {/* Real Motor Propeller Cavitation Wake & Helical Bubbles */}
      <GliderPropellerWake
        active={isMission && missionStage.motorRunning}
        position={[-1.18, 0, 0]}
      />

      {/* Satellite pulse rings (Surfaced transmission in Mission mode) */}
      <group ref={satelliteGroupRef} position={[-0.8, 1.25, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.08 + i * 0.12, 0.095 + i * 0.12, 32]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

useGLTF.preload('/glider/glider3.glb');
