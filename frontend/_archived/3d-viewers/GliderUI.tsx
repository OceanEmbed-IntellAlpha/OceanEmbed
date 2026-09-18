'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useGliderStore, GliderViewMode, GliderDiurnalMode } from './useGliderStore';
import { calculateGliderTelemetry, getGliderMissionStage } from './useGliderMission';
import { GLIDER_REGISTRY } from '@/lib/data/gliderRegistry';
import {
  Play,
  Pause,
  Layers,
  Box,
  Anchor,
  Eye,
  Camera,
  Sun,
  Moon,
  Sunset,
  Clock,
  Gauge,
  Compass,
  Battery,
  Tag,
  X,
  Maximize2,
  RotateCcw,
} from 'lucide-react';

const MODE_META: Record<
  GliderViewMode,
  { label: string; icon: React.ReactNode; accent: string; description: string }
> = {
  exterior: {
    label: 'Assembled',
    icon: <Eye size={13} />,
    accent: '#38bdf8',
    description:
      'High-endurance autonomous underwater glider designed for multi-month transoceanic basin surveys using buoyancy propulsion.',
  },
  cutaway: {
    label: 'Cutaway',
    icon: <Layers size={13} />,
    accent: '#a78bfa',
    description:
      'Translucent engineering cutaway revealing internal shifting battery mass, variable buoyancy engine, and science payload bay.',
  },
  exploded: {
    label: 'Exploded',
    icon: <Box size={13} />,
    accent: '#4ade80',
    description:
      'Multi-axis mechanical disassembly exposing internal hydraulic bladders, pitch-roll servo actuators, and carbon pressure hull sections.',
  },
  mission: {
    label: 'Sawtooth Mission',
    icon: <Anchor size={13} />,
    accent: '#f59e0b',
    description:
      'Authentic 1,000m oceanographic sawtooth glide profiling: continuous buoyancy shifts converting vertical ascent/descent into forward hydrodynamic thrust.',
  },
};

const DIURNAL_MODES: { id: GliderDiurnalMode; label: string; icon: React.ReactNode }[] = [
  { id: 'auto', label: 'Auto Diurnal', icon: <Clock size={12} /> },
  { id: 'noon', label: 'High Noon', icon: <Sun size={12} /> },
  { id: 'sunset', label: 'Sunset', icon: <Sunset size={12} /> },
  { id: 'night', label: 'Night', icon: <Moon size={12} /> },
];

function getDiurnalInfo(diurnalMode: GliderDiurnalMode, missionTime: number) {
  let solar = 0.5;
  if (diurnalMode === 'noon') solar = 0.5;
  else if (diurnalMode === 'sunset') solar = 0.75;
  else if (diurnalMode === 'night') solar = 0.0;
  else solar = 0.46 + missionTime * 0.12;

  const totalMinutes = Math.floor(solar * 24 * 60);
  const hours24 = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const timeStr = `${String(hours12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;

  let label = 'HIGH NOON';
  let icon = '☀️';
  let color = 'text-amber-300';

  if (solar >= 0.18 && solar < 0.32) {
    label = 'DAWN BROACH';
    icon = '🌅';
    color = 'text-orange-300';
  } else if (solar >= 0.32 && solar < 0.65) {
    label = 'SOLAR NOON';
    icon = '☀️';
    color = 'text-cyan-300';
  } else if (solar >= 0.65 && solar < 0.82) {
    label = 'GOLDEN SUNSET';
    icon = '🌇';
    color = 'text-amber-400';
  } else {
    label = 'STARRY NIGHT';
    icon = '🌙';
    color = 'text-blue-300';
  }

  return { timeStr, label, icon, color };
}

export default function GliderUI({ gliderId = 'GL-SLOCUM-G3' }: { gliderId?: string }) {
  const viewMode = useGliderStore((s) => s.viewMode);
  const setViewMode = useGliderStore((s) => s.setViewMode);

  const missionTime = useGliderStore((s) => s.missionTime);
  const setMissionTime = useGliderStore((s) => s.setMissionTime);
  const missionPlaying = useGliderStore((s) => s.missionPlaying);
  const setMissionPlaying = useGliderStore((s) => s.setMissionPlaying);
  const missionSpeed = useGliderStore((s) => s.missionSpeed);
  const setMissionSpeed = useGliderStore((s) => s.setMissionSpeed);

  const cameraMode = useGliderStore((s) => s.cameraMode);
  const setCameraMode = useGliderStore((s) => s.setCameraMode);
  const triggerCameraReset = useGliderStore((s) => s.triggerCameraReset);

  const diurnalMode = useGliderStore((s) => s.diurnalMode);
  const setDiurnalMode = useGliderStore((s) => s.setDiurnalMode);
  const diurnalInfo = useMemo(
    () => getDiurnalInfo(diurnalMode, missionTime),
    [diurnalMode, missionTime]
  );

  const showLabels = useGliderStore((s) => s.showLabels);
  const toggleLabels = useGliderStore((s) => s.toggleLabels);

  const selectedPart = useGliderStore((s) => s.selectedPart);
  const setSelectedPart = useGliderStore((s) => s.setSelectedPart);

  const telemetry = useGliderStore((s) => s.telemetry);
  const setTelemetry = useGliderStore((s) => s.setTelemetry);

  const missionStage = useGliderStore((s) => s.missionStage);
  const setMissionStage = useGliderStore((s) => s.setMissionStage);

  // Synchronize telemetry & stage whenever missionTime updates
  useEffect(() => {
    if (viewMode === 'mission') {
      const data = calculateGliderTelemetry(missionTime);
      setTelemetry(data);
      const stage = getGliderMissionStage(missionTime);
      setMissionStage(stage);
    }
  }, [missionTime, viewMode, setTelemetry, setMissionStage]);

  // Mission Playback Animation Loop
  const requestRef = useRef<number>();
  useEffect(() => {
    if (viewMode !== 'mission' || !missionPlaying) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    let lastTime = performance.now();
    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // 42 seconds nominal dive cycle at 1x speed (slow cinematic timelapse)
      const rate = (dt / 42) * missionSpeed;
      let nextTime = useGliderStore.getState().missionTime + rate;
      if (nextTime >= 1.0) nextTime = 0.0;

      setMissionTime(nextTime);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [missionPlaying, viewMode, missionSpeed, setMissionTime]);

  const currentMeta = MODE_META[viewMode];
  const selectedInfo = selectedPart ? GLIDER_REGISTRY[selectedPart] : null;

  return (
    <div className="absolute inset-0 pointer-events-none text-slate-100 z-10 flex flex-col justify-between select-none">
      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-5">
        {/* Left: Vehicle Metadata */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-[3px] h-9 rounded-full" style={{ backgroundColor: currentMeta.accent }} />
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: currentMeta.accent, boxShadow: `0 0 8px ${currentMeta.accent}` }}
              />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">
                Autonomous Vehicle · {gliderId}
              </span>
            </div>
            <h1 className="font-display text-lg font-bold text-white tracking-wide">
              SLOCUM G3 UNDERWATER GLIDER
            </h1>
          </div>
        </div>

        {/* Center: Mode Switcher */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 bg-[#020b14]/80 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-2xl">
          {(Object.keys(MODE_META) as GliderViewMode[]).map((mode) => {
            const meta = MODE_META[mode];
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] font-semibold transition-all duration-200
                  ${
                    active
                      ? 'bg-slate-800 text-white border border-slate-600 shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }
                `}
                style={{ borderColor: active ? meta.accent : undefined }}
              >
                <span style={{ color: active ? meta.accent : 'currentColor' }}>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Quick Telemetry Pills, Camera Reset, and Label Toggle */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Quick Wide View calibration button */}
          <button
            onClick={() => {
              if (viewMode === 'mission') setCameraMode('wide');
              triggerCameraReset();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-medium text-slate-300 hover:text-cyan-300 bg-slate-900/60 border-slate-700/60 hover:border-cyan-500/50 backdrop-blur-md transition-all shadow-sm"
            title="Calibrate / Reset Wide View"
          >
            <Maximize2 size={12} className="text-cyan-400" />
            <span>Wide View</span>
          </button>

          {viewMode !== 'mission' && (
            <button
              onClick={toggleLabels}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-medium transition-all
                ${
                  showLabels
                    ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                    : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-500'
                }
                backdrop-blur-md
              `}
            >
              <Tag size={12} />
              <span>Labels: {showLabels ? 'ON' : 'OFF'}</span>
            </button>
          )}

          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-slate-700/60 bg-[#020b14]/80 backdrop-blur-md font-mono text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <Gauge size={12} className="text-cyan-400" />
              <span>{telemetry.depth.toFixed(0)}m</span>
            </span>
            <span className="w-px h-3 bg-slate-700" />
            <span className="flex items-center gap-1">
              <Compass size={12} className="text-amber-400" />
              <span>{telemetry.pitch > 0 ? `+${telemetry.pitch}°` : `${telemetry.pitch}°`}</span>
            </span>
            <span className="w-px h-3 bg-slate-700" />
            <span className="flex items-center gap-1">
              <Battery size={12} className="text-emerald-400" />
              <span>{telemetry.batteryLevel.toFixed(0)}%</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── OCEANOGRAPHIC DEPTH SCALE (Sleek, minimal, research-grade) ── */}
      {viewMode === 'mission' && (
        <div className="pointer-events-none absolute left-5 top-[22%] bottom-[20%] flex flex-col justify-between items-start z-10 text-[10.5px] font-mono text-cyan-400/70 select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-px bg-cyan-400/50" />
            <span className="font-semibold text-cyan-300">0m</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-normal">Surface</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-px bg-slate-600/60" />
            <span>200m</span>
            <span className="text-[9px] text-slate-600 uppercase tracking-wider font-normal">Photic Base</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-px bg-cyan-400/50" />
            <span className="font-semibold text-cyan-300">700m</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-normal">Thermocline</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2.5 h-px bg-cyan-500/50" />
            <span className="font-semibold text-slate-300">1,000m</span>
            <span className="text-[9px] text-slate-600 uppercase tracking-wider font-normal">Glide Inflexion</span>
          </div>
        </div>
      )}

      {/* ── BOTTOM CONTROL DOCK ────────────────────────────────────── */}
      <div className="p-6 flex flex-col gap-3">
        {viewMode === 'mission' ? (
          <div className="pointer-events-auto p-3.5 rounded-2xl border border-slate-700/60 bg-[#020b14]/90 backdrop-blur-2xl shadow-2xl flex flex-col gap-3 max-w-4xl mx-auto w-full">
            {/* Mission Stage & Live Telemetry Bar */}
            <div className="flex items-center justify-between font-mono text-xs pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: missionStage.color }}
                />
                <span className="font-bold uppercase tracking-wider text-white text-[11px]">
                  {missionStage.name}
                </span>
                <span className="text-slate-600 hidden md:inline">·</span>
                <span className="text-slate-400 text-[11px] font-sans font-normal hidden lg:inline truncate max-w-md">
                  {missionStage.quote}
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-300 text-[11px]">
                <span className="font-semibold text-cyan-300">{telemetry.depth.toFixed(0)}m</span>
                <span className="text-slate-600">·</span>
                <span>Pitch {telemetry.pitch > 0 ? `+${telemetry.pitch}°` : `${telemetry.pitch}°`}</span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-300">
                  VBE {telemetry.displacement > 0 ? `+${telemetry.displacement} cc` : `${telemetry.displacement} cc`}
                </span>
              </div>
            </div>

            {/* Scrubber & Timeline Bar */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMissionPlaying(!missionPlaying)}
                className="w-9 h-9 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300 transition-all shrink-0"
              >
                {missionPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
              </button>

              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between font-mono text-[10px] text-slate-400">
                  <span>Surface 0m</span>
                  <span className="font-semibold text-white">
                    {Math.round(missionTime * 100)}% · Depth {telemetry.depth.toFixed(0)}m
                  </span>
                  <span>Deep Apex 1,000m</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={missionTime}
                  onChange={(e) => setMissionTime(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                {[1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setMissionSpeed(spd)}
                    className={`
                      px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-colors
                      ${
                        missionSpeed === spd
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }
                    `}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Camera Mode Segmented Selector */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    setCameraMode('wide');
                    triggerCameraReset();
                  }}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all
                    ${
                      cameraMode === 'wide'
                        ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-white'
                    }
                  `}
                  title="Wide View: Full 1,000m sawtooth mission overview"
                >
                  <Maximize2 size={13} />
                  <span>Wide View</span>
                </button>

                <button
                  onClick={() => setCameraMode('chase')}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all
                    ${
                      cameraMode === 'chase'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-white'
                    }
                  `}
                  title="3D Chase: Hydrodynamic follow camera"
                >
                  <Camera size={13} />
                  <span>3D Chase</span>
                </button>
              </div>

              {/* Diurnal Selector & Live Timelapse Clock */}
              <div className="flex items-center gap-2 bg-slate-900/80 p-1 pl-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 font-mono text-[10px] select-none">
                  <span>{diurnalInfo.icon}</span>
                  <span className={`font-bold ${diurnalInfo.color}`}>{diurnalInfo.timeStr}</span>
                  <span className="text-slate-500 hidden sm:inline font-medium">· {diurnalInfo.label}</span>
                </div>

                <div className="h-4 w-px bg-slate-800" />

                <div className="flex items-center gap-0.5">
                  {DIURNAL_MODES.map((dm) => (
                    <button
                      key={dm.id}
                      onClick={() => setDiurnalMode(dm.id)}
                      className={`
                        p-1.5 rounded-lg font-mono text-xs transition-colors
                        ${
                          diurnalMode === dm.id
                            ? 'bg-slate-700 text-cyan-300 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }
                      `}
                      title={dm.label}
                    >
                      {dm.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* CAD Inspection Telemetry Bar */
          <div className="pointer-events-auto flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-[#020b14]/80 backdrop-blur-xl max-w-2xl mx-auto w-full font-mono text-xs">
            <span className="text-slate-400 leading-relaxed">{currentMeta.description}</span>
            <button
              onClick={triggerCameraReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/60 bg-slate-900/60 shrink-0 ml-4 transition-colors font-mono text-xs"
              title="Reset camera framing"
            >
              <RotateCcw size={12} />
              <span>Reset View</span>
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT COMPONENT INSPECTOR DRAWER ────────────────────────── */}
      {selectedInfo && (
        <div className="absolute right-6 top-20 bottom-24 w-80 pointer-events-auto bg-[#020b14]/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl shadow-2xl p-5 flex flex-col overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-1.5">
                {selectedInfo.category}
              </span>
              <h2 className="font-display text-base font-bold text-white leading-tight">
                {selectedInfo.title}
              </h2>
              <span className="font-mono text-[10px] text-slate-400">
                {selectedInfo.sub}
              </span>
            </div>
            <button
              onClick={() => setSelectedPart(null)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-slate-300 font-ui leading-relaxed mb-4 pb-3 border-b border-slate-800">
            {selectedInfo.description}
          </p>

          <h3 className="font-mono text-[10px] tracking-widest text-slate-400 uppercase font-semibold mb-2">
            Engineering Specifications
          </h3>
          <div className="space-y-2 font-mono text-[11px]">
            {Object.entries(selectedInfo.specs).map(([key, val]) => (
              <div key={key} className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">{key}</span>
                <span className="text-slate-200 font-medium text-right ml-2">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
