'use client';

import React, { ComponentType, useCallback, useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useConsoleStore } from '@/lib/store/useConsoleStore';
import { TopBar } from './TopBar';
import { CameraChoreographer } from '@/components/globe/CameraChoreographer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Globe and layers — client-only, dynamic imports
const CesiumStage = dynamic(
  () => import('@/components/globe/CesiumStage'),
  { ssr: false },
) as ComponentType<{ onViewerReady?: (v: unknown) => void; onGlobeClick?: (lat: number, lon: number) => void }>;

const ModelFieldLayer = dynamic(
  () => import('@/components/globe/ModelFieldLayer'),
  { ssr: false },
) as ComponentType<{ viewer: unknown }>;

const ArgoMarkerLayer = dynamic(
  () => import('@/components/globe/ArgoMarkerLayer'),
  { ssr: false },
) as ComponentType<{ viewer: unknown; onMarkerClick?: (id: string, lat: number, lon: number, platform: string) => void; focusPlatform?: string | null }>;

// New on-globe water column and HUD
const GlobeWaterColumn = dynamic(
  () => import('@/components/globe/GlobeWaterColumn'),
  { ssr: false },
) as ComponentType<{ viewer: unknown }>;

const ColumnDataHUD = dynamic(
  () => import('@/components/globe/ColumnDataHUD'),
  { ssr: false },
) as ComponentType<{ viewer: unknown }>;

const SearchMarkerLayer = dynamic(
  () => import('@/components/globe/SearchMarkerLayer'),
  { ssr: false },
) as ComponentType<{ viewer: unknown }>;

const UnderwaterDiveOverlay = dynamic(
  () => import('@/components/globe/UnderwaterDiveOverlay'),
  { ssr: false },
);

// Panel components
const LayersPanel = dynamic(
  () => import('@/components/layers-panel/LayersPanel').then((m) => ({ default: m.LayersPanel })),
  { ssr: false },
);

const TimelineScrubber = dynamic(
  () => import('@/components/timeline/TimelineScrubber').then((m) => ({ default: m.TimelineScrubber })),
  { ssr: false },
);

// Inspector — now a standalone floating panel
const InspectorPanel = dynamic(
  () => import('@/components/inspector/InspectorDrawer').then((m) => ({ default: m.InspectorPanel })),
  { ssr: false },
);

// Device Viewer — full-screen iframe modal for 3D CAD engineering reference
const DeviceViewerModal = dynamic(
  () => import('@/components/device-viewer/DeviceViewerModal'),
  { ssr: false },
);


/**
 * OceanConsole — root shell of the console.
 * Orchestrates all panels floating over the full-bleed Cesium globe.
 * The 3D water column now renders directly on the globe instead of
 * opening a separate side panel.
 */
