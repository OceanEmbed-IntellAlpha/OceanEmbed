'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Waves, Radio, Activity, Compass, Database } from 'lucide-react';

interface OceanSonicLoaderProps {
  message?: string;
  submessage?: string;
  fullscreen?: boolean;
}

const TELEMETRY_STEPS = [
  'CONNECTING TO CLOUDFLARE R2 DATA LAKE',
  'STREAMING SATELLITE CHUNKS (SST, SSS, SLA, ADT, WINDS)',
  'SYNCHRONIZING INCOIS ARGO FLOAT CATALOG VIA SUPABASE',
  'CALIBRATING 15-DEPTH CANONICAL VERTICAL GRID',
  'INITIALIZING OCEANEMBED V2 U-NET INFERENCE ENGINE',
  'SYNCHRONIZING 3D DIGITAL TWIN BATHYMETRY',
];

export function OceanSonicLoader({
  message = 'Initializing OceanEmbed Core',
  submessage = 'Streaming multi-dimensional oceanographic tensors from Cloudflare R2',
  fullscreen = true,
}: OceanSonicLoaderProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % TELEMETRY_STEPS.length);
    }, 2200);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const jump = Math.floor(Math.random() * 8) + 4;
        return Math.min(prev + jump, 95);
      });
    }, 400);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const content = (
    <div className="relative flex flex-col items-center justify-center p-8 max-w-lg w-full text-center select-none">
      {/* Background ambient water glow */}
      <div className="absolute w-96 h-96 bg-gradient-to-tr from-cyan-500/10 via-indigo-500/10 to-teal-400/5 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-slow" />

      {/* ── Outer Sonar HUD Ring ── */}
      <div className="relative w-44 h-44 mb-8 flex items-center justify-center">
        {/* Fixed outer calibrated compass ticks */}
        <div className="absolute inset-0 rounded-full border border-cyan-500/20" />
        <div className="absolute inset-2 rounded-full border border-dashed border-cyan-400/30 animate-[spin_40s_linear_infinite]" />
        <div className="absolute inset-5 rounded-full border border-indigo-500/20 animate-[spin_25s_linear_infinite_reverse]" />
        <div className="absolute inset-8 rounded-full border border-teal-400/20" />

        {/* Pulse Ripple Wave 1 */}
        <motion.div
          animate={{ scale: [0.6, 1.3], opacity: [0.8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border border-cyan-400/50 shadow-[0_0_15px_rgba(0,210,255,0.4)]"
        />

        {/* Pulse Ripple Wave 2 */}
        <motion.div
          animate={{ scale: [0.4, 1.2], opacity: [0.9, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: 0.8, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border border-teal-400/40"
        />

        {/* Rotating Sonar Radar Sweep Beam */}
        <div
          className="absolute inset-2 rounded-full overflow-hidden"
          style={{ animation: 'sonar-sweep 2.2s linear infinite' }}
        >
          <div
            className="absolute top-1/2 left-1/2 w-1/2 h-px origin-left"
            style={{
              background: 'linear-gradient(to right, rgba(0, 210, 255, 1), rgba(0, 210, 255, 0))',
              boxShadow: '0 0 10px rgba(0, 210, 255, 0.8)',
            }}
          />
        </div>

        {/* Center Submersible / Satellite Sensor Core */}
        <div className="relative z-10 w-16 h-16 rounded-full bg-[#050A10]/90 border border-cyan-400/50 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(0,210,255,0.3)]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          >
            <Compass className="text-cyan-400" size={26} />
          </motion.div>
        </div>

        {/* Bathymetry Depth Badges */}
        <div className="absolute -top-3 px-2 py-0.5 rounded bg-[#050A10]/90 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 tracking-wider">
          0m SURFACE
        </div>
        <div className="absolute -bottom-3 px-2 py-0.5 rounded bg-[#050A10]/90 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 tracking-wider">
          1000m ABYSS
        </div>
        <div className="absolute -left-6 px-1.5 py-0.5 rounded bg-[#050A10]/90 border border-cyan-500/30 text-[8px] font-mono text-cyan-400/70">
          5°N
        </div>
        <div className="absolute -right-7 px-1.5 py-0.5 rounded bg-[#050A10]/90 border border-cyan-500/30 text-[8px] font-mono text-cyan-400/70">
          30°N
        </div>
      </div>

      {/* ── Title & Status Header ── */}
      <div className="flex items-center gap-2 mb-2">
        <Waves className="text-cyan-400 animate-pulse" size={18} />
        <h2 className="font-display font-bold text-lg md:text-xl text-white tracking-wider uppercase drop-shadow-[0_0_12px_rgba(0,210,255,0.4)]">
          {message}
        </h2>
      </div>

      <p className="font-mono text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
        {submessage}
      </p>

      {/* ── Live Telemetry Cycling Ticker ── */}
      <div className="w-full bg-[#050A10]/80 border border-cyan-500/20 rounded-lg p-2.5 mb-5 backdrop-blur-md flex items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <AnimatePresence mode="wait">
            <motion.span
              key={stepIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.25 }}
              className="font-mono text-[11px] text-cyan-300 tracking-wider truncate uppercase text-left"
            >
              {TELEMETRY_STEPS[stepIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono text-zinc-400">
          <Database size={11} className="text-cyan-400" />
          <span>R2 + PG</span>
        </div>
      </div>

      {/* ── High-Tech Glowing Progress Bar ── */}
      <div className="w-full space-y-1.5">
        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5 relative p-0.5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 shadow-[0_0_10px_rgba(0,210,255,0.8)] relative"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.3 }}
          >
            {/* Light streak */}
            <div className="absolute right-0 top-0 bottom-0 w-3 bg-white blur-[1px] rounded-full" />
          </motion.div>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>NORTH INDIAN OCEAN (PS 26066)</span>
          <span className="text-cyan-400 font-bold">{progress}% READY</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes sonar-sweep {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#03070C] flex items-center justify-center overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,210,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40" />
        {content}
      </div>
    );
  }

  return content;
}
