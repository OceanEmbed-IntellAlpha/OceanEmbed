'use client';

import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { DEPTH_LEVELS, type DepthLevel } from '@/lib/api/types';
import { useSubsurfaceProfile } from '@/lib/api/queries';
import { interpolate } from '@/components/cutaway/utils';
import * as Slider from '@radix-ui/react-slider';
import { Play, Pause, Rewind } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/** Temperature → gradient stop colour */
function tempToColor(t: number): string {
  const norm = Math.max(0, Math.min(1, (t - 4) / (30 - 4)));
  const hue = Math.round(230 - norm * 220);
  return `hsl(${hue},88%,55%)`;
}

// Depth sweep speeds in ms per step
const SPEED_OPTIONS = [600, 350, 150] as const;
const SPEED_LABELS  = ['1×', '2×', '4×'] as const;

export function DateDepthBar() {
  const {
    selectedDepth,
    setDepth,
    selectedDate,
    setDate,
    isPlaying,
    setPlayback,
    playSpeed,
    selectedLat,
    selectedLon,
  } = useExplorerStore();

  const [speedIdx, setSpeedIdx] = useState(0); // 0=1×, 1=2×, 2=4×
  const intervalMs = SPEED_OPTIONS[speedIdx];

  // Depth sweep playback — steps through DEPTH_LEVELS forward then loops
  const depthIdxRef = useRef(DEPTH_LEVELS.indexOf(selectedDepth as DepthLevel));
  React.useEffect(() => {
    depthIdxRef.current = DEPTH_LEVELS.indexOf(selectedDepth as DepthLevel);
  }, [selectedDepth]);

  React.useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      const nextIdx = (depthIdxRef.current + 1) % DEPTH_LEVELS.length;
      depthIdxRef.current = nextIdx;
      setDepth(DEPTH_LEVELS[nextIdx]);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, intervalMs, setDepth]);

  const handleReset = useCallback(() => {
    setPlayback(false);
    setDepth(DEPTH_LEVELS[0]);
  }, [setPlayback, setDepth]);

  // Subsurface profile for temp-coloured depth ticks
  const { data: profile } = useSubsurfaceProfile(
    selectedLat !== null && selectedLon !== null
      ? { lat: selectedLat, lon: selectedLon, date: selectedDate }
      : null
  );
  const depths = useMemo(
    () => profile?.depths ?? [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000],
    [profile]
  );
  const temperatures = useMemo(
    () =>
      profile?.temperature ??
      [28.6, 28.5, 28.4, 28.1, 27.5, 26.0, 23.4, 20.8, 18.5, 16.2, 14.1, 10.8, 7.2, 6.1, 5.4],
    [profile]
  );

  const currentTemp = useMemo(
    () => interpolate(depths, temperatures, selectedDepth),
    [depths, temperatures, selectedDepth]
  );

  const currentIdx = DEPTH_LEVELS.indexOf(selectedDepth as DepthLevel);
  const depthColor = tempToColor(currentTemp);

  // Depth zone label
  const zoneLabel = selectedDepth <= 200 ? 'Sunlit' : selectedDepth <= 1000 ? 'Twilight' : 'Midnight';
  const zoneColor = selectedDepth <= 200 ? '#0ea5e9' : selectedDepth <= 1000 ? '#6366f1' : '#374151';

  return (
    <div
      className="h-16 flex items-center px-4 gap-4 relative z-50"
      style={{
        background: 'rgba(4, 8, 18, 0.88)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.55)',
      }}
    >
      {/* ── DEPTH SWEEP CONTROLS ─────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0 border-r border-white/[0.07] pr-4">
        {/* Play / Pause */}
        <button
          onClick={() => setPlayback(!isPlaying)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: isPlaying ? 'rgba(14,165,233,0.22)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${isPlaying ? 'rgba(14,165,233,0.55)' : 'rgba(255,255,255,0.12)'}`,
            color: isPlaying ? '#38bdf8' : 'rgba(255,255,255,0.6)',
            boxShadow: isPlaying ? '0 0 14px rgba(14,165,233,0.35)' : 'none',
          }}
          title={isPlaying ? 'Pause depth sweep' : 'Play depth sweep'}
        >
          {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
        </button>

        {/* Reset to 0m */}
        <button
          onClick={handleReset}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            color: 'rgba(255,255,255,0.4)',
          }}
          title="Reset to 0m"
        >
          <Rewind size={11} />
        </button>

        {/* Speed picker */}
        <button
          onClick={() => setSpeedIdx((speedIdx + 1) % SPEED_OPTIONS.length)}
          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all"
          style={{
            background: 'rgba(14,165,233,0.12)',
            border: '1px solid rgba(14,165,233,0.3)',
            color: '#38bdf8',
          }}
          title="Cycle speed"
        >
          {SPEED_LABELS[speedIdx]}
        </button>

        <div>
          <div className="text-[9px] font-mono text-white/35 uppercase tracking-widest">Depth Sweep</div>
          <div className="text-[10px] font-mono text-white/50">{selectedDate}</div>
        </div>
      </div>

      {/* ── CURRENT DEPTH READOUT ───────────────────────── */}
      <div className="flex-shrink-0 flex flex-col w-[72px]">
        <div className="text-[9px] font-mono text-white/35 uppercase tracking-widest">Depth</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDepth}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-baseline gap-1"
          >
            <span className="text-base font-mono font-bold" style={{ color: depthColor }}>
              {selectedDepth}
            </span>
            <span className="text-[10px] font-mono text-white/40">m</span>
          </motion.div>
        </AnimatePresence>
        <div className="text-[9px] font-mono" style={{ color: zoneColor }}>
          {zoneLabel}
        </div>
      </div>

      {/* ── DEPTH SNAP TRACK ────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-4 cursor-pointer group"
          value={[currentIdx]}
          max={DEPTH_LEVELS.length - 1}
          step={1}
          onValueChange={(val) => setDepth(DEPTH_LEVELS[val[0]])}
        >
          {/* Temperature heatmap strip track */}
          <Slider.Track className="relative h-3 w-full rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Gradient background: warm left → cold right */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #f97316 0%, #eab308 20%, #22d3ee 60%, #6366f1 100%)',
                opacity: 0.25,
              }}
            />
            {/* Filled portion up to selected depth */}
            <Slider.Range className="absolute h-full rounded-full transition-all duration-400"
              style={{
                background: `linear-gradient(90deg, #f97316, #eab308, ${depthColor})`,
                opacity: 0.8,
              }}
            />
          </Slider.Track>

          {/* Depth tick marks (rendered absolutely over the track) */}
          {DEPTH_LEVELS.map((d, i) => {
            const pos = (i / (DEPTH_LEVELS.length - 1)) * 100;
            const isActive = d === selectedDepth;
            const tempD = interpolate(depths, temperatures, d);
            const col = tempToColor(tempD);
            return (
              <div
                key={d}
                className="absolute pointer-events-none flex items-center justify-center -translate-x-0.5 z-10"
                style={{ left: `${pos}%`, top: '0', bottom: '0', width: '2px' }}
              >
                <div
                  className="transition-all duration-150"
                  style={{
                    width: isActive ? '4px' : '2px',
                    height: isActive ? '10px' : '6px',
                    borderRadius: '2px',
                    background: isActive ? col : 'rgba(255,255,255,0.35)',
                    boxShadow: isActive ? `0 0 8px ${col}` : 'none',
                  }}
                />
              </div>
            );
          })}

          <Slider.Thumb
            className="block w-2.5 h-6 bg-white rounded-[2px] shadow-[0_0_12px_rgba(0,0,0,0.8)] focus:outline-none transition-transform hover:scale-110 cursor-grab active:cursor-grabbing z-20"
            style={{
              background: depthColor,
              border: '2px solid white',
              boxShadow: `0 0 12px 2px ${depthColor}80`,
            }}
            aria-label="Depth"
          />
        </Slider.Root>

        {/* Axis labels */}
        <div className="relative h-3 pointer-events-none">
          {[0, 200, 500, 700, 1000].map((d) => {
            const levelIdx = DEPTH_LEVELS.indexOf(d as DepthLevel);
            if (levelIdx === -1) return null;
            const pos = (levelIdx / (DEPTH_LEVELS.length - 1)) * 100;
            return (
              <span
                key={d}
                className="absolute text-[8px] font-mono text-white/25 -translate-x-1/2"
                style={{ left: `${pos}%` }}
              >
                {d}m
              </span>
            );
          })}
        </div>
      </div>

      {/* ── TEMPERATURE AT DEPTH ─────────────────────────── */}
      <div className="flex-shrink-0 border-l border-white/[0.07] pl-4">
        <div className="text-[9px] font-mono text-white/35 uppercase tracking-widest">Temp</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTemp.toFixed(1)}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.15 }}
            className="text-base font-mono font-bold"
            style={{ color: depthColor }}
          >
            {currentTemp.toFixed(1)}°C
          </motion.div>
        </AnimatePresence>
        <div className="text-[9px] font-mono text-white/25">predicted</div>
      </div>
    </div>
  );
}
