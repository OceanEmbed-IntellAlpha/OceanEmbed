'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface ArgoModelProps {
  progress: number; // 0 to 1 indicating scroll progress for this model
  isActive: boolean;
}

function Callout({ 
  position, 
  label, 
  lineDirection = 'bottom',
  delay = 0,
  isActive
}: { position: [number, number, number], label: string, lineDirection?: 'top' | 'bottom' | 'left' | 'right', delay?: number, isActive: boolean }) {
  const lineClasses = {
    bottom: "w-[1px] h-12 bg-gradient-to-t from-thermocline/60 group-hover:from-biolume/60 to-transparent",
    top: "w-[1px] h-12 bg-gradient-to-b from-thermocline/60 group-hover:from-biolume/60 to-transparent",
    left: "h-[1px] w-12 bg-gradient-to-r from-thermocline/60 group-hover:from-biolume/60 to-transparent",
    right: "h-[1px] w-12 bg-gradient-to-l from-thermocline/60 group-hover:from-biolume/60 to-transparent"
  };

  return (
    <Html position={position} center className={`transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className={`flex items-center group cursor-default ${lineDirection === 'bottom' ? 'flex-col-reverse' : lineDirection === 'top' ? 'flex-col' : lineDirection === 'left' ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={lineClasses[lineDirection]} />
        <div className="px-3 py-1 bg-deep-panel/80 backdrop-blur-md border border-thermocline/40 rounded-sm group-hover:border-biolume/60 transition-colors shadow-lg">
          <p className="font-ui text-[9px] font-semibold tracking-[0.2em] text-foam group-hover:text-biolume transition-colors uppercase whitespace-nowrap">
            {label}
          </p>
        </div>
      </div>
    </Html>
  );
}

export function ArgoModel({ progress, isActive }: ArgoModelProps) {
  const { scene } = useGLTF('/device-viewer/argo_float.glb');
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  // Smoothly interpolate rotation to target
  const targetRotation = useRef(new THREE.Euler(0, 0, 0));

  useEffect(() => {
    if (clicked) {
      // Focus rotation: face camera
      targetRotation.current.set(0, 0, 0);
    }
  }, [clicked]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    if (!clicked) {
      // Slow cinematic rotation when not clicked
      groupRef.current.rotation.y += delta * 0.15;
    } else {
      // Slerp to target rotation if clicked
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.current.y, delta * 3);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.current.x, delta * 3);
    }
    
    // Float gently up and down
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.1 - 1;
  });

  return (
    <group ref={groupRef} dispose={null} scale={1.8}>
      <primitive
        object={scene}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e: any) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e: any) => {
          e.stopPropagation();
          setClicked(!clicked);
        }}
      />
      
      {/* Dynamic lighting boost on hover for instrument discovery */}
      <ambientLight intensity={hovered ? 0.8 : 0.3} />
      <directionalLight position={[0, 5, 5]} intensity={hovered ? 1.5 : 0} color="#4CE0D2" />
      
      {/* Spec Callouts: PROFILE, PRESSURE, TEMPERATURE, SALINITY, POSITION */}
      <Callout position={[0, 2.5, 0]} label="TEMPERATURE" lineDirection="top" delay={0} isActive={isActive} />
      <Callout position={[0, 1.5, 1.2]} label="SALINITY" lineDirection="right" delay={100} isActive={isActive} />
      <Callout position={[0, 0.5, -1.2]} label="PROFILE" lineDirection="left" delay={200} isActive={isActive} />
      <Callout position={[0, -1.0, 1.0]} label="PRESSURE" lineDirection="right" delay={300} isActive={isActive} />
      <Callout position={[0, -2.0, 0]} label="POSITION" lineDirection="bottom" delay={400} isActive={isActive} />

      {/* Floating Data Panel on Hover/Click */}
      <Html position={[2, 1, 0]} className={`transition-all duration-500 pointer-events-none ${hovered || clicked ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
        <div className="bg-[#0a111a]/95 backdrop-blur-xl border border-thermocline/30 p-4 rounded-md shadow-2xl w-48 flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-thermocline/20 pb-2">
             <div className="w-2 h-2 rounded-full bg-biolume animate-pulse" />
             <span className="font-mono text-[10px] text-foam tracking-widest uppercase">ARGO STATUS</span>
          </div>
          <div className="flex flex-col gap-1">
             <span className="font-mono text-[9px] text-foam-dim uppercase">Current Depth</span>
             <span className="font-mono text-xs text-instrument-amber">1000m (Park)</span>
          </div>
          <div className="flex flex-col gap-1">
             <span className="font-mono text-[9px] text-foam-dim uppercase">Next Profile</span>
             <span className="font-mono text-xs text-biolume">in 48 hours</span>
          </div>
        </div>
      </Html>

    </group>
  );
}

useGLTF.preload('/device-viewer/argo_float.glb');

