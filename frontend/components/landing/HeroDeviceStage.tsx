'use client';

import { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ArgoDeviceModel } from './ArgoDeviceModel';
import { GliderDeviceModel } from './GliderDeviceModel';
import { HeroHUDOverlay } from './HeroHUDOverlay';


interface HeroDeviceStageProps {
  onHoverArgo?: (hovered: boolean) => void;
  onHoverGlider?: (hovered: boolean) => void;
}

// ─── Project 3D device positions to 2D screen coordinates ────────────────────

function DevicePositionTracker({
  argoPosition,
  gliderPosition,
  onPositionsUpdate,
}: {
  argoPosition: [number, number, number];
  gliderPosition: [number, number, number];
  onPositionsUpdate: (
    argo: { x: number; y: number },
    glider: { x: number; y: number }
  ) => void;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    camera.updateMatrixWorld();

    // Target the upper collar / antenna base of the Argo Float (facing left card)
    const vArgo = new THREE.Vector3(argoPosition[0] - 0.15, argoPosition[1] + 0.24, argoPosition[2]);
    vArgo.project(camera);
    const argoX = (vArgo.x * 0.5 + 0.5) * size.width;
    const argoY = (-vArgo.y * 0.5 + 0.5) * size.height;

    // Target the right wing root/spar of the Glider (facing right card)
    const vGlider = new THREE.Vector3(gliderPosition[0] + 0.12, gliderPosition[1] + 0.05, gliderPosition[2]);
    vGlider.project(camera);
    const gliderX = (vGlider.x * 0.5 + 0.5) * size.width;
    const gliderY = (-vGlider.y * 0.5 + 0.5) * size.height;

    onPositionsUpdate({ x: argoX, y: argoY }, { x: gliderX, y: gliderY });
  }, [camera, size.width, size.height, argoPosition, gliderPosition, onPositionsUpdate]);

  return null;
}

export default function HeroDeviceStage({
  onHoverArgo: propOnHoverArgo,
  onHoverGlider: propOnHoverGlider,
}: HeroDeviceStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(1400);
  const isModalOpen = false;

  const [argoHovered, setArgoHovered] = useState(false);
  const [gliderHovered, setGliderHovered] = useState(false);

  const [argoPos, setArgoPos] = useState<{ x: number; y: number } | null>(null);
  const [gliderPos, setGliderPos] = useState<{ x: number; y: number } | null>(null);

  const handlePositionsUpdate = useCallback(
    (argo: { x: number; y: number }, glider: { x: number; y: number }) => {
      setArgoPos(argo);
      setGliderPos(glider);
    },
    []
  );

  const handleHoverArgo = useCallback(
    (hovered: boolean) => {
      setArgoHovered(hovered);
      propOnHoverArgo?.(hovered);
    },
    [propOnHoverArgo]
  );

  const handleHoverGlider = useCallback(
    (hovered: boolean) => {
      setGliderHovered(hovered);
      propOnHoverGlider?.(hovered);
    },
    [propOnHoverGlider]
  );

  // Measure screen width for responsive 3D model positioning
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pause render loop when scrolled out of view or modal is open to save battery & GPU
  const shouldAnimate = isVisible && !isModalOpen;

  useEffect(() => {
    if (!containerRef.current) return;
    const targetSection =
      containerRef.current.closest('section') ||
      document.getElementById('hero-section') ||
      containerRef.current.parentElement;

    if (!targetSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '50px 0px 50px 0px', threshold: 0 }
    );
    observer.observe(targetSection);

    const checkVisibility = () => {
      const rect = targetSection.getBoundingClientRect();
      const inView = rect.bottom > -40 && rect.top < window.innerHeight + 40;
      setIsVisible(inView);
    };

    window.addEventListener('scroll', checkVisibility, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', checkVisibility);
    };
  }, []);

  // Responsive device positioning (calibrated for camera z=7.5, fov=38)
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1200;

  const argoPosition: [number, number, number] = isMobile
    ? [-1.2, 0.4, -1.2]
    : isTablet
    ? [-2.2, -0.3, -0.4]
    : [-2.65, -0.35, 0];

  const argoScale = isMobile ? 0.85 : isTablet ? 1.2 : 1.35;

  const gliderPosition: [number, number, number] = isMobile
    ? [1.2, -0.7, -1.2]
    : isTablet
    ? [2.2, -0.25, -0.4]
    : [2.65, -0.25, 0];

  const gliderScale = isMobile ? 0.28 : isTablet ? 0.38 : 0.44;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[3] pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        visibility: shouldAnimate ? 'visible' : 'hidden',
      }}
    >
      <Canvas
        frameloop={shouldAnimate ? 'always' : 'never'}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        camera={{
          position: [0, 0, 7.5],
          fov: 38,
          near: 0.1,
          far: 50,
        }}
        className="pointer-events-auto"
        style={{
          background: 'transparent',
          display: shouldAnimate ? 'block' : 'none',
        }}
      >
        {/* Studio Oceanic Lighting */}
        <ambientLight intensity={1.1} color="#0f2238" />
        <directionalLight position={[3, 6, 5]} intensity={2.4} color="#ffffff" />
        <directionalLight position={[-4, 3, 2]} intensity={1.2} color="#bae6fd" />
        <directionalLight position={[4, -2, 2]} intensity={0.9} color="#fed7aa" />

        <DevicePositionTracker
          argoPosition={argoPosition}
          gliderPosition={gliderPosition}
          onPositionsUpdate={handlePositionsUpdate}
        />

        <Suspense fallback={null}>
          <ArgoDeviceModel
            position={argoPosition}
            scale={argoScale}
            active={shouldAnimate}
            onPointerOver={() => handleHoverArgo(true)}
            onPointerOut={() => handleHoverArgo(false)}
          />
          <GliderDeviceModel
            position={gliderPosition}
            scale={gliderScale}
            active={shouldAnimate}
            onPointerOver={() => handleHoverGlider(true)}
            onPointerOut={() => handleHoverGlider(false)}
          />
        </Suspense>
      </Canvas>

      {/* HUD Telemetry Cards with Leader Callout Arrows to Devices */}
      <HeroHUDOverlay
        argoHovered={argoHovered}
        gliderHovered={gliderHovered}
        onHoverArgo={handleHoverArgo}
        onHoverGlider={handleHoverGlider}
        argoTargetPos={argoPos}
        gliderTargetPos={gliderPos}
      />
    </div>
  );
}
