'use client';

import React, { ComponentType, useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { ExplorerTopBar } from './ExplorerTopBar';
import { CameraChoreographer } from '@/components/globe/CameraChoreographer';
import { AnimatePresence, motion } from 'framer-motion';

// Globe and layers — client-only, dynamic imports
const CesiumStage = dynamic(
  () => import('@/components/globe/CesiumStage'),
  { ssr: false }
) as ComponentType<{ onViewerReady?: (v: unknown) => void; onGlobeClick?: (lat: number, lon: number) => void }>;

const SurfaceFieldLayer = dynamic(() => import('@/components/globe/SurfaceFieldLayer'), { ssr: false }) as ComponentType<{ viewer: unknown }>;
const ArgoMarkerLayer = dynamic(() => import('@/components/globe/ArgoMarkerLayer'), { ssr: false }) as ComponentType<{ viewer: unknown }>;
const GlobeWaterColumn = dynamic(() => import('@/components/globe/GlobeWaterColumn'), { ssr: false }) as ComponentType<{ viewer: unknown }>;
const ColumnDataHUD = dynamic(() => import('@/components/globe/ColumnDataHUD'), { ssr: false }) as ComponentType<{ viewer: unknown }>;
const UnderwaterDiveOverlay = dynamic(() => import('@/components/globe/UnderwaterDiveOverlay'), { ssr: false }) as ComponentType;

// The panels & visualizers
const LayerPanel = dynamic(() => import('./LayerPanel').then(m => ({ default: m.LayerPanel })), { ssr: false });
const ProfilePanel = dynamic(() => import('./ProfilePanel').then(m => ({ default: m.ProfilePanel })), { ssr: false });
const DepthSidebar = dynamic(() => import('./DepthSidebar').then(m => ({ default: m.DepthSidebar })), { ssr: false });
const DateDepthBar = dynamic(() => import('./DateDepthBar').then(m => ({ default: m.DateDepthBar })), { ssr: false });
const SplitOceanViz = dynamic(() => import('@/components/globe/SplitOceanViz'), { ssr: false });
import { DataStatusOverlay } from './DataStatusOverlay';
import { SurfaceFieldLoadingHUD } from './SurfaceFieldLoadingHUD';
import { ColormapLegend } from './ColormapLegend';

export function ExplorerShell() {
  const [viewer, setViewer] = useState<unknown>(null);
  const choreographerRef = useRef<CameraChoreographer | null>(null);

  const selectedLat = useExplorerStore(s => s.selectedLat);
  const selectedLon = useExplorerStore(s => s.selectedLon);
  const setSelectedPoint = useExplorerStore(s => s.setSelectedPoint);
  const clearSelectedPoint = useExplorerStore(s => s.clearSelectedPoint);
  const columnVizOpen = useExplorerStore(s => s.columnVizOpen);
  const zoomPhase = useExplorerStore(s => s.zoomPhase);
  const setZoomPhase = useExplorerStore(s => s.setZoomPhase);

  // Globe should be invisible (but alive) once the 3D viz has blended in
  const globeHidden = zoomPhase === 'blended';

  // Pause Cesium render loop when hidden to free up 100% of GPU for Three.js
  React.useEffect(() => {
    if (!viewer) return;
    const v = viewer as { useDefaultRenderLoop?: boolean; scene?: { requestRender?: () => void } };
    if (globeHidden) {
      const timer = setTimeout(() => {
        if (v) v.useDefaultRenderLoop = false;
      }, 400);
      return () => clearTimeout(timer);
    } else {
      if (v) {
        v.useDefaultRenderLoop = true;
        v.scene?.requestRender?.();
      }
    }
  }, [viewer, globeHidden]);

  const handleViewerReady = useCallback((v: unknown) => {
    setViewer(v);
    choreographerRef.current = new CameraChoreographer(v);
  }, []);

  const handleGlobeClick = useCallback((lat: number, lon: number) => {
    setSelectedPoint(lat, lon);
    setZoomPhase('zooming');

    if (choreographerRef.current) {
      choreographerRef.current.zoomToOceanPoint(lat, lon, () => {
        setZoomPhase('blended');
      });
    } else {
      setTimeout(() => setZoomPhase('blended'), 150);
    }
  }, [setSelectedPoint, setZoomPhase]);

  const handleSearchLocation = useCallback(async (lat: number, lon: number, alt?: number) => {
    if (!viewer) return;
    try {
      const Cesium = await import('cesium');
      (viewer as any).camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt || 1000000),
        duration: 2.0,
      });
    } catch (e) {
      console.error('Failed to fly to location:', e);
    }
  }, [viewer]);

  const handleReset = useCallback(async () => {
    // 1. Fade out the 3D viz immediately
    setZoomPhase('idle');
    // 2. Wait a tick so Cesium is visible again before flying back
    setTimeout(async () => {
      clearSelectedPoint();
      if (choreographerRef.current) {
        choreographerRef.current.resetToIndianOcean();
      } else if (viewer) {
        try {
          const Cesium = await import('cesium');
          (viewer as any).camera.flyTo({
            destination: Cesium.Rectangle.fromDegrees(45.0, 5.0, 105.0, 30.0),
            duration: 1.5,
          });
        } catch (e) {
          console.error('Failed to reset view:', e);
        }
      }
    }, 80);
  }, [clearSelectedPoint, setZoomPhase, viewer]);

  return (
    <div className="w-full h-screen relative bg-abyss overflow-hidden flex flex-col text-foam font-ui">
      {/* Full-Bleed Background Stage: Cesium Globe + 3D Ocean Visualizer */}
      <div className="absolute inset-0 z-0">

        {/* ── Cesium layer — hidden (not unmounted) once the 3D viz takes over ── */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: globeHidden ? 0 : 1, pointerEvents: globeHidden ? 'none' : 'auto' }}
        >
          <CesiumStage onViewerReady={handleViewerReady} onGlobeClick={handleGlobeClick} />
          {!!viewer && (
            <>
              <SurfaceFieldLayer viewer={viewer} />
              <ArgoMarkerLayer viewer={viewer} />
              <GlobeWaterColumn viewer={viewer} />
            </>
          )}
        </div>

        {/* ── 3D Ocean visualization — fades in over Cesium and covers it fully ── */}
        <AnimatePresence>
          {zoomPhase === 'blended' && selectedLat !== null && selectedLon !== null && (
            <motion.div
              key="ocean-bg-viz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0 z-10"
            >
              <SplitOceanViz onExit={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <UnderwaterDiveOverlay />
      <DataStatusOverlay />
      <SurfaceFieldLoadingHUD />

      {/* Top Bar */}
      <div className="relative z-20">
        <ExplorerTopBar onSearchLocation={handleSearchLocation} onReset={handleReset} />
      </div>

      {/* Main UI Layer — Clean flexbox layout with draggable left and right columns */}
      <div className="relative z-10 flex-grow flex pointer-events-none p-4 pt-16 pb-20 gap-4 min-h-0 w-full max-w-full overflow-hidden">
        
        {/* Left Panel - Data Layers (Draggable across viewport) */}
        <motion.aside 
          drag
          dragMomentum={false}
          dragConstraints={{ left: -10, right: 800, top: -40, bottom: 200 }}
          className="w-64 md:w-72 shrink-0 pointer-events-auto flex flex-col min-h-0 h-full max-h-full cursor-move"
        >
          <LayerPanel />
        </motion.aside>

        {/* Center - Unobstructed view of the 3D ocean background */}
        <div className="flex-1 flex flex-col pointer-events-none justify-center items-center relative min-h-0 h-full">
          {!columnVizOpen && !!viewer && (
            <ColumnDataHUD viewer={viewer} />
          )}
          <ColormapLegend />
        </div>

        {/* Right Panel - Profile/Validation OR DepthSidebar (Draggable across viewport) */}
        <motion.aside 
          drag
          dragMomentum={false}
          dragConstraints={{ left: -800, right: 10, top: -40, bottom: 200 }}
          className="w-80 md:w-96 shrink-0 pointer-events-auto flex flex-col min-h-0 h-full max-h-full cursor-move"
        >
          <AnimatePresence mode="wait">
            {columnVizOpen && selectedLat !== null && selectedLon !== null ? (
              <div key="depth-sidebar" className="h-full w-full">
                <DepthSidebar />
              </div>
            ) : (
              <div key="profile-panel" className="h-full w-full">
                <ProfilePanel />
              </div>
            )}
          </AnimatePresence>
        </motion.aside>

      </div>

      {/* Bottom Bar - Date & Depth Scrubber */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto">
        <DateDepthBar />
      </div>
    </div>
  );
}
