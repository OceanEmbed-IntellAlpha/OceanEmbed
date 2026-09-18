'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

interface GliderModelProps {
  progress: number;
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

export function GliderModel({ progress, isActive }: GliderModelProps) {
  const { scene } = useGLTF('/device-viewer/glider3.glb');
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const targetRotation = useRef(new THREE.Euler(0, 0, 0));

  useEffect(() => {
    if (clicked) {
      targetRotation.current.set(0, 0, 0);
    }
  }, [clicked]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    if (!clicked) {
      groupRef.current.rotation.y -= delta * 0.1;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.05 - 0.1;
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.current.y, delta * 3);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.current.x, delta * 3);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotation.current.z, delta * 3);
    }
    
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.15 - 0.5;
  });

  return (
    <group ref={groupRef} dispose={null} scale={1.2} position={[0, -0.5, 0]}>
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
      
      <ambientLight intensity={hovered ? 0.8 : 0.3} />
      <directionalLight position={[0, 5, 5]} intensity={hovered ? 1.5 : 0} color="#E8A33D" />

      {isActive && (
        <mesh position={[-4, 0, 0]}>
          <tubeGeometry 
            args={[
              new THREE.CatmullRomCurve3([
                new THREE.Vector3(-5, 2, -2),
                new THREE.Vector3(-2, 0, -1),
                new THREE.Vector3(0, -0.5, 0),
                new THREE.Vector3(2, -1, 1),
                new THREE.Vector3(5, -2, 2)
              ]),
              64, 0.02, 8, false
            ]} 
          />
          <meshBasicMaterial color="#4CE0D2" transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* Spec Callouts: TRAJECTORY, DEPTH, TEMPERATURE, SALINITY, MISSION PATH */}
      <Callout position={[0, 1.5, 0]} label="TRAJECTORY" lineDirection="top" delay={0} isActive={isActive} />
      <Callout position={[2, 0.5, 1]} label="DEPTH" lineDirection="right" delay={100} isActive={isActive} />
      <Callout position={[-2, 0.5, -1]} label="TEMPERATURE" lineDirection="left" delay={200} isActive={isActive} />
      <Callout position={[0, -1.0, 1.5]} label="SALINITY" lineDirection="right" delay={300} isActive={isActive} />
      <Callout position={[0, -2.5, 0]} label="MISSION PATH" lineDirection="bottom" delay={400} isActive={isActive} />

      {/* Floating Data Panel */}
      <Html position={[3, 1, 0]} className={`transition-all duration-500 pointer-events-none ${hovered || clicked ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
        <div className="bg-[#0a111a]/95 backdrop-blur-xl border border-thermocline/30 p-4 rounded-md shadow-2xl w-48 flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-thermocline/20 pb-2">
             <div className="w-2 h-2 rounded-full bg-instrument-amber animate-pulse" />
             <span className="font-mono text-[10px] text-foam tracking-widest uppercase">GLIDER STATUS</span>
          </div>
          <div className="flex flex-col gap-1">
             <span className="font-mono text-[9px] text-foam-dim uppercase">Current Heading</span>
             <span className="font-mono text-xs text-biolume">274° W</span>
          </div>
          <div className="flex flex-col gap-1">
             <span className="font-mono text-[9px] text-foam-dim uppercase">Mission Progress</span>
             <span className="font-mono text-xs text-instrument-amber">42% (Leg 3)</span>
          </div>
        </div>
      </Html>

    </group>
  );
}

useGLTF.preload('/device-viewer/glider3.glb');
