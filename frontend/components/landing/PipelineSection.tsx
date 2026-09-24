'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Real 15 SIH depth levels, rounded to whole meters for clean display.
// Underlying model outputs the exact depths noted in the comment.
// Temps are mean 2022 GLORYS test-set values at each depth.
const DEPTH_LEVELS = [
  { depth: 0,    realDepth: 0.49,   temp: 28.6, isThermocline: false },
  { depth: 5,    realDepth: 5.08,   temp: 28.5, isThermocline: false },
  { depth: 10,   realDepth: 9.57,   temp: 28.4, isThermocline: false },
  { depth: 18,   realDepth: 18.50,  temp: 28.2, isThermocline: false },
  { depth: 29,   realDepth: 29.44,  temp: 27.9, isThermocline: false },
  { depth: 47,   realDepth: 47.37,  temp: 27.2, isThermocline: true  },
  { depth: 78,   realDepth: 77.85,  temp: 25.1, isThermocline: true  },
  { depth: 92,   realDepth: 92.33,  temp: 23.8, isThermocline: true  },
  { depth: 131,  realDepth: 130.67, temp: 19.8, isThermocline: true  },
  { depth: 156,  realDepth: 155.85, temp: 17.8, isThermocline: true  },
  { depth: 186,  realDepth: 186.13, temp: 16.0, isThermocline: true  },
  { depth: 318,  realDepth: 318.13, temp: 12.7, isThermocline: false },
  { depth: 541,  realDepth: 541.09, temp: 10.9, isThermocline: false },
  { depth: 644,  realDepth: 643.57, temp: 10.1, isThermocline: false },
  { depth: 902,  realDepth: 902.34, temp: 8.3,  isThermocline: false },
];

const STAT_CARDS = [
  {
    value: '~7.85M',
    label: 'Model Parameters',
    sub: 'U-Net Encoder-Decoder',
    color: 'text-biolume',
    border: 'border-biolume/20',
    bg: 'bg-biolume/5',
  },
  {
    value: '7',
    label: 'Input Surface Channels',
    sub: 'SST · SSS · SLA · Winds (U,V) · Currents (U,V)',
    color: 'text-sky-400',
    border: 'border-sky-400/20',
    bg: 'bg-sky-400/5',
  },
  {
    value: '15',
    label: 'Output Depth Levels',
    sub: '0 m (Surface) → 1000 m (Deep Ocean)',
    color: 'text-amber-400',
    border: 'border-amber-400/20',
    bg: 'bg-amber-400/5',
  },
  {
    value: '0.525 °C',
    label: 'Test RMSE (2022)',
    sub: '18.4% better than climatology',
    color: 'text-purple-400',
    border: 'border-purple-400/20',
    bg: 'bg-purple-400/5',
  },
];

// Continuous glowing wire that connects adjacent pipeline stages.
function FlushWire({
  mb,
  delay = 0,
}: {
  mb: number;
  delay?: number;
}) {
  return (
    <div
      className="flex-1 min-w-[20px] relative flex items-center self-end"
      style={{ height: 2, marginBottom: mb }}
    >
      <div className="w-full h-[2px] bg-gradient-to-r from-sky-400/60 via-cyan-300/80 to-sky-400 relative overflow-hidden shadow-[0_0_8px_rgba(56,189,248,0.4)]">
        <div
          className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white to-transparent"
          style={{ animation: `wireSignal 1.8s ${delay}s linear infinite` }}
        />
      </div>
      <div className="w-2 h-2 rounded-full bg-cyan-300 border border-white shadow-[0_0_8px_rgba(76,224,210,1)] -ml-1 z-10 shrink-0" />
    </div>
  );
}

