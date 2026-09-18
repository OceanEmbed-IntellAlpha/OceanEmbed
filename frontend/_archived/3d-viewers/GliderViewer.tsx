'use client';

import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { GliderModel } from './GliderModel';
import { GliderOceanEnvironment } from './GliderOceanEnvironment';
import { GliderStudioEnvironment } from './GliderStudioEnvironment';
import { GliderLabels } from './GliderLabels';
import GliderUI from './GliderUI';
import { useGliderStore } from './useGliderStore';
import { GLIDER_TRAJECTORY_CURVE } from './useGliderMission';

interface GliderViewerProps {
  gliderId?: string;
}

// Calibrated Camera Perspectives
const MISSION_WIDE_POS = new THREE.Vector3(0, 0.15, 9.2);
const MISSION_WIDE_TARGET = new THREE.Vector3(0, -0.25, 0);

const CAD_NOMINAL_POS = new THREE.Vector3(1.35, 0.95, 3.8);
const CAD_EXPLODED_POS = new THREE.Vector3(1.85, 1.45, 5.0);
const CAD_TARGET = new THREE.Vector3(0, 0, 0);

function GliderCameraController() {
  const cameraMode = useGliderStore((s) => s.cameraMode);
  const viewMode = useGliderStore((s) => s.viewMode);
  const missionTime = useGliderStore((s) => s.missionTime);
  const cameraResetTrigger = useGliderStore((s) => s.cameraResetTrigger);

  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Transition state
  const isTransitioningRef = useRef(false);
  const transitionProgressRef = useRef(1);
  const startPosRef = useRef(new THREE.Vector3());
  const startTargetRef = useRef(new THREE.Vector3());
  const destPosRef = useRef(new THREE.Vector3().copy(CAD_NOMINAL_POS));
  const destTargetRef = useRef(new THREE.Vector3().copy(CAD_TARGET));

  // Trigger smooth camera transitions whenever viewMode, cameraMode, or reset trigger changes
  useEffect(() => {
    let targetPos: THREE.Vector3;
    let targetLookAt: THREE.Vector3;

    if (viewMode === 'mission') {
      if (cameraMode === 'wide') {
        targetPos = MISSION_WIDE_POS;
        targetLookAt = MISSION_WIDE_TARGET;
      } else {
        // In chase mode, useFrame takes over continuous tracking
        isTransitioningRef.current = false;
        return;
      }
    } else if (viewMode === 'exploded') {
      targetPos = CAD_EXPLODED_POS;
      targetLookAt = CAD_TARGET;
    } else {
      targetPos = CAD_NOMINAL_POS;
      targetLookAt = CAD_TARGET;
    }

    startPosRef.current.copy(camera.position);
    startTargetRef.current.copy(
      controlsRef.current ? controlsRef.current.target : targetLookAt
    );
    destPosRef.current.copy(targetPos);
    destTargetRef.current.copy(targetLookAt);

    transitionProgressRef.current = 0;
    isTransitioningRef.current = true;
  }, [viewMode, cameraMode, cameraResetTrigger, camera]);

  useFrame((_, delta) => {
    if (viewMode === 'mission' && cameraMode === 'chase') {
      // 1. Dynamic 3D Chase camera: follow the vehicle along sawtooth trajectory
      const prog = Math.max(0, Math.min(0.999, missionTime));
      const pos = GLIDER_TRAJECTORY_CURVE.getPointAt(prog);
      const tangent = GLIDER_TRAJECTORY_CURVE.getTangentAt(prog).normalize();

      const forwardAxis = new THREE.Vector3(1, 0, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(forwardAxis, tangent);

      const chaseOffset = new THREE.Vector3(-1.8, 0.65, 1.4).applyQuaternion(quat);
      camera.position.lerp(pos.clone().add(chaseOffset), 0.08);

      if (controlsRef.current) {
        controlsRef.current.target.lerp(pos, 0.1);
        controlsRef.current.update();
      }
    } else if (isTransitioningRef.current) {
      // 2. Smooth cinematic easing transition to wide/calibrated camera position
      transitionProgressRef.current = Math.min(
        1,
        transitionProgressRef.current + delta * 2.2
      );

      // Cubic ease-out curve
      const t = 1 - Math.pow(1 - transitionProgressRef.current, 3);

      camera.position.lerpVectors(startPosRef.current, destPosRef.current, t);

      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(
          startTargetRef.current,
          destTargetRef.current,
          t
        );
        controlsRef.current.update();
      }

      if (transitionProgressRef.current >= 1) {
        isTransitioningRef.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      minDistance={1.0}
      maxDistance={25.0}
      target={viewMode === 'mission' ? [0, -0.25, 0] : [0, 0, 0]}
    />
  );
}

export default function GliderViewer({ gliderId = 'GLIDER-INCOIS-04' }: GliderViewerProps) {
  const viewMode = useGliderStore((s) => s.viewMode);

  return (
    <div className="w-full h-full relative bg-[#020b14] select-none overflow-hidden font-ui">
      {/* Sleek engineering coordinate grid overlay in CAD Studio views */}
      {viewMode !== 'mission' && (
        <div
          className="absolute inset-0 pointer-events-none z-[1] opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(76, 224, 210, 0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(76, 224, 210, 0.06) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
      )}

      {/* HUD Telemetry & Mission Overlay */}
      <GliderUI gliderId={gliderId} />

      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [1.35, 0.95, 3.8], fov: 44, near: 0.1, far: 60 }}
        gl={{ localClippingEnabled: true, antialias: true }}
        className="w-full h-full outline-none cursor-grab active:cursor-grabbing"
      >
        <Suspense fallback={null}>
          {/* 1. Conditional Environment: Ocean Water ONLY in Mission Mode; CAD Studio in Inspection Views */}
          {viewMode === 'mission' ? (
            <GliderOceanEnvironment />
          ) : (
            <GliderStudioEnvironment />
          )}

          {/* 2. Slocum Glider 3D Model with 100% GLB Part Retention (58 Meshes) */}
          <GliderModel scale={1.2} />

          {/* 3. Interactive 3D Component Labels with Leader Badges */}
          <GliderLabels scale={1.2} />
        </Suspense>

        {/* 5. Smooth Camera Controller (Chase vs Wide Orbit) */}
        <GliderCameraController />
      </Canvas>
    </div>
  );
}