export default function OceanConsole() {
  const [viewer, setViewer] = useState<unknown>(null);
  const choreographerRef = useRef<CameraChoreographer | null>(null);
  const setMode      = useConsoleStore((s) => s.setMode);
  const setFocusPoint = useConsoleStore((s) => s.setFocusPoint);
  const setInspectorOpen = useConsoleStore((s) => s.setInspectorOpen);
  const selectFloat  = useConsoleStore((s) => s.selectFloat);
  const openDeviceViewer = useConsoleStore((s) => s.openDeviceViewer);

  const handleViewerReady = useCallback((v: unknown) => {
    setViewer(v);
    choreographerRef.current = new CameraChoreographer(v);
  }, []);

  /** Globe bare-ocean click: set focus and fly camera to frame the water column */
  const handleGlobeClick = useCallback(
    (lat: number, lon: number) => {
      setFocusPoint(lat, lon);
      choreographerRef.current?.frameWaterColumn(lat, lon);
    },
    [setFocusPoint],
  );

  /** TopBar region search: fly only, no column */
  const handleSearchLocation = useCallback(
    (lat: number, lon: number, altitudeM?: number) => {
      choreographerRef.current?.flyToFloat(lat, lon, altitudeM);
    },
    [],
  );

  const handleReset = useCallback(() => {
    choreographerRef.current?.resetToIndianOcean();
  }, []);

  /**
   * Argo / glider / buoy marker click:
   * - Argo / Glider: fly to location, select float (opens inspector), open 3D device viewer.
   * - Buoy: fly there and select (inspector only, no 3D model).
   * NOTE: we intentionally do NOT call setFocusPoint here — that would trigger
   * the UnderwaterDiveOverlay which is reserved for explicit user-initiated dives.
   */
  const handleMarkerClick = useCallback(
    (id: string, lat: number, lon: number, platform: string) => {
      choreographerRef.current?.flyToFloat(lat, lon);
      selectFloat(id);
      if (platform === 'argo' || platform === 'glider') {
        openDeviceViewer(platform as 'argo' | 'glider');
      }
    },
    [selectFloat, openDeviceViewer],
  );

  const handleDiveReplay = useCallback(
    (lat: number, lon: number) => {
      setFocusPoint(lat, lon);
      setMode('dive');
      setInspectorOpen(false);
      choreographerRef.current?.transitionTo('dive', { lon, lat });
    },
    [setFocusPoint, setMode, setInspectorOpen],
  );

  // Auto-focus logic for newly uploaded files
  const [focusPlatformId, setFocusPlatformId] = useState<string | null>(null);

  useEffect(() => {
    if (!viewer) return;

    const searchParams = new URLSearchParams(window.location.search);
    const platformId = searchParams.get('focus_platform');
    if (platformId) {
      setFocusPlatformId(platformId);
      // Clear the param so it doesn't re-trigger on refresh
      window.history.replaceState({}, '', '/explore');
      
      // Delay to let the globe and layers settle
      setTimeout(async () => {
        try {
          const res = await fetch('http://localhost:8000/api/observations');
          if (res.ok) {
            const obs = await res.json();
            const target = obs.find((o: any) => o.id === platformId);
            if (target) {
              // Fly to it, select it, open inspector and device viewer
              handleMarkerClick(target.id, target.lat, target.lon, target.platform || 'glider');
            }
          }
        } catch (e) {
          console.error("Failed to auto-focus observation:", e);
        }
      }, 1500);
    }
  }, [viewer, handleMarkerClick]);

  return (
    <>
      {/* Full-viewport console shell */}
      <div 
        className="w-full h-full relative" 
        role="application" 
        aria-label="INCOIS OceanRoot Console"
      >
        {/* ── Globe Stage — z-index base, fills entire viewport ──────────── */}
        <CesiumStage
          onViewerReady={handleViewerReady}
          onGlobeClick={handleGlobeClick}
        />

        {/* Globe rendering layers */}
        {!!viewer && (
          <>
            <ModelFieldLayer viewer={viewer} />
            <ArgoMarkerLayer 
              viewer={viewer} 
              onMarkerClick={handleMarkerClick} 
              focusPlatform={focusPlatformId}
            />
            <GlobeWaterColumn viewer={viewer} />
            <ColumnDataHUD viewer={viewer} />
            <SearchMarkerLayer viewer={viewer} />
          </>
        )}

        {/* ── Immersive Three.js Underwater Dive Simulation ────────────────── */}
        <UnderwaterDiveOverlay />

        {/* ── Top Bar ──────────────────────────────────────────────────────── */}
        <TopBar
          onSearchLocation={handleSearchLocation}
          onReset={handleReset}
        />

        {/* ── Layers Panel — left, floating ────────────────────────────────── */}
        <aside
          className="absolute left-3 top-16 bottom-20 z-40 w-52 flex flex-col"
          aria-label="Layers panel"
        >
          <LayersPanel />
        </aside>

        {/* ── Timeline — bottom ─────────────────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 z-40 h-16">
          <TimelineScrubber />
        </div>

        {/* ── Inspector — standalone floating panel for selected floats ── */}
        <InspectorPanel onDiveReplay={handleDiveReplay} />

        {/* ── Device Viewer — full-screen 3D CAD engineering modal ─────── */}
        <DeviceViewerModal />
      </div>
    </>
  );
}
