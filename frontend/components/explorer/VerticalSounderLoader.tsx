'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Layers, Cpu, Database } from 'lucide-react';

const DEPTH_STAGES = [
  '0.49m (Surface Skin)',
  '26.84m (Mixed Layer)',
  '99.45m (Thermocline Core)',
  '233.07m (Subsurface)',
  '541.09m (Intermediate Water)',
  '902.34m (Deep Boundary)',
];

export function VerticalSounderLoader({ lat, lon, date }: { lat?: number; lon?: number; date?: string }) {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIdx((prev) => (prev + 1) % DEPTH_STAGES.length);
    }, 450);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-grow flex flex-col items-center justify-center min-h-[320px] p-6 text-center select-none relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,210,255,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* ── Sounder Scanner Column Graphic ── */}
      <div className="relative w-48 h-36 bg-[#04080E]/90 border border-cyan-500/30 rounded-xl p-3 mb-5 flex flex-col justify-between overflow-hidden shadow-[0_0_20px_rgba(0,210,255,0.15)]">
        {/* Background vertical depth grid lines */}
        <div className="absolute inset-0 grid grid-cols-6 divide-x divide-cyan-500/10 opacity-60 pointer-events-none" />
        <div className="absolute inset-0 grid grid-rows-5 divide-y divide-cyan-500/10 opacity-60 pointer-events-none" />

        {/* Descending Laser Scanner Beam */}
        <motion.div
          animate={{ y: [0, 115, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(0,210,255,1)] z-10"
        />

        {/* 15 Simulated Depth Bars */}
        <div className="flex items-end justify-between gap-1 h-20 px-1 relative z-0">
          {[65, 80, 95, 90, 75, 60, 48, 40, 34, 30, 26, 22, 19, 16, 14].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 4 }}
              animate={{ height: [`${h * 0.4}%`, `${h}%`, `${h * 0.6}%`] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                delay: i * 0.08,
                ease: 'easeInOut',
              }}
              className="flex-1 rounded-t bg-gradient-to-t from-cyan-900/40 via-cyan-500/60 to-cyan-300"
            />
          ))}
        </div>

        {/* Bottom Sounder Tag */}
        <div className="flex items-center justify-between text-[9px] font-mono text-cyan-400/80 pt-1 border-t border-cyan-500/20">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            15 DEPTH LEVELS
          </span>
          <span className="text-zinc-500">GLORYS12V1</span>
        </div>
      </div>

      {/* ── Status Text & Coordinates ── */}
      <div className="space-y-1.5">
        <h4 className="font-mono text-xs text-white uppercase tracking-widest font-semibold flex items-center justify-center gap-2 drop-shadow-[0_0_8px_rgba(0,210,255,0.4)]">
          <Cpu size={14} className="text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
          Reconstructing Subsurface Profile
        </h4>

        {lat !== undefined && lon !== undefined && (
          <p className="text-[10px] font-mono text-cyan-300 tracking-wider">
            TARGET: {lat.toFixed(2)}°N, {lon.toFixed(2)}°E {date ? `• ${date}` : ''}
          </p>
        )}

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#050A10] border border-cyan-500/30 text-[10px] font-mono text-zinc-300 mt-2">
          <Database size={11} className="text-cyan-400" />
          <span>Sounding:</span>
          <span className="text-cyan-400 font-bold">{DEPTH_STAGES[stageIdx]}</span>
        </div>
      </div>
    </div>
  );
}
