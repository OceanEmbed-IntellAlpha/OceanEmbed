'use client';

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function SubmersibleSpotlight({ currentDepth }: { currentDepth: number }) {
  const { camera } = useThree();
  const leftLightRef = useRef<THREE.SpotLight>(null!);
  const rightLightRef = useRef<THREE.SpotLight>(null!);
  const targetRef = useRef<THREE.Object3D>(null!);

  useFrame((_, delta) => {
    // Only activate below 120m, ramping up to full intensity in twilight & midnight zones
    const targetIntensity = currentDepth > 120 ? Math.min(4.5, (currentDepth - 120) * 0.025) : 0.0;

    if (leftLightRef.current && rightLightRef.current && targetRef.current) {
      leftLightRef.current.intensity = THREE.MathUtils.lerp(leftLightRef.current.intensity, targetIntensity, delta * 3.0);
      rightLightRef.current.intensity = THREE.MathUtils.lerp(rightLightRef.current.intensity, targetIntensity, delta * 3.0);

      // Position target 20 units forward along camera look vector
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      targetRef.current.position.copy(camera.position).addScaledVector(forward, 25);

      // Offset twin spotlights to the left and right of the camera (ROV frame mount)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      leftLightRef.current.position.copy(camera.position).addScaledVector(right, -1.8);
      rightLightRef.current.position.copy(camera.position).addScaledVector(right, 1.8);
    }
  });

  return (
    <>
      <object3D ref={targetRef} />
      <spotLight
        ref={leftLightRef}
        color="#e0f2fe"
        angle={Math.PI / 6}
        penumbra={0.7}
        distance={45}
        decay={1.8}
        target={targetRef.current}
      />
      <spotLight
        ref={rightLightRef}
        color="#e0f2fe"
        angle={Math.PI / 6}
        penumbra={0.7}
        distance={45}
        decay={1.8}
        target={targetRef.current}
      />
    </>
  );
}
