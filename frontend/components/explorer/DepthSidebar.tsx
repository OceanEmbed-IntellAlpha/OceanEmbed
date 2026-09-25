'use client';

import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSubsurfaceProfile } from '@/lib/api/queries';
import { DEPTH_LEVELS, type DepthLevel } from '@/lib/api/types';
import { getZone, interpolate } from '@/components/cutaway/utils';
import * as Slider from '@radix-ui/react-slider';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Thermometer,
  Droplets,
  Gauge,
  Sun,
  Compass,
  X,
  ChevronUp,
  ChevronDown,
  Waves,
  Zap,
  Fish,
  Eye,
  EyeOff,
} from 'lucide-react';

// ── Zone definitions with emoji + icon ────────────────────────────────────────
const ZONE_META = [
  {
    name: 'Sunlit',
    range: '0–200m',
    emoji: '☀️',
    depthFrom: 0,
    depthTo: 200,
    grad: ['#0ea5e9', '#0284c7'],
    desc: 'Photosynthesis, phytoplankton blooms, max biodiversity',
  },
  {
    name: 'Twilight',
    range: '200–1000m',
    emoji: '🌑',
    depthFrom: 200,
    depthTo: 1000,
    grad: ['#1e3a8a', '#312e81'],
    desc: 'Bioluminescence, oxygen minimum zone, carbon pump',
  },
  {
    name: 'Midnight',
    range: '1000m+',
    emoji: '💀',
    depthFrom: 1000,
    depthTo: 9999,
    grad: ['#0f0f0f', '#030712'],
    desc: 'No sunlight, extreme pressure, cold-adapted fauna',
  },
];

function getBasinName(lat: number, lon: number): string {
  if (lat > 10 && lon < 78) return 'Arabian Sea';
  if (lat > 10 && lon >= 78) return 'Bay of Bengal';
  if (lat <= 10 && lat >= -10) return 'Equatorial Indian Ocean';
  return 'South Indian Ocean';
}

/** Temperature → hsl colour (hot coral → cool cobalt) */
function tempToColor(t: number): string {
  const norm = Math.max(0, Math.min(1, (t - 4) / (30 - 4)));
  const hue = Math.round(230 - norm * 220);
  const sat = 88;
  const lit = 52 + norm * 10;
  return `hsl(${hue},${sat}%,${lit}%)`;
}

/** Sunlight penetration (Beer-Lambert) */
function sunlightPercent(depth: number): number {
  return Math.max(0, 100 * Math.exp(-0.015 * depth));
}

