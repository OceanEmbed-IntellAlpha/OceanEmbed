'use client';

import { useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { useConsoleStore } from '@/lib/store/useConsoleStore';

const ArgoViewer = dynamic(() => import('@/components/3d-viewers/ArgoViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#020b14] text-cyan-400 font-mono text-sm">
      <div className="animate-pulse tracking-widest uppercase">Initializing Argo 3D Environment...</div>
    </div>
  ),
});

const GliderViewer = dynamic(() => import('@/components/3d-viewers/GliderViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#040c17] text-amber-400 font-mono text-sm">
      <div className="animate-pulse tracking-widest uppercase">Initializing Glider 3D Environment...</div>
    </div>
  ),
});

const PLATFORM_META: Record<'argo' | 'glider', { label: string; sub: string }> = {
  argo: {
    label: 'ARGO PROFILING FLOAT',
    sub: 'Engineering Technical Reference & Subsurface Simulation',
  },
  glider: {
    label: 'UNDERWATER GLIDER',
    sub: 'Engineering Exploded Specification & Hydrodynamic Simulation',
  },
};

/**
 * DeviceViewerModal — renders a full-screen overlay with the complete,
 * fully featured Three.js engineering CAD viewer for the selected device
 * (Argo Profiling Float or Slocum Underwater Glider).
 *
 * Restores 100% of all original features:
 * - Dynamic 3D part labels, leader lines, and SVG badges
 * - Right Inspector Drawer with technical specifications & params
 * - Diurnal mission clock HUD, solar day/night cycle, ocean surface & sky
 * - Chase and Wide cutaway camera modes
 * - 1x / 2x / 5x simulation speed controls
 * - Blueprint vs Dark theme switcher
 * - Sounding profile depth ruler & buoyancy engine telemetry
 */
export default function DeviceViewerModal() {
  const isOpen = useConsoleStore((s) => s.deviceViewerOpen);
  const platform = useConsoleStore((s) => s.deviceViewerPlatform);
  const closeDeviceViewer = useConsoleStore((s) => s.closeDeviceViewer);

  // Escape key support
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeDeviceViewer();
    },
    [isOpen, closeDeviceViewer],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const meta = platform ? PLATFORM_META[platform] : null;

  return (
    <div
      aria-modal="true"
      aria-label="Device Engineering Viewer"
      role="dialog"
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* ── Backdrop (click to close) ─────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-[#020b14]/85 backdrop-blur-sm"
        onClick={closeDeviceViewer}
        aria-hidden="true"
      />

      {/* ── Modal Shell ──────────────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex flex-col w-[92vw] h-[88vh] m-auto rounded-2xl overflow-hidden shadow-2xl border border-cyan-900/40 bg-[#0f1012]"
        style={{
          transform: isOpen ? 'none' : 'scale(0.97)',
          transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* ── Floating Close Button ─────────────────────────────────────────── */}
        <button
          onClick={closeDeviceViewer}
          aria-label="Close device viewer"
          className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 group"
          style={{
            background: 'rgba(22, 23, 27, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.3)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239, 68, 68, 0.7)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(22, 23, 27, 0.85)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
          }}
        >
          <X size={18} className="text-white/70 group-hover:text-white transition-colors" />
        </button>

        {/* ── Native React Three Fiber 3D Device Viewers ──────────────────── */}
        {isOpen && (
          <div className="flex-1 w-full h-full relative overflow-hidden">
            {platform === 'argo' && <ArgoViewer />}
            {platform === 'glider' && <GliderViewer />}
          </div>
        )}
      </div>
    </div>
  );
}
