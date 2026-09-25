'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSubsurfaceProfile } from '@/lib/api/queries';
import { DEPTH_LEVELS, type DepthLevel } from '@/lib/api/types';
import { getZone, interpolate } from '@/components/cutaway/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Compass,
  Gauge,
  Thermometer,
  Waves,
  Sun,
  Eye,
  EyeOff,
  Zap,
  Droplets,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  Fish,
} from 'lucide-react';

// Dynamic import of 3D Cutaway with SSR disabled
const SplitOceanViz = dynamic(
  () => import('@/components/globe/SplitOceanViz'),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-full bg-[#010408] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-0.5 bg-cyan-400/30 relative overflow-hidden rounded">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-cyan-400 animate-pulse rounded" />
          </div>
          <p className="font-mono text-xs text-cyan-300/70 tracking-widest uppercase">
            Loading 3D Ocean Volume & Ecosystem
          </p>
        </div>
      </div>
    ),
  }
);

// Geographic Basin Presets across the Indian Ocean
const BASIN_PRESETS = [
  { name: 'Bay of Bengal', lat: 12.5, lon: 82.5, desc: 'Low salinity surface layer from river discharge, sharp halocline' },
  { name: 'Arabian Sea', lat: 15.0, lon: 68.0, desc: 'High salinity from excessive evaporation, intense oxygen minimum zone' },
  { name: 'Equatorial Indian Ocean', lat: 0.0, lon: 75.0, desc: 'Equatorial undercurrents & stable thermocline stratification' },
  { name: 'South Indian Basin', lat: -15.0, lon: 85.0, desc: 'Subtropical gyre with deep photic penetration & colder depths' },
];

// Key Organism Navigation Targets
const FAUNA_TARGETS: { name: string; depth: DepthLevel; icon: string; zone: string; desc: string }[] = [
  { name: 'Skipjack & Mackerel Shoal', depth: 20, icon: '🐟', zone: 'Epipelagic (0–100m)', desc: 'Surface schooling fish reflecting sunlight glints' },
  { name: 'Moon Jellyfish Swarm', depth: 75, icon: '🪼', zone: 'Upper Thermocline', desc: 'Aurelia aurita with translucent bells & pulsing tentacles' },
  { name: 'Z20 Thermocline Boundary', depth: 100, icon: '🌊', zone: 'Thermocline Core', desc: '20°C isotherm internal density wave & pycnocline layer' },
  { name: 'Photophore Lanternfish', depth: 500, icon: '✨', zone: 'Mesopelagic Twilight', desc: 'Myctophidae emitting ventral counter-illumination' },
  { name: 'Black Seadevil Anglerfish', depth: 700, icon: '🎣', zone: 'Bathypelagic Abyss', desc: 'Melanocetus lurking with real dynamic point-light lure' },
];

