'use client';

import React, { ComponentType, useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { ExplorerTopBar } from './ExplorerTopBar';

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

// The panels
const LayerPanel = dynamic(() => import('./LayerPanel').then(m => ({ default: m.LayerPanel })), { ssr: false });
const ProfilePanel = dynamic(() => import('./ProfilePanel').then(m => ({ default: m.ProfilePanel })), { ssr: false });
const DateDepthBar = dynamic(() => import('./DateDepthBar').then(m => ({ default: m.DateDepthBar })), { ssr: false });

export function ExplorerShell() {
  const [viewer, setViewer] = useState<unknown>(null);
  const setSelectedPoint = useExplorerStore(s => s.setSelectedPoint);

  const handleViewerReady = useCallback((v: unknown) => {
    setViewer(v);
  }, []);

  const handleGlobeClick = useCallback((lat: number, lon: number) => {
    setSelectedPoint(lat, lon);
  }, [setSelectedPoint]);

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
    if (!viewer) return;
    try {
      const Cesium = await import('cesium');
      (viewer as any).camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(45.0, 5.0, 105.0, 30.0),
        duration: 1.5,
      });
    } catch (e) {
      console.error('Failed to reset view:', e);
    }
  }, [viewer]);

  return (
    <div className="w-full h-screen relative bg-abyss overflow-hidden flex flex-col text-foam font-ui">
      {/* Globe Background */}
      <div className="absolute inset-0 z-0">
        <CesiumStage onViewerReady={handleViewerReady} onGlobeClick={handleGlobeClick} />
        
        {!!viewer && (
          <>
            <SurfaceFieldLayer viewer={viewer} />
            <ArgoMarkerLayer viewer={viewer} />
            <GlobeWaterColumn viewer={viewer} />
          </>
        )}
      </div>

      <UnderwaterDiveOverlay />

      {/* Top Bar */}
      <div className="relative z-20">
        <ExplorerTopBar onSearchLocation={handleSearchLocation} onReset={handleReset} />
      </div>

      {/* Main UI Layer (pointer-events-none to let clicks pass through to map, except on panels) */}
      <div className="relative z-10 flex-grow flex pointer-events-none p-4 pt-16 pb-20 gap-4 min-h-0">
        
        {/* Left Panel - Layers */}
        <aside className="w-64 flex-shrink-0 pointer-events-auto flex flex-col min-h-0">
          <LayerPanel />
        </aside>

        {/* Center - Empty (Globe is visible here) */}
        <div className="flex-grow flex flex-col pointer-events-none justify-center items-center">
          {!!viewer && <ColumnDataHUD viewer={viewer} />}
        </div>

        {/* Right Panel - Profile/Validation */}
        <aside className="w-80 flex-shrink-0 pointer-events-auto flex flex-col min-h-0">
          <ProfilePanel />
        </aside>

      </div>

      {/* Bottom Bar - Date & Depth Scrubber */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto">
        <DateDepthBar />
      </div>
    </div>
  );
}