export function DepthSidebar() {
  const selectedLat = useExplorerStore((s) => s.selectedLat);
  const selectedLon = useExplorerStore((s) => s.selectedLon);
  const selectedDate = useExplorerStore((s) => s.selectedDate);
  const selectedDepth = useExplorerStore((s) => s.selectedDepth);
  const setDepth = useExplorerStore((s) => s.setDepth);
  const clearSelectedPoint = useExplorerStore((s) => s.clearSelectedPoint);

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
  const zone = useMemo(() => getZone(selectedDepth), [selectedDepth]);
  const pressureAtm = ((selectedDepth / 10) + 1).toFixed(1);
  const light = sunlightPercent(selectedDepth);

  // Dynamic Oceanographic Calculations based on Basin & Depth
  const dynamicSalinity = useMemo(() => {
    // Base salinity varies by basin (Bay of Bengal is low ~32.5 PSU due to rivers, Arabian Sea is high ~36.2 PSU due to evaporation)
    let baseSalinity = 35.0;
    if (selectedLat !== null && selectedLon !== null) {
      if (selectedLat > 10 && selectedLon >= 78) baseSalinity = 32.8; // Bay of Bengal
      else if (selectedLat > 10 && selectedLon < 78) baseSalinity = 36.4; // Arabian Sea
      else baseSalinity = 34.8; // Equatorial
    }
    // Halocline depth variation: salinity increases slightly in subsurface halocline layer
    const depthFactor = Math.sin(Math.min(selectedDepth, 600) / 600 * Math.PI) * 0.85;
    return Number((baseSalinity + depthFactor + (Math.abs(selectedLat ?? 0) % 1) * 0.3).toFixed(2));
  }, [selectedLat, selectedLon, selectedDepth]);

  // Speed of sound in seawater (Medwin formula): v = 1449.2 + 4.6*T - 0.055*T^2 + 0.00029*T^3 + (1.34 - 0.01*T)*(S - 35) + 0.016*D
  const soundSpeed = useMemo(() => {
    const T = currentTemp;
    const S = dynamicSalinity;
    const D = selectedDepth;
    const v = 1449.2 + (4.6 * T) - (0.055 * T * T) + (0.00029 * T * T * T) + (1.34 - 0.01 * T) * (S - 35) + (0.016 * D);
    return Math.round(v);
  }, [currentTemp, dynamicSalinity, selectedDepth]);

  // Seawater Density estimation (sigma-t approximation, ~1024 to 1028 kg/m³)
  const densityKg = useMemo(() => {
    const sigma = 28.1 - 0.15 * currentTemp + 0.78 * (dynamicSalinity - 35) + 0.0045 * selectedDepth;
    return (1000 + sigma).toFixed(1);
  }, [currentTemp, dynamicSalinity, selectedDepth]);

  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active depth into view in the ruler list
  useEffect(() => {
    if (activeItemRef.current && listRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedDepth]);

  const currentIdx = DEPTH_LEVELS.indexOf(selectedDepth as DepthLevel);

  const goUp = useCallback(() => {
    if (currentIdx > 0) setDepth(DEPTH_LEVELS[currentIdx - 1]);
  }, [currentIdx, setDepth]);

  const goDown = useCallback(() => {
    if (currentIdx < DEPTH_LEVELS.length - 1) setDepth(DEPTH_LEVELS[currentIdx + 1]);
  }, [currentIdx, setDepth]);

  if (selectedLat === null || selectedLon === null) return null;

  const basin = getBasinName(selectedLat, selectedLon);

  // Compute the SVG thermocline path (vertical: depth → Y, horizontal: temp → X)
  const svgW = 240;
  const svgH = 270;
  const maxDepth = 1000;
  const minTemp = 4;
  const maxTempChart = 32;

  const profilePoints = depths.map((d, i) => {
    const x = 14 + ((temperatures[i] - minTemp) / (maxTempChart - minTemp)) * (svgW - 28);
    const y = (d / maxDepth) * (svgH - 12) + 6;
    return { x, y, d, t: temperatures[i] };
  });

  const pathD = profilePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Find interpolated position for selected depth cursor
  const cursorY = (selectedDepth / maxDepth) * (svgH - 12) + 6;
  const cursorX =
    14 + ((currentTemp - minTemp) / (maxTempChart - minTemp)) * (svgW - 28);

  // Zone band backgrounds for SVG
  const sunlitH = (200 / maxDepth) * (svgH - 12);
  const twilightH = ((1000 - 200) / maxDepth) * (svgH - 12);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-full pointer-events-auto select-none overflow-hidden"
      style={{
        background: 'rgba(6, 14, 28, 0.94)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.08] flex items-start justify-between gap-2 flex-shrink-0 bg-black/20 cursor-grab active:cursor-grabbing select-none">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium" style={{ color: zone.accentHex }}>
            <Compass className="w-3.5 h-3.5 animate-pulse-slow" />
            <span>{selectedLat.toFixed(3)}°{selectedLat >= 0 ? 'N' : 'S'} {selectedLon.toFixed(3)}°{selectedLon >= 0 ? 'E' : 'W'}</span>
          </div>
          <h3 className="text-sm font-semibold text-white mt-0.5 tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex items-center gap-2">
            {basin} <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase bg-white/5 px-1.5 py-0.5 rounded font-normal">⋮⋮ Drag</span>
          </h3>
        </div>
        <button
          onClick={clearSelectedPoint}
          className="mt-0.5 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── MAIN BODY: VERTICALLY SCROLLABLE ──────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-y-auto console-scroll" data-lenis-prevent="true">

        {/* LEFT: Vertical depth slider */}
        <div className="flex flex-col items-center w-[74px] flex-shrink-0 border-r border-white/[0.06] py-5 sticky top-0 bg-black/10">
          <Slider.Root
            className="relative flex flex-col items-center select-none touch-none w-full h-[400px] cursor-grab active:cursor-grabbing"
            orientation="vertical"
            inverted={true}
            value={[currentIdx]}
            max={DEPTH_LEVELS.length - 1}
            step={1}
            onValueChange={(val) => setDepth(DEPTH_LEVELS[val[0]])}
          >
            {/* The vertical track */}
            <Slider.Track className="relative w-1.5 grow rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Thermal gradient background */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, #f97316 0%, #eab308 20%, #22d3ee 60%, #6366f1 100%)',
                  opacity: 0.45,
                }}
              />
              {/* Fill up to selected depth */}
              <Slider.Range className="absolute w-full" style={{ background: 'rgba(255,255,255,0.45)' }} />
            </Slider.Track>

            {/* Tick marks & Labels */}
            {DEPTH_LEVELS.map((d, i) => {
              const pos = (i / (DEPTH_LEVELS.length - 1)) * 100;
              const isActive = i === currentIdx;
              const tempD = interpolate(depths, temperatures, d);
              const col = tempToColor(tempD);
              return (
                <div
                  key={d}
                  className="absolute pointer-events-none w-full flex items-center justify-center"
                  style={{ top: `${pos}%`, transform: 'translateY(-50%)' }}
                >
                  <span
                    className={`absolute left-2 text-[9px] font-mono whitespace-nowrap text-right w-6 transition-colors duration-200 ${isActive ? 'font-bold scale-110' : ''}`}
                    style={{ color: isActive ? col : 'rgba(255,255,255,0.35)' }}
                  >
                    {d}
                  </span>
                  <div
                    className="absolute w-1.5 h-[1px] transition-all duration-200"
                    style={{
                      background: isActive ? col : 'rgba(255,255,255,0.2)',
                      right: '24px',
                    }}
                  />
                </div>
              );
            })}

            {/* Draggable thumb */}
            <Slider.Thumb
              className="block w-4 h-4 rounded-full shadow-[0_0_16px_rgba(0,0,0,0.8)] focus:outline-none transition-transform hover:scale-125"
              style={{
                background: tempToColor(currentTemp),
                border: '2px solid white',
                boxShadow: `0 0 14px ${tempToColor(currentTemp)}A0`,
              }}
              aria-label="Depth Slider"
            />
          </Slider.Root>
        </div>

        {/* RIGHT: Thermocline chart + active stats (Scrolls smoothly) */}
        <div className="flex flex-col flex-1 min-w-0 p-3 space-y-4">

          {/* ── THERMOCLINE PROFILE CHART ──── */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="relative flex-shrink-0 bg-black/20 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors" 
            style={{ height: '290px' }}
          >
            <div className="text-[10px] font-mono text-white/40 absolute top-2.5 left-3.5 uppercase tracking-wider font-semibold">
              Vertical Temp Profile
            </div>
            <div className="text-[10px] font-mono text-white/30 absolute top-2.5 right-3.5 uppercase tracking-wider">
              °C →
            </div>

            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${svgW} ${svgH}`}
              preserveAspectRatio="none"
              style={{ display: 'block' }}
              className="pt-4"
            >
              <defs>
                <linearGradient id="thermoclineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.16" />
                  <stop offset="20%" stopColor="#eab308" stopOpacity="0.12" />
                  <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="30%" stopColor="#eab308" />
                  <stop offset="65%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Zone bands */}
              <rect x="0" y="6" width={svgW} height={sunlitH} fill="rgba(14,165,233,0.05)" rx="4" />
              <rect x="0" y={6 + sunlitH} width={svgW} height={twilightH} fill="rgba(30,58,138,0.05)" rx="4" />

              {/* Zone labels */}
              <text x="6" y="20" fontSize="8" fill="rgba(14,165,233,0.5)" fontFamily="monospace" fontWeight="bold">SUNLIT ZONE</text>
              <text x="6" y={6 + sunlitH + 16} fontSize="8" fill="rgba(99,102,241,0.5)" fontFamily="monospace" fontWeight="bold">TWILIGHT ZONE</text>

              {/* Horizontal temp grid lines */}
              {[8, 14, 20, 26].map((t) => {
                const gx = 14 + ((t - minTemp) / (maxTempChart - minTemp)) * (svgW - 28);
                return (
                  <g key={t}>
                    <line x1={gx} y1="6" x2={gx} y2={svgH - 6} stroke="rgba(255,255,255,0.07)" strokeDasharray="2 3" />
                    <text x={gx} y={svgH - 1} fontSize="7" fill="rgba(255,255,255,0.3)" textAnchor="middle" fontFamily="monospace">{t}°</text>
                  </g>
                );
              })}

              {/* Filled area under curve */}
              <path
                d={`${pathD} L ${profilePoints[profilePoints.length - 1].x} ${svgH - 6} L ${profilePoints[0].x} ${svgH - 6} Z`}
                fill="url(#thermoclineGrad)"
              />

              {/* Temperature curve */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
              />

              {/* Selected depth horizontal line */}
              <line
                x1="0"
                y1={cursorY}
                x2={svgW}
                y2={cursorY}
                stroke={zone.accentHex}
                strokeWidth="1"
                strokeDasharray="4 3"
                strokeOpacity="0.75"
              />

              {/* Cursor dot */}
              <circle
                cx={cursorX}
                cy={cursorY}
                r="5.5"
                fill={zone.accentHex}
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="1.8"
                filter="url(#glow)"
              />
              <circle cx={cursorX} cy={cursorY} r="2.5" fill="white" />

              {/* Depth label at cursor */}
              <rect
                x={cursorX + 7}
                y={cursorY - 10}
                width="50"
                height="16"
                rx="4"
                fill="rgba(5,10,18,0.85)"
                stroke={zone.accentHex}
                strokeWidth="0.8"
                strokeOpacity="0.8"
              />
              <text
                x={cursorX + 32}
                y={cursorY + 1}
                fontSize="8"
                fill="white"
                textAnchor="middle"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {selectedDepth}m · {currentTemp.toFixed(1)}°
              </text>
            </svg>
          </motion.div>

          {/* ── ACTIVE DEPTH HERO CARD ─────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-2xl overflow-hidden flex-shrink-0 transition-transform duration-300 hover:scale-[1.01]"
            style={{
              background: `linear-gradient(135deg, ${zone.accentHex}20 0%, rgba(0,0,0,0.5) 100%)`,
              border: `1px solid ${zone.accentHex}40`,
              boxShadow: `0 8px 24px rgba(0,0,0,0.3)`,
            }}
          >
            {/* Zone badge row */}
            <div className="flex items-center justify-between px-3.5 pt-3.5 pb-1">
              <div
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                style={{
                  background: `${zone.accentHex}25`,
                  color: zone.accentHex,
                  border: `1px solid ${zone.accentHex}50`,
                }}
              >
                <span>{zone.name}</span>
                <span className="opacity-60">· {zone.alias}</span>
              </div>
              <span className="text-[10px] font-mono text-white/50 font-semibold">{selectedDepth}m depth</span>
            </div>

            {/* Temperature big readout */}
            <div className="px-3.5 pb-2 flex items-end gap-2.5">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentTemp.toFixed(1)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="text-3xl font-bold font-mono leading-none tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
                  style={{ color: tempToColor(currentTemp) }}
                >
                  {currentTemp.toFixed(1)}°C
                </motion.span>
              </AnimatePresence>
              <div className="flex flex-col pb-0.5">
                <span className="text-[9px] text-white/40 font-mono uppercase tracking-wider">PREDICTED</span>
                <span className="text-[9px] font-mono font-semibold" style={{ color: zone.accentHex }}>OceanEmbed</span>
              </div>
            </div>

            {/* Thermal gradient bar */}
            <div className="px-3.5 pb-3.5">
              <div className="relative h-2 rounded-full overflow-hidden mb-1"
                style={{ background: 'rgba(0,0,0,0.4)' }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{
                    width: `${((currentTemp - 4) / (32 - 4)) * 100}%`,
                    background: `linear-gradient(90deg, #6366f1, #0ea5e9, #22d3ee, #eab308, #f97316)`,
                    backgroundSize: '500% 100%',
                    backgroundPosition: `${100 - ((currentTemp - 4) / 28) * 100}% 50%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-white/30 font-medium">
                <span>4°C cold</span>
                <span>32°C warm</span>
              </div>
            </div>
          </motion.div>

          {/* ── METRICS GRID ──────────────────── */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="grid grid-cols-2 gap-2.5 flex-shrink-0"
          >
            {/* Pressure */}
            <div className="rounded-xl p-3 transition-all duration-200 hover:bg-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] font-mono text-white/50 uppercase tracking-wide font-semibold">Pressure</span>
              </div>
              <div className="text-base font-mono font-bold text-white">{pressureAtm} <span className="text-xs text-white/40 font-normal">atm</span></div>
            </div>

            {/* Sunlight */}
            <div className="rounded-xl p-3 transition-all duration-200 hover:bg-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                {light > 5 ? (
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span className="text-[9px] font-mono text-white/50 uppercase tracking-wide font-semibold">Sunlight</span>
              </div>
              <div className="text-base font-mono font-bold text-white">{light.toFixed(0)}%</div>
              {/* Sunlight bar */}
              <div className="mt-2 h-1 rounded-full overflow-hidden bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${light}%`,
                    background: light > 50
                      ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                      : light > 10
                      ? 'linear-gradient(90deg,#0ea5e9,#7dd3fc)'
                      : '#6366f1',
                  }}
                />
              </div>
            </div>

            {/* Dynamic Salinity */}
            <div className="rounded-xl p-3 col-span-2 transition-all duration-200 hover:bg-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Droplets className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-[9px] font-mono text-white/50 uppercase tracking-wide font-semibold">Salinity Profile</span>
                <span className="ml-auto text-[11px] font-mono text-teal-400 font-bold">{dynamicSalinity} PSU</span>
              </div>
              {/* Salinity gradient bar visual */}
              <div className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(5, Math.min(100, ((dynamicSalinity - 32) / (37 - 32)) * 100))}%`,
                    background: 'linear-gradient(90deg, #14b8a6, #2dd4bf)',
                  }}
                />
              </div>
              <div className="flex justify-between text-[8px] font-mono text-white/30 mt-1">
                <span>32 PSU (Fresh Bay)</span>
                <span>37 PSU (Arabian Sea)</span>
              </div>
            </div>

            {/* Sound Velocity */}
            <div className="rounded-xl p-3 transition-all duration-200 hover:bg-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[9px] font-mono text-white/50 uppercase tracking-wide font-semibold">Sound Speed</span>
              </div>
              <div className="text-sm font-mono font-bold text-white">{soundSpeed} <span className="text-[10px] text-white/40 font-normal">m/s</span></div>
              <div className="text-[8px] font-mono text-sky-400/70 mt-0.5">Sonar SOFAR Axis</div>
            </div>

            {/* Seawater Density */}
            <div className="rounded-xl p-3 transition-all duration-200 hover:bg-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Waves className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[9px] font-mono text-white/50 uppercase tracking-wide font-semibold">Density</span>
              </div>
              <div className="text-sm font-mono font-bold text-white">{densityKg} <span className="text-[10px] text-white/40 font-normal">kg/m³</span></div>
              <div className="text-[8px] font-mono text-purple-400/70 mt-0.5">Pycnocline Stratum</div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── QUICK JUMP FOOTER ──────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t border-white/[0.08] px-3 py-2.5 bg-black/30"
      >
        {/* Zone quick-jump pills */}
        <div className="flex gap-1.5 mb-0">
          {[
            { label: '0m',    depth: 0    as DepthLevel },
            { label: '200m',  depth: 200  as DepthLevel },
            { label: '500m',  depth: 500  as DepthLevel },
            { label: '1000m', depth: 1000 as DepthLevel },
          ].map(({ label, depth: d }) => {
            const isHere = selectedDepth === d;
            const z = getZone(d);
            return (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className="flex-1 flex flex-col items-center py-2 rounded-xl text-[9px] font-mono transition-all duration-200 active:scale-95"
                style={{
                  background: isHere ? `${z.accentHex}25` : 'rgba(255,255,255,0.03)',
                  border: isHere ? `1px solid ${z.accentHex}60` : '1px solid rgba(255,255,255,0.07)',
                  color: isHere ? z.accentHex : 'rgba(255,255,255,0.5)',
                  boxShadow: isHere ? `0 0 12px ${z.accentHex}30` : 'none',
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full mb-1 transition-all duration-200"
                  style={{ background: isHere ? z.accentHex : 'rgba(255,255,255,0.25)' }}
                />
                <span className="font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