export default function CutawayStandalonePage() {
  const selectedLat = useExplorerStore((s) => s.selectedLat) ?? 12.5;
  const selectedLon = useExplorerStore((s) => s.selectedLon) ?? 82.5;
  const setSelectedPoint = useExplorerStore((s) => s.setSelectedPoint);
  const selectedDate = useExplorerStore((s) => s.selectedDate);
  const selectedDepth = useExplorerStore((s) => s.selectedDepth);
  const setDepth = useExplorerStore((s) => s.setDepth);

  const [isAutoDiving, setIsAutoDiving] = useState(false);
  const [showFaunaMenu, setShowFaunaMenu] = useState(true);

  // Fetch model predicted profile
  const { data: profile } = useSubsurfaceProfile({
    lat: selectedLat,
    lon: selectedLon,
    date: selectedDate,
  });

  const depths = useMemo(() => profile?.depths ?? DEPTH_LEVELS, [profile]);
  const temperatures = useMemo(
    () => profile?.temperature ?? [28.6, 28.5, 28.4, 28.1, 27.5, 26.0, 23.4, 20.8, 18.5, 16.2, 14.1, 10.8, 7.2, 6.1, 5.4],
    [profile]
  );
  const currentTemp = useMemo(() => interpolate(depths, temperatures, selectedDepth), [depths, temperatures, selectedDepth]);
  const zone = useMemo(() => getZone(selectedDepth), [selectedDepth]);

  // Scientific Physics Calculations
  const pressureAtm = ((selectedDepth / 10) + 1).toFixed(1);
  const lightPercent = Math.max(0, 100 * Math.exp(-0.015 * selectedDepth)).toFixed(0);

  const dynamicSalinity = useMemo(() => {
    let baseSalinity = 35.0;
    if (selectedLat > 10 && selectedLon >= 78) baseSalinity = 32.8; // Bay of Bengal
    else if (selectedLat > 10 && selectedLon < 78) baseSalinity = 36.4; // Arabian Sea
    else baseSalinity = 34.8;
    const depthFactor = Math.sin(Math.min(selectedDepth, 600) / 600 * Math.PI) * 0.85;
    return Number((baseSalinity + depthFactor).toFixed(2));
  }, [selectedLat, selectedLon, selectedDepth]);

  const soundSpeed = useMemo(() => {
    const T = currentTemp;
    const S = dynamicSalinity;
    const D = selectedDepth;
    const v = 1449.2 + (4.6 * T) - (0.055 * T * T) + (0.00029 * T * T * T) + (1.34 - 0.01 * T) * (S - 35) + (0.016 * D);
    return Math.round(v);
  }, [currentTemp, dynamicSalinity, selectedDepth]);

  // Auto dive loop
  React.useEffect(() => {
    if (!isAutoDiving) return;
    const timer = setInterval(() => {
      const currentIdx = DEPTH_LEVELS.indexOf(selectedDepth as DepthLevel);
      const nextIdx = (currentIdx + 1) % DEPTH_LEVELS.length;
      setDepth(DEPTH_LEVELS[nextIdx]);
    }, 1200);
    return () => clearInterval(timer);
  }, [isAutoDiving, selectedDepth, setDepth]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#010408] text-slate-100 select-none font-ui">
      {/* ── 3D Full-Bleed Ocean Cutaway Canvas ────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <SplitOceanViz standalone />
      </div>

      {/* ── TOP HEADER HUD ───────────────────────────────────────────── */}
      <header className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        {/* Left: Back Link & Observatory Branding */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/explorer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium text-slate-300 hover:text-white bg-black/50 hover:bg-black/70 border border-white/10 backdrop-blur-xl transition-all shadow-lg active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>Explorer Globe</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-white/10 backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <h1 className="font-mono text-xs font-bold uppercase tracking-widest text-white">
              3D Ocean Cutaway Observatory
            </h1>
            <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Stratified Ecosystem
            </span>
          </div>
        </div>

        {/* Center/Right: Basin Preset Switcher */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/50 border border-white/10 backdrop-blur-xl">
            {BASIN_PRESETS.map((p) => {
              const isSelected = Math.abs(selectedLat - p.lat) < 1 && Math.abs(selectedLon - p.lon) < 1;
              return (
                <button
                  key={p.name}
                  onClick={() => setSelectedPoint(p.lat, p.lon)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                  title={p.desc}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── LEFT PANEL: ORGANISM & DEPTH TARGET SELECTOR ──────────────── */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-20 left-4 z-40 w-72 pointer-events-auto flex flex-col gap-3"
      >
        {/* Toggleable Fauna Quick Jump Card */}
        <div className="rounded-2xl bg-black/60 border border-white/10 backdrop-blur-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
              <Fish size={14} className="text-cyan-400" />
              <span>Marine Fauna Jump</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400/70">5 Strata</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {FAUNA_TARGETS.map((target) => {
              const isActive = selectedDepth === target.depth;
              return (
                <button
                  key={target.name}
                  onClick={() => setDepth(target.depth)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 border border-cyan-400/50 text-white shadow-[0_0_16px_rgba(6,182,212,0.25)]'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">{target.icon}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-medium truncate">{target.name}</span>
                      <span className="text-[9px] font-mono text-slate-400 truncate">{target.zone}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-cyan-400 text-black' : 'text-slate-400 bg-white/5'}`}>
                    {target.depth}m
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Interaction Tip */}
        <div className="p-3 rounded-xl bg-black/40 border border-white/5 backdrop-blur-xl text-[10px] font-mono text-slate-400 flex items-center gap-2">
          <Compass size={13} className="text-cyan-400 shrink-0" />
          <span>Use mouse scroll wheel to dive / ascend through depths smoothly.</span>
        </div>
      </motion.aside>

      {/* ── RIGHT PANEL: LIVE OCEANOGRAPHIC TELEMETRY ─────────────────── */}
      <motion.aside
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-20 right-4 z-40 w-72 pointer-events-auto flex flex-col gap-3"
      >
        <div className="rounded-2xl bg-black/60 border border-white/10 backdrop-blur-2xl p-4 shadow-2xl flex flex-col gap-3.5">
          {/* Depth & Zone Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-3">
            <div>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-semibold">Active Stratum</span>
              <h2 className="text-sm font-bold text-white mt-0.5">{zone.name} Zone</h2>
              <span className="text-[10px] font-mono text-cyan-400">{zone.alias}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-mono font-bold text-white leading-none">{selectedDepth}</span>
              <span className="text-xs font-mono text-slate-400 ml-1">m</span>
            </div>
          </div>

          {/* Big Temperature Hero Readout */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-950/40 to-black/60 border border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Thermometer size={18} className="text-cyan-400" />
              <div>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Predicted Temp</span>
                <span className="text-xl font-mono font-bold text-cyan-300">{currentTemp.toFixed(1)}°C</span>
              </div>
            </div>
            <div className="text-right text-[9px] font-mono text-slate-400">
              <span>OceanEmbed</span>
              <div className="text-[8px] text-emerald-400 font-semibold">ML INFERENCE</div>
            </div>
          </div>

          {/* Physics Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Pressure */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-1.5 text-slate-400 text-[9px] uppercase mb-1">
                <Gauge size={11} className="text-cyan-400" />
                <span>Pressure</span>
              </div>
              <div className="font-bold text-white">{pressureAtm} <span className="text-[9px] text-slate-400">atm</span></div>
            </div>

            {/* Sunlight */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-1.5 text-slate-400 text-[9px] uppercase mb-1">
                <Sun size={11} className="text-amber-400" />
                <span>Sunlight</span>
              </div>
              <div className="font-bold text-white">{lightPercent}%</div>
            </div>

            {/* Salinity */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-1.5 text-slate-400 text-[9px] uppercase mb-1">
                <Droplets size={11} className="text-teal-400" />
                <span>Salinity</span>
              </div>
              <div className="font-bold text-teal-300">{dynamicSalinity} <span className="text-[9px]">PSU</span></div>
            </div>

            {/* Sound Speed */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-1.5 text-slate-400 text-[9px] uppercase mb-1">
                <Zap size={11} className="text-sky-400" />
                <span>Sound Spd</span>
              </div>
              <div className="font-bold text-sky-300">{soundSpeed} <span className="text-[9px]">m/s</span></div>
            </div>
          </div>

          {/* Coordinate Indicator */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Location:</span>
            <span className="text-slate-200">
              {selectedLat.toFixed(2)}°{selectedLat >= 0 ? 'N' : 'S'}, {selectedLon.toFixed(2)}°{selectedLon >= 0 ? 'E' : 'W'}
            </span>
          </div>
        </div>
      </motion.aside>

      {/* ── BOTTOM DEPTH SCRUBBER BAR ─────────────────────────────────── */}
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-4xl pointer-events-auto">
        <div className="px-6 py-3.5 rounded-2xl bg-black/75 border border-white/12 backdrop-blur-2xl shadow-2xl flex items-center gap-5">
          {/* Play/Pause Auto-Dive */}
          <button
            onClick={() => setIsAutoDiving(!isAutoDiving)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isAutoDiving
                ? 'bg-cyan-500 text-black shadow-[0_0_16px_rgba(6,182,212,0.6)]'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
            title={isAutoDiving ? 'Pause Auto-Dive' : 'Start Auto-Dive Sequence'}
          >
            {isAutoDiving ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
          </button>

          {/* Reset to Surface (0m) */}
          <button
            onClick={() => {
              setIsAutoDiving(false);
              setDepth(0);
            }}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all"
            title="Reset to Surface (0m)"
          >
            <RotateCcw size={13} />
          </button>

          {/* Depth Level Ticks & Range */}
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="text-cyan-400 font-bold">Surface 0m</span>
              <span className="text-amber-400">Thermocline (50–200m)</span>
              <span className="text-indigo-400">Twilight (200–1000m)</span>
            </div>

            {/* Snap button row */}
            <div className="flex items-center justify-between gap-1">
              {DEPTH_LEVELS.map((d) => {
                const isActive = selectedDepth === d;
                const isThermocline = d >= 50 && d <= 200;
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setIsAutoDiving(false);
                      setDepth(d);
                    }}
                    className={`flex-1 py-1 rounded text-[9px] font-mono transition-all ${
                      isActive
                        ? 'bg-cyan-400 text-black font-bold shadow-[0_0_10px_rgba(6,182,212,0.8)] scale-105'
                        : isThermocline
                        ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
