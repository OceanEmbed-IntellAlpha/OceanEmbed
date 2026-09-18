'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useArgoStore } from './useArgoStore';
import { ARGO_CORE_PARTS, ArgoPartInfo } from '@/lib/data/argoRegistry';

// CAD Explosion displacement vectors matching ArgoModel.tsx DUAL_EXPLODED_POSITIONS
const EXPLOSION_OFFSETS: Record<string, THREE.Vector3> = {
  CTD_Sensor_Payload: new THREE.Vector3(1.08, 0, 0),
  Antenna_GPS_Module: new THREE.Vector3(1.11, 0, 0),
  Stability_Collar_1: new THREE.Vector3(1.02, 0, 0),
  Pressure_Hull_Shell: new THREE.Vector3(-0.92, 0, 0),
  Battery_Module_1: new THREE.Vector3(0.88, 0, 0),
  Buoyancy_Bladder: new THREE.Vector3(-1.06, 0, 0),
};

const ZERO_VEC = new THREE.Vector3(0, 0, 0);

interface ArgoPinWithLeaderProps {
  part: ArgoPartInfo;
  isExploded: boolean;
}

function ArgoPinWithLeader({ part, isExploded }: ArgoPinWithLeaderProps) {
  const selectedPart = useArgoStore((s) => s.selectedPart);
  const hoveredPart = useArgoStore((s) => s.hoveredPart);
  const setSelectedPart = useArgoStore((s) => s.setSelectedPart);
  const setHoveredPart = useArgoStore((s) => s.setHoveredPart);

  const isSelected = selectedPart === part.nodeName;
  const isHovered = hoveredPart === part.nodeName;
  const isActive = isSelected || isHovered;

  const currentAnchor = useRef<THREE.Vector3>(new THREE.Vector3(...part.anchor));
  const currentBadge = useRef<THREE.Vector3>(new THREE.Vector3(...part.offset));

  const lineGeoRef = useRef<THREE.BufferGeometry>(null!);
  const dotMeshRef = useRef<THREE.Mesh>(null!);
  const htmlGroupRef = useRef<THREE.Group>(null!);

  // Initial buffer geometry points for the 3D leader line
  const linePositions = useMemo(() => {
    const arr = new Float32Array(6);
    arr[0] = part.anchor[0];
    arr[1] = part.anchor[1];
    arr[2] = part.anchor[2];
    arr[3] = part.offset[0];
    arr[4] = part.offset[1];
    arr[5] = part.offset[2];
    return arr;
  }, [part.anchor, part.offset]);

  useFrame(() => {
    // Dynamic exploded offsets that track moving 3D CAD modules
    const expVec =
      isExploded && part.explosionKey && EXPLOSION_OFFSETS[part.explosionKey]
        ? EXPLOSION_OFFSETS[part.explosionKey].clone().multiplyScalar(0.85)
        : ZERO_VEC;

    const targetAnchor = new THREE.Vector3(...part.anchor).add(expVec);
    const targetBadge = new THREE.Vector3(...part.offset).add(expVec);

    currentAnchor.current.lerp(targetAnchor, 0.15);
    currentBadge.current.lerp(targetBadge, 0.15);

    // Update 3D leader line coordinates
    if (lineGeoRef.current) {
      const posAttr = lineGeoRef.current.attributes.position;
      posAttr.setXYZ(0, currentAnchor.current.x, currentAnchor.current.y, currentAnchor.current.z);
      posAttr.setXYZ(1, currentBadge.current.x, currentBadge.current.y, currentBadge.current.z);
      posAttr.needsUpdate = true;
    }

    // Update anchor dot position on part surface
    if (dotMeshRef.current) {
      dotMeshRef.current.position.copy(currentAnchor.current);
    }

    // Update badge HTML wrapper group position
    if (htmlGroupRef.current) {
      htmlGroupRef.current.position.copy(currentBadge.current);
    }
  });

  return (
    <group>
      {/* 3D Leader Line from Part Surface Anchor to Badge Offset */}
      <line>
        <bufferGeometry ref={lineGeoRef}>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={isActive ? '#38d9f5' : '#64748b'}
          transparent
          opacity={isActive ? 0.95 : 0.45}
          linewidth={isActive ? 2 : 1}
        />
      </line>

      {/* Surface Anchor Dot on Model */}
      <mesh ref={dotMeshRef} position={part.anchor}>
        <sphereGeometry args={[isActive ? 0.026 : 0.018, 12, 12]} />
        <meshBasicMaterial
          color={isActive ? '#38d9f5' : '#94a3b8'}
          transparent
          opacity={isActive ? 1.0 : 0.75}
        />
      </mesh>

      {/* Label Badge at Radial Offset Clearance Position */}
      <group ref={htmlGroupRef} position={part.offset}>
        <Html
          center
          distanceFactor={6.2}
          zIndexRange={[isActive ? 50 : 20, isActive ? 60 : 30]}
          className="select-none pointer-events-auto"
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPart(isSelected ? null : part.nodeName);
            }}
            onMouseEnter={() => setHoveredPart(part.nodeName)}
            onMouseLeave={() => setHoveredPart(null)}
            className={`
              group cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200
              ${
                isActive
                  ? 'bg-[#0f172a]/95 border-cyan-400 text-white shadow-[0_0_16px_rgba(56,189,248,0.5)] scale-105 ring-1 ring-cyan-400/50'
                  : 'bg-[#020b14]/85 border-slate-700/70 text-slate-300 hover:border-cyan-500/60 hover:text-white hover:bg-[#0b1523]/95 shadow-md'
              }
              backdrop-blur-md
            `}
          >
            {/* Number Beacon */}
            <span
              className={`
                w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-bold transition-colors shrink-0
                ${
                  isActive
                    ? 'bg-cyan-400 text-slate-950 font-extrabold shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                    : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-cyan-300'
                }
              `}
            >
              {part.pinNum}
            </span>

            {/* Shortened High-Visibility Title */}
            <span className="font-mono text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap">
              {part.shortTitle}
            </span>

            {/* Pulsing indicator when active */}
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
            )}
          </div>
        </Html>
      </group>
    </group>
  );
}

export function ArgoLabels({ scale = 1.0 }: { scale?: number }) {
  const showLabels = useArgoStore((s) => s.showLabels);
  const viewMode = useArgoStore((s) => s.viewMode);

  if (!showLabels || viewMode === 'mission') return null;

  const isExploded = viewMode === 'exploded';

  const parts = Object.values(ARGO_CORE_PARTS).filter((p) => {
    if (viewMode === 'exterior') return p.mode === 'exterior';
    if (viewMode === 'cutaway') return true;
    if (viewMode === 'exploded') return true;
    return false;
  });

  return (
    <group scale={scale}>
      {parts.map((part) => (
        <ArgoPinWithLeader key={part.id} part={part} isExploded={isExploded} />
      ))}
    </group>
  );
}