export function PipelineSection() {
  const [hoveredDepthIdx, setHoveredDepthIdx] = useState<number>(8); // ~131m thermocline

  return (
    <>
      <style>{`
        @keyframes wireSignal {
          0%   { left: -24px; opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes channelScan {
          0%   { top: 0%; opacity: 0; }
          15%  { opacity: 0.8; }
          85%  { opacity: 0.8; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes latentPulse {
          0%, 100% { opacity: 0.4; transform: scaleY(0.95); }
          50%      { opacity: 0.95; transform: scaleY(1.05); }
        }
      `}</style>

      <section
        id="pipeline"
        className="relative bg-[#01050a] border-t border-thermocline/15 overflow-hidden py-24"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_0%,rgba(2,132,199,0.08)_0%,transparent_70%)] pointer-events-none" />

        {/* ── SECTION HEADER ──────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 mb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-biolume text-xs font-mono tracking-widest uppercase mb-4 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-biolume animate-pulse" />
              <span>U-Net Architecture · PS 26066</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
              How OceanEmbed{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-biolume via-sky-400 to-indigo-400">
                works.
              </span>
            </h2>
            <p className="text-foam/80 text-base sm:text-lg max-w-2xl leading-relaxed">
              Seven surface satellite observations in. A 15-level temperature
              profile from surface to 1000 m out — reconstructed via a U-Net
              encoder-decoder with skip connections.
            </p>
          </motion.div>
        </div>

        {/* ── UNIFIED ARCHITECTURE & SOUNDING CARD ─────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="rounded-3xl border border-white/10 bg-[#020713]/90 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">

            {/* Top Workflow Phase Badges */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pb-6 border-b border-white/[0.08] mb-8">
              <div className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-950/30 border border-cyan-500/25 text-cyan-300 font-mono text-[10.5px] font-medium tracking-wide uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="truncate">01 · U-Net Encoder</span>
              </div>
              <div className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#063339]/40 border border-biolume/30 text-biolume font-mono text-[10.5px] font-medium tracking-wide uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-biolume shrink-0" />
                <span className="truncate">02 · Bottleneck Features</span>
              </div>
              <div className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-purple-950/30 border border-purple-500/25 text-purple-300 font-mono text-[10.5px] font-medium tracking-wide uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="truncate">03 · U-Net Decoder</span>
              </div>
              <div className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-sky-950/30 border border-sky-500/25 text-sky-300 font-mono text-[10.5px] font-medium tracking-wide uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                <span className="truncate">04 · 15-Level Output + Climatology</span>
              </div>
            </div>

            {/* ── PIPELINE STAGES ───────────────────────────────────────── */}
            <div className="w-full pt-2 pb-8">
              <div className="flex items-end w-full">

                {/* 1. STAGE: INPUT OBSERVATIONS */}
                <div style={{ width: 108 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-cyan-400/30 bg-cyan-950/40 font-mono text-[8.5px] font-semibold tracking-wider text-cyan-300 uppercase">
                      IN_01 · TELEMETRY
                    </span>
                  </div>
                  <div
                    style={{ height: 235 }}
                    className="w-full relative rounded-xl border border-sky-400/35 bg-gradient-to-b from-sky-950/40 via-[#031326]/60 to-[#010a14] p-1.5 flex flex-col justify-between overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:border-sky-400/60 transition-all"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-gradient-to-b from-cyan-400 via-sky-500 to-transparent" />
                    <div className="flex flex-col gap-1 w-full h-full justify-between py-1">
                      {[
                        { code: 'SST', name: 'Surface Temp',    color: '#F97316' },
                        { code: 'SSS', name: 'Salinity',        color: '#2DD4BF' },
                        { code: 'SLA', name: 'Radar Altimetry', color: '#38BDF8' },
                        { code: 'U',   name: 'Zonal Current',   color: '#06B6D4' },
                        { code: 'V',   name: 'Merid. Current',  color: '#06B6D4' },
                        { code: 'UW',  name: 'Zonal Wind 10m',  color: '#A78BFA' },
                        { code: 'VW',  name: 'Merid. Wind 10m', color: '#A78BFA' },
                      ].map((ch, idx) => (
                        <div
                          key={idx}
                          className="h-5 rounded px-1.5 flex items-center justify-between text-[8px] font-mono border border-white/5"
                          style={{ backgroundColor: `${ch.color}15` }}
                        >
                          <span className="font-bold text-white/90">{ch.code}</span>
                          <span className="text-[7.5px] text-foam/70 truncate ml-1">{ch.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent pointer-events-none animate-[channelScan_2.4s_linear_infinite]" />
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-semibold text-slate-100 tracking-tight">7 Inputs + 7 Masks</div>
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">X ∈ ℝ¹⁴ˣ¹⁰¹ˣ²⁴¹</div>
                  </div>
                </div>

                <FlushWire mb={146} delay={0} />

                {/* 2. STAGE: ENC_01 */}
                <div style={{ width: 92 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] font-mono text-[8.5px] font-semibold tracking-wider text-slate-300 uppercase">
                      ENC_01 · CONV2D
                    </span>
                  </div>
                  <div
                    style={{ height: 200 }}
                    className="w-full relative rounded-xl border border-sky-400/25 bg-gradient-to-b from-sky-950/30 via-[#031326]/50 to-[#010a14] p-2 flex flex-col justify-around overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:border-sky-400/50 transition-all"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-sky-400/80" />
                    <div className="text-center pb-1 border-b border-white/5">
                      <span className="font-mono text-[7.5px] text-foam/60 uppercase">Kernel 3×3 · BatchNorm</span>
                    </div>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-[1px] w-full bg-sky-400/15" />
                    ))}
                    <div className="text-center py-1 bg-black/40 rounded border border-white/5">
                      <span className="font-mono text-[7.5px] text-sky-300 font-medium">H₁ ∈ ℝ³²ˣ⁵¹ˣ¹²¹</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-semibold text-slate-100 tracking-tight">32 Channels</div>
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">ReLU · MaxPool 2×2</div>
                  </div>
                </div>

                <FlushWire mb={133} delay={0.15} />

                {/* 3. STAGE: ENC_02 */}
                <div style={{ width: 92 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] font-mono text-[8.5px] font-semibold tracking-wider text-slate-300 uppercase">
                      ENC_02 · CONV2D
                    </span>
                  </div>
                  <div
                    style={{ height: 175 }}
                    className="w-full relative rounded-xl border border-sky-400/25 bg-gradient-to-b from-sky-950/30 via-[#031326]/50 to-[#010a14] p-2 flex flex-col justify-around overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:border-sky-400/50 transition-all"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-sky-400/80" />
                    <div className="text-center pb-1 border-b border-white/5">
                      <span className="font-mono text-[7.5px] text-foam/60 uppercase">Kernel 3×3 · BatchNorm</span>
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-[1px] w-full bg-sky-400/15" />
                    ))}
                    <div className="text-center py-1 bg-black/40 rounded border border-white/5">
                      <span className="font-mono text-[7.5px] text-sky-300 font-medium">H₂ ∈ ℝ⁶⁴ˣ²⁶ˣ⁶¹</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-semibold text-slate-100 tracking-tight">64 Channels</div>
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">ReLU · MaxPool 2×2</div>
                  </div>
                </div>

                <FlushWire mb={123} delay={0.3} />

                {/* 4. STAGE: BOTTLENECK */}
                <div style={{ width: 100 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2.5 py-0.5 rounded border border-biolume/50 bg-[#063339]/70 font-mono text-[8.5px] font-bold tracking-wider text-biolume uppercase shadow-[0_0_10px_rgba(76,224,210,0.3)]">
                      BOTTLENECK · 512
                    </span>
                  </div>
                  <div
                    style={{ height: 145 }}
                    className="w-full relative rounded-2xl border-2 border-biolume/70 bg-gradient-to-b from-[#063339] via-[#021d24] to-[#010d12] p-2.5 flex flex-col justify-between overflow-hidden shadow-[0_0_35px_rgba(76,224,210,0.35)] hover:scale-[1.03] transition-all"
                  >
                    <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t-2 border-l-2 border-biolume" />
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t-2 border-r-2 border-biolume" />
                    <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b-2 border-l-2 border-biolume" />
                    <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b-2 border-r-2 border-biolume" />

                    <div className="text-center pb-1 border-b border-biolume/20">
                      <span className="font-mono text-[7px] text-biolume/80 uppercase tracking-wider font-semibold">
                        Latent Feature Map
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 w-full h-[65px] my-auto px-1">
                      {Array.from({ length: 11 }).map((_, barIdx) => (
                        <div
                          key={barIdx}
                          className="w-[3px] bg-gradient-to-t from-biolume via-cyan-200 to-white rounded-full"
                          style={{
                            height: `${32 + ((barIdx * 19) % 55)}%`,
                            animation: `latentPulse 2s ${barIdx * 0.15}s ease-in-out infinite`,
                          }}
                        />
                      ))}
                    </div>

                    <div className="text-center py-1 bg-black/60 rounded border border-biolume/40">
                      <span className="font-mono text-[9px] text-biolume font-bold tracking-wider">
                        Z ∈ ℝ⁵¹²ˣ¹³ˣ³¹
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-bold text-biolume tracking-tight">512 Channels</div>
                    <div className="text-[9.5px] text-foam/70 font-mono mt-0.5">Deepest Latent</div>
                  </div>
                </div>

                <FlushWire mb={113} delay={0.45} />

                {/* 5. STAGE: DEC_01 */}
                <div style={{ width: 96 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-purple-400/40 bg-purple-950/50 font-mono text-[8.5px] font-semibold tracking-wider text-purple-300 uppercase">
                      DEC_01 · UPSAMPLE
                    </span>
                  </div>
                  <div
                    style={{ height: 165 }}
                    className="w-full relative rounded-xl border border-purple-500/40 bg-gradient-to-b from-[#240b3b]/60 via-[#140624]/70 to-[#08020e] p-2 flex flex-col justify-between overflow-hidden shadow-[0_8px_25px_rgba(168,85,247,0.25)] hover:border-purple-400/70 transition-all"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-gradient-to-b from-purple-400 via-violet-500 to-transparent" />
                    <div className="text-center pb-1 border-b border-white/5">
                      <span className="font-mono text-[7.5px] text-purple-200/70 uppercase">Upsample + Skip</span>
                    </div>
                    <div className="flex flex-col justify-around h-full py-1 px-1">
                      <div className="flex justify-around">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <span key={i} className="w-2 h-2 rounded-full bg-purple-400/50 border border-purple-300" />
                        ))}
                      </div>
                      <div className="flex justify-around px-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <span key={i} className="w-2 h-2 rounded-full bg-purple-300/80 border border-white" />
                        ))}
                      </div>
                      <div className="flex justify-around px-1">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <span key={i} className="w-2 h-2 rounded-full bg-purple-200 border border-white" />
                        ))}
                      </div>
                    </div>
                    <div className="text-center py-1 bg-black/50 rounded border border-purple-500/30">
                      <span className="font-mono text-[7.5px] text-purple-300 font-semibold">→ ℝ²⁵⁶ˣ²⁶ˣ⁶¹</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-semibold text-purple-300 tracking-tight">256 Channels</div>
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">Skip from ENC_02</div>
                  </div>
                </div>

                <FlushWire mb={123} delay={0.6} />

                {/* 6. STAGE: DEC_02 */}
                <div style={{ width: 96 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-purple-400/40 bg-purple-950/50 font-mono text-[8.5px] font-semibold tracking-wider text-purple-300 uppercase">
                      DEC_02 · UPSAMPLE
                    </span>
                  </div>
                  <div
                    style={{ height: 145 }}
                    className="w-full relative rounded-xl border border-purple-500/40 bg-gradient-to-b from-[#240b3b]/60 via-[#140624]/70 to-[#08020e] p-2 flex flex-col justify-between overflow-hidden shadow-[0_8px_25px_rgba(168,85,247,0.25)] hover:border-purple-400/70 transition-all"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-gradient-to-b from-purple-400 via-violet-500 to-transparent" />
                    <div className="text-center pb-1 border-b border-white/5">
                      <span className="font-mono text-[7.5px] text-purple-200/70 uppercase">Upsample + Skip</span>
                    </div>
                    <div className="flex flex-col justify-around h-full py-1 px-1">
                      <div className="flex justify-around px-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <span key={i} className="w-2 h-2 rounded-full bg-purple-300/80 border border-white" />
                        ))}
                      </div>
                      <div className="flex justify-around">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <span key={i} className="w-2 h-2 rounded-full bg-purple-200 border border-white" />
                        ))}
                      </div>
                    </div>
                    <div className="text-center py-1 bg-black/50 rounded border border-purple-500/30">
                      <span className="font-mono text-[7.5px] text-purple-300 font-semibold">→ ℝ¹²⁸ˣ⁵¹ˣ¹²¹</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-semibold text-purple-300 tracking-tight">128 Channels</div>
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">Skip from ENC_01</div>
                  </div>
                </div>

                <FlushWire mb={133} delay={0.75} />

                {/* 7. STAGE: OUTPUT TENSOR */}
                <div style={{ width: 118 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-sky-400/35 bg-sky-950/40 font-mono text-[8.5px] font-bold tracking-wider text-sky-300 uppercase">
                      OUT_15D · SOUNDING
                    </span>
                  </div>
                  <div
                    style={{ height: 235 }}
                    className="w-full flex flex-col justify-between p-1.5 rounded-xl border border-sky-400/30 bg-[#020a14]/70 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between px-2 pb-1 border-b border-white/10 text-[7px] font-mono text-white/40 uppercase">
                      <span>Depth</span>
                      <span>Temp</span>
                    </div>
                    {DEPTH_LEVELS.map((p, idx) => {
                      const isHovered = idx === hoveredDepthIdx;
                      return (
                        <div
                          key={p.depth}
                          onMouseEnter={() => setHoveredDepthIdx(idx)}
                          className={`
                            h-2.5 rounded-sm transition-all cursor-pointer flex items-center justify-between px-2
                            ${isHovered
                              ? 'bg-biolume text-black font-bold scale-[1.05] shadow-[0_0_12px_rgba(76,224,210,0.8)]'
                              : p.isThermocline
                                ? 'bg-amber-400/25 border border-amber-400/40 text-amber-200'
                                : 'bg-sky-500/15 border border-sky-400/20 text-sky-200 hover:bg-sky-400/30'}
                          `}
                        >
                          <span className="text-[7.5px] font-mono leading-none">{p.depth}m</span>
                          <span className="text-[7.5px] font-mono leading-none">{p.temp}°</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-bold text-sky-300 tracking-tight">15 Depth Levels</div>
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">+ Climatology → °C</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Specifications Strip */}
            <div className="mt-8 pt-5 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-[10px] font-mono text-foam/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-biolume" />
                  <span>Encoder-decoder feature flow</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                  <span>Skip connections</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
                  <span>15-level output tensor</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                OceanEmbed v2 · U-Net · PyTorch 2.5.1
              </span>
            </div>

          </div>
        </div>

        {/* ── STAT CARDS STRIP ────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 mt-12 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STAT_CARDS.map(({ value, label, sub, color, border, bg }) => (
              <div
                key={label}
                className={`rounded-2xl border ${border} ${bg} p-5 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 backdrop-blur-md`}
              >
                <div className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${color}`}>
                  {value}
                </div>
                <div className="mt-2">
                  <div className="text-white text-xs font-mono tracking-wider uppercase font-semibold">
                    {label}
                  </div>
                  <div className="text-foam/60 text-[11px] mt-0.5 leading-snug">
                    {sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>
    </>
  );
}