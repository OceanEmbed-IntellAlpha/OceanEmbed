'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function SubmersibleSpotlight({ currentDepth }: { currentDepth: number }) {
  const { camera } = useThree();
  const leftLightRef = useRef<THREE.SpotLight>(null!);
  const rightLightRef = useRef<THREE.SpotLight>(null!);

  // Stable target instance so light.target is never null or undefined during render
  const target = useMemo(() => new THREE.Object3D(), []);
  const forwardVec = useMemo(() => new THREE.Vector3(), []);
  const rightVec = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (leftLightRef.current) leftLightRef.current.target = target;
    if (rightLightRef.current) rightLightRef.current.target = target;
  }, [target]);

  useFrame((_, delta) => {
    // Only activate below 120m, ramping up to full intensity in twilight & midnight zones
    const targetIntensity = currentDepth > 120 ? Math.min(4.5, (currentDepth - 120) * 0.025) : 0.0;

    if (leftLightRef.current && rightLightRef.current) {
      leftLightRef.current.intensity = THREE.MathUtils.lerp(leftLightRef.current.intensity, targetIntensity, delta * 3.0);
      rightLightRef.current.intensity = THREE.MathUtils.lerp(rightLightRef.current.intensity, targetIntensity, delta * 3.0);

      // Position target 25 units forward along camera look vector
      forwardVec.set(0, 0, -1).applyQuaternion(camera.quaternion);
      target.position.copy(camera.position).addScaledVector(forwardVec, 25);
      target.updateMatrixWorld();

      // Offset twin spotlights to the left and right of the camera (ROV frame mount)
      rightVec.set(1, 0, 0).applyQuaternion(camera.quaternion);
      leftLightRef.current.position.copy(camera.position).addScaledVector(rightVec, -1.8);
      rightLightRef.current.position.copy(camera.position).addScaledVector(rightVec, 1.8);
    }
  });

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={leftLightRef}
        color="#e0f2fe"
        angle={Math.PI / 6}
        penumbra={0.7}
        distance={45}
        decay={1.8}
        target={target}
      />
      <spotLight
        ref={rightLightRef}
        color="#e0f2fe"
        angle={Math.PI / 6}
        penumbra={0.7}
        distance={45}
        decay={1.8}
        target={target}
      />
    </>
  );
}

