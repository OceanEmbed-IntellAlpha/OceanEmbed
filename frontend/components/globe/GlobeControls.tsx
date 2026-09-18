'use client';

import React from 'react';
import { Plus, Minus, Compass, RotateCcw } from 'lucide-react';

interface GlobeControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleTilt: () => void;
}

/**
 * GlobeControls — Floating glassmorphic navigation widget for the Cesium globe.
 * Provides explicit Zoom In, Zoom Out, Tilt (3D/2D toggle), and Reset to Indian Ocean.
 */
export default function GlobeControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleTilt,
}: GlobeControlsProps) {
  return (
    <div
      className="absolute right-4 bottom-24 z-40 flex flex-col gap-1.5 select-none"
      role="toolbar"
      aria-label="Globe navigation controls"
    >
      {/* Zoom In Button */}
      <button
        type="button"
        onClick={onZoomIn}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#050B14]/85 border border-[#4CE0D2]/20 text-[#8FA5AC] hover:text-[#4CE0D2] hover:bg-[#4CE0D2]/10 hover:border-[#4CE0D2]/40 transition-all backdrop-blur-md shadow-lg active:scale-95 group"
        title="Zoom in (or use mouse wheel)"
        aria-label="Zoom in"
      >
        <Plus size={16} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* Zoom Out Button */}
      <button
        type="button"
        onClick={onZoomOut}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#050B14]/85 border border-[#4CE0D2]/20 text-[#8FA5AC] hover:text-[#4CE0D2] hover:bg-[#4CE0D2]/10 hover:border-[#4CE0D2]/40 transition-all backdrop-blur-md shadow-lg active:scale-95 group"
        title="Zoom out (or use mouse wheel)"
        aria-label="Zoom out"
      >
        <Minus size={16} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* Divider */}
      <div className="w-full h-px bg-white/10 my-0.5" />

      {/* Toggle 3D Tilt */}
      <button
        type="button"
        onClick={onToggleTilt}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#050B14]/85 border border-[#4CE0D2]/20 text-[#8FA5AC] hover:text-[#4CE0D2] hover:bg-[#4CE0D2]/10 hover:border-[#4CE0D2]/40 transition-all backdrop-blur-md shadow-lg active:scale-95 group"
        title="Toggle 3D Perspective / Top-Down View"
        aria-label="Toggle 3D tilt perspective"
      >
        <Compass size={16} className="group-hover:rotate-45 transition-transform" />
      </button>

      {/* Reset Camera to Indian Ocean */}
      <button
        type="button"
        onClick={onReset}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#050B14]/85 border border-[#4CE0D2]/20 text-[#8FA5AC] hover:text-[#4CE0D2] hover:bg-[#4CE0D2]/10 hover:border-[#4CE0D2]/40 transition-all backdrop-blur-md shadow-lg active:scale-95 group"
        title="Reset view to Indian Ocean"
        aria-label="Reset view to Indian Ocean"
      >
        <RotateCcw size={15} className="group-hover:-rotate-90 transition-transform" />
      </button>
    </div>
  );
}
