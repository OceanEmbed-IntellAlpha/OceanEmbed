'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSubsurfaceProfile } from '@/lib/api/queries';
import { DEPTH_LEVELS, type DepthLevel } from '@/lib/api/types';
import { getZone, interpolate, ZONES, OCEAN_ORGANISM_CATALOG, type OrganismInfo } from '@/components/cutaway/utils';
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
  BookOpen,
  X,
  Layers,
  CheckCircle2,
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

export default function CutawayStandalonePage() {
  const selectedLat = useExplorerStore((s) => s.selectedLat) ?? 12.5;
  const selectedLon = useExplorerStore((s) => s.selectedLon) ?? 82.5;
  const setSelectedPoint = useExplorerStore((s) => s.setSelectedPoint);
  const selectedDate = useExplorerStore((s) => s.selectedDate);
  const selectedDepth = useExplorerStore((s) => s.selectedDepth);
  const setDepth = useExplorerStore((s) => s.setDepth);

  const [isAutoDiving, setIsAutoDiving] = useState(false);
  const [selectedOrganism, setSelectedOrganism] = useState<OrganismInfo | null>(null);
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>('all');
  const [showZoneMatrixModal, setShowZoneMatrixModal] = useState(false);

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

  // Filtered organisms list
  const filteredOrganisms = useMemo(() => {
    if (activeZoneFilter === 'all') return OCEAN_ORGANISM_CATALOG;
    return OCEAN_ORGANISM_CATALOG.filter((o) => o.zoneId === activeZoneFilter);
  }, [activeZoneFilter]);

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
              5 Oceanic Strata
            </span>
          </div>
        </div>

        {/* Center/Right: Zone Matrix Button & Basin Preset Switcher */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowZoneMatrixModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all active:scale-95"
          >
            <BookOpen size={13} />
            <span>Zone Matrix Guide</span>
          </button>

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

      {/* ── LEFT PANEL: ORGANISM & STRATA BROWSER ──────────────────────── */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-20 left-4 z-40 w-80 max-h-[calc(100vh-130px)] pointer-events-auto flex flex-col gap-2.5"
      >
        {/* Organisms & Zones Card */}
        <div className="rounded-2xl bg-black/75 border border-white/12 backdrop-blur-2xl p-3.5 shadow-2xl flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2.5 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
              <Fish size={15} className="text-cyan-400" />
              <span>Marine Fauna Catalog</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-400/20">
              {filteredOrganisms.length} Species
            </span>
          </div>

          {/* Zone Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 scrollbar-none">
            {[
              { id: 'all', label: 'All' },
              { id: 'epipelagic', label: 'Sunlight' },
              { id: 'mesopelagic', label: 'Twilight' },
              { id: 'bathypelagic', label: 'Midnight' },
              { id: 'abyssopelagic', label: 'Abyssal' },
              { id: 'hadopelagic', label: 'Hadal' },
            ].map((tab) => {
              const active = activeZoneFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveZoneFilter(tab.id)}
                  className={`px-2 py-1 rounded-md text-[9px] font-mono whitespace-nowrap transition-all ${
                    active
                      ? 'bg-cyan-400 text-black font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                      : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable Organisms List */}
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[380px] pr-1 scrollbar-thin scrollbar-thumb-white/20">
            {filteredOrganisms.map((org) => {
              const isTargetActive = Math.abs(selectedDepth - org.targetDepth) < 30;
              return (
                <div
                  key={org.id}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all border ${
                    isTargetActive
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-white shadow-[0_0_14px_rgba(6,182,212,0.25)]'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  {/* Click row to dive to organism habitat */}
                  <button
                    onClick={() => {
                      setIsAutoDiving(false);
                      setDepth(org.targetDepth as DepthLevel);
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                    title={`Dive to ${org.name} habitat (${org.targetDepth}m)`}
                  >
                    <span className="text-xl shrink-0">{org.icon}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-semibold truncate leading-tight">{org.name}</span>
                      <span className="text-[9px] font-mono text-cyan-400/80 italic truncate">{org.scientificName}</span>
                      <span className="text-[8px] font-mono text-slate-400 truncate">{org.depthRange}</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span
                      onClick={() => {
                        setIsAutoDiving(false);
                        setDepth(org.targetDepth as DepthLevel);
                      }}
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                        isTargetActive ? 'bg-cyan-400 text-black' : 'text-slate-400 bg-white/5 hover:text-cyan-300'
                      }`}
                    >
                      {org.targetDepth}m
                    </span>

                    {/* Info button to open dossier modal */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrganism(org);
                      }}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 flex items-center justify-center transition-colors"
                      title="Inspect Organism Adaptations & Ecology"
                    >
                      <Info size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Interaction Tip */}
        <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 backdrop-blur-xl text-[10px] font-mono text-slate-400 flex items-center gap-2">
          <Compass size={13} className="text-cyan-400 shrink-0" />
          <span>Scroll mouse wheel to dive smoothly through all 5 oceanic layers.</span>
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

      {/* ── ORGANISM DETAIL DOSSIER MODAL ────────────────────────────── */}
      <AnimatePresence>
        {selectedOrganism && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg rounded-2xl bg-[#030914] border border-cyan-500/30 p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col gap-4 text-slate-100"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedOrganism(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>

              {/* Title & Scientific Identity */}
              <div className="flex items-start gap-4 pr-8">
                <span className="text-4xl p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                  {selectedOrganism.icon}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">{selectedOrganism.name}</h3>
                  <p className="text-xs font-mono text-cyan-300 italic">{selectedOrganism.scientificName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      {selectedOrganism.zoneName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Depth: {selectedOrganism.depthRange}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Environmental Factor Banner */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                    Key Environmental Factor
                  </span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">
                    {selectedOrganism.factor}
                  </span>
                </div>
                <Sparkles size={18} className="text-cyan-400 shrink-0" />
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedOrganism.desc}
              </p>

              {/* Adaptations */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Evolutionary Adaptations
                </span>
                <div className="flex flex-col gap-1.5">
                  {selectedOrganism.adaptations.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-200">
                      <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diet */}
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] text-slate-400 uppercase">Typical Diet</span>
                <span className="text-slate-200 font-medium">{selectedOrganism.diet}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10 mt-1">
                <button
                  onClick={() => setSelectedOrganism(null)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsAutoDiving(false);
                    setDepth(selectedOrganism.targetDepth as DepthLevel);
                    setSelectedOrganism(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2"
                >
                  <span>Dive to Habitat ({selectedOrganism.targetDepth}m)</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ZONE REFERENCE MATRIX MODAL ───────────────────────────────── */}
      <AnimatePresence>
        {showZoneMatrixModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-[#020712] border border-cyan-500/30 p-6 shadow-2xl flex flex-col text-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <Layers size={18} className="text-cyan-400" />
                  <div>
                    <h2 className="text-base font-bold text-white tracking-wide">
                      Oceanic Depth Stratification Matrix
                    </h2>
                    <p className="text-xs font-mono text-slate-400">
                      5 Primary Pelagic Strata, Key Environmental Factors & Representative Organisms
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowZoneMatrixModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto my-4 scrollbar-thin scrollbar-thumb-white/20">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-mono text-cyan-400 uppercase tracking-wider bg-white/[0.02]">
                      <th className="py-3 px-3">Zone</th>
                      <th className="py-3 px-3">Depth Range</th>
                      <th className="py-3 px-3">Key Environmental Factor</th>
                      <th className="py-3 px-3">Representative Organisms</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {ZONES.map((z) => (
                      <tr key={z.id} className="hover:bg-cyan-500/5 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: z.accentHex }}
                            />
                            <span>{z.name} ({z.alias})</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-cyan-300 font-medium">
                          {z.depthRange}
                        </td>
                        <td className="py-3 px-3 text-slate-200">
                          {z.factor}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <div className="flex flex-wrap gap-1">
                            {z.representativeOrganisms.map((org, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-slate-200"
                              >
                                {org}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setActiveZoneFilter(z.id);
                              setShowZoneMatrixModal(false);
                              if (z.id === 'epipelagic') setDepth(20);
                              else if (z.id === 'mesopelagic') setDepth(500);
                              else if (z.id === 'bathypelagic') setDepth(700);
                              else if (z.id === 'abyssopelagic') setDepth(1000);
                              else if (z.id === 'hadopelagic') setDepth(1000);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 transition-colors"
                          >
                            Explore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Total Oceanic Depth: 0m to 11,000m (Mariana Trench Challenger Deep)</span>
                <button
                  onClick={() => setShowZoneMatrixModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-cyan-400 text-black font-bold text-xs hover:bg-cyan-300 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
