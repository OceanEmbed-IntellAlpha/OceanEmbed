import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import { useArgoStore } from './useArgoStore';

export function CameraController() {
  const controlsRef = useRef<CameraControls>(null);
  useThree();
  const focusedComponent = useArgoStore(s => s.focusedComponent);
  const viewMode = useArgoStore(s => s.viewMode);
  const selectedSystem = useArgoStore(s => s.selectedSystem);

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    // Smooth transition settings
    controls.smoothTime = 0.4;
    controls.draggingSmoothTime = 0.2;

    if (focusedComponent) {
      const pos = useArgoStore.getState().focusedComponentPos;
      if (pos) {
        // Zoom into component
        controls.setLookAt(
          pos[0] + 0.8, pos[1] + 0.5, pos[2] + 0.8, // camera position
          pos[0], pos[1], pos[2],                   // target position
          true                                      // smooth animation
        );
      }
    } else {
      // Return to default view based on mode
      switch (viewMode as any) {
        case 'cutaway':
        case 'INSIDE':
          if (selectedSystem === 'SENSORS') controls.setLookAt(0, 1.2, 4.5, 0, 1.1, 0, true);
          else if (selectedSystem === 'COMMUNICATION') controls.setLookAt(0, 1.5, 4.5, 0, 1.3, 0, true);
          else controls.setLookAt(0, 0.8, 4.5, 0, 0.5, 0, true);
          break;
        case 'exploded':
          controls.setLookAt(-1.75, 1.15, 4.8, 0, 0.45, 0, true);
          break;
        case 'mission':
        case 'SENSORS':
        case 'MISSION':
          // Mission & Sensors modes are handled dynamically in useFrame
          break;
        default:
          // Default Explore View - Moved closer for a larger initial appearance
          controls.setLookAt(-1.2, 0.8, 1.8, 0, 0.5, 0, true);
          break;
      }
    }
  }, [focusedComponent, viewMode, selectedSystem]);

  // Cinematic Tracking for Mission Mode
  useFrame(() => {
    if ((viewMode === 'mission' || (viewMode as any) === 'MISSION' || (viewMode as any) === 'SENSORS') && controlsRef.current && !focusedComponent) {
      const { missionTime, currentDepth } = useArgoStore.getState();
      
      // Calculate float's real-time position
      const targetY = -(currentDepth / 500);
      const targetX = (missionTime - 0.5) * 3;
      
      if ((viewMode as any) === 'mission' || (viewMode as any) === 'MISSION') {
        // Dynamic camera offset (Natural side view)
        const camX = targetX + 1.2;
        const camY = targetY + 0.3;
        const camZ = 3.5;
        
        controlsRef.current.setLookAt(
          camX, camY, camZ,
          targetX, targetY - 0.2, 0,
          true 
        );
      } else if ((viewMode as any) === 'SENSORS') {
        // Heroic angle capturing the top half and sensors
        const camX = targetX - 1.2;
        const camY = targetY + 1.5;
        const camZ = 2.2;
        
        controlsRef.current.setLookAt(
          camX, camY, camZ,
          targetX, targetY + 0.6, 0,
          true
        );
      }
    }
  });

  return (
    <CameraControls 
      ref={controlsRef} 
      makeDefault 
      minDistance={0.5} 
      maxDistance={8} 
      maxPolarAngle={Math.PI / 1.5}
    />
  );
}
