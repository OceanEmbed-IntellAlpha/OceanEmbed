'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, PresentationControls } from '@react-three/drei';
import { ArgoModel } from './ArgoModel';
import { GliderModel } from './GliderModel';

interface InstrumentsSceneProps {
  progress: number;
}

export function InstrumentsScene({ progress }: InstrumentsSceneProps) {
  // progress goes from 0 to 1 across the pinned scroll duration.

  return (
    <div className="w-full h-full absolute inset-0 z-0 pointer-events-auto">
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={35} />
        
        {/* Cinematic Lighting Setup */}
        <ambientLight intensity={0.1} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-5, 5, -5]} intensity={0.8} color="#4CE0D2" />
        
        <Environment preset="city" environmentIntensity={0.2} />

        <Suspense fallback={null}>
          <PresentationControls
            global
            config={{ mass: 2, tension: 500 }}
            snap={{ mass: 4, tension: 1500 }}
            rotation={[0, 0, 0]}
            polar={[-Math.PI / 4, Math.PI / 4]}
            azimuth={[-Math.PI / 2, Math.PI / 2]}
          >
            <SceneController progress={progress} />
          </PresentationControls>
        </Suspense>
      </Canvas>
    </div>
  );
}

// SceneController handles the horizontal slide based on scroll progress
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

function SceneController({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // The distance between instruments in the 3D world
  const trackDistance = 15; 
  
  useFrame(() => {
    if (groupRef.current) {
      // Create a plateau effect so models stay centered longer
      let easedProgress = 0;
      
      // 0.0 to 0.3: Argo is stationary
      // 0.3 to 0.7: Slide from Argo to Glider
      // 0.7 to 1.0: Glider is stationary
      if (progress > 0.3 && progress < 0.7) {
        // Map 0.3 - 0.7 to 0.0 - 1.0
        const p = (progress - 0.3) / 0.4;
        // Smoothstep easing for cinematic slide
        easedProgress = p * p * (3 - 2 * p);
      } else if (progress >= 0.7) {
        easedProgress = 1;
      }
      
      const targetX = -easedProgress * trackDistance;
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.08);
    }
  });

  // Calculate local progress for animations inside the models
  const argoProgress = Math.min(1, progress * 2);
  const gliderProgress = Math.max(0, (progress - 0.5) * 2);

  return (
    <group ref={groupRef}>
      <group position={[0, 0, 0]}>
        <ArgoModel progress={argoProgress} isActive={progress < 0.5} />
      </group>
      
      <group position={[trackDistance, 0, 0]}>
        <GliderModel progress={gliderProgress} isActive={progress >= 0.5} />
      </group>
    </group>
  );
}
