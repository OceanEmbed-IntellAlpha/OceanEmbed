'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, CheckCircle2, Sliders, Zap } from 'lucide-react';

const DEPTH_LEVELS = [
  { depth: 0,    temp: 28.6, isThermocline: false },
  { depth: 25,   temp: 27.9, isThermocline: false },
  { depth: 50,   temp: 26.8, isThermocline: false },
  { depth: 75,   temp: 24.5, isThermocline: false },
  { depth: 100,  temp: 22.4, isThermocline: false },
  { depth: 140,  temp: 19.1, isThermocline: true  },
  { depth: 185,  temp: 15.8, isThermocline: true  },
  { depth: 250,  temp: 13.2, isThermocline: true  },
  { depth: 350,  temp: 11.5, isThermocline: false },
  { depth: 500,  temp: 9.1,  isThermocline: false },
  { depth: 750,  temp: 7.2,  isThermocline: false },
  { depth: 1000, temp: 5.4,  isThermocline: false },
  { depth: 1250, temp: 4.8,  isThermocline: false },
  { depth: 1500, temp: 4.2,  isThermocline: false },
  { depth: 2000, temp: 3.8,  isThermocline: false },
];

const STAT_CARDS = [
  {
    value: '~1.7M',
    label: 'Model Parameters',
    sub: 'Compact Neural Operator',
    color: 'text-biolume',
    border: 'border-biolume/20',
    bg: 'bg-biolume/5',
  },
  {
    value: '7',
    label: 'Input Surface Channels',
    sub: 'SST · SSH · SSS · Wind (U,V) · Currents',
    color: 'text-sky-400',
    border: 'border-sky-400/20',
    bg: 'bg-sky-400/5',
  },
  {
    value: '15',
    label: 'Discrete Sounding Depths',
    sub: '0 m (Surface) → 2,000 m (Abyssal Plain)',
    color: 'text-amber-400',
    border: 'border-amber-400/20',
    bg: 'bg-amber-400/5',
  },
  {
    value: '384-dim',
    label: 'Ocean State Embedding',
    sub: 'Compact Latent Vector z ∈ ℝ³⁸⁴',
    color: 'text-purple-400',
    border: 'border-purple-400/20',
    bg: 'bg-purple-400/5',
  },
];

// Continuous flush wire that physically touches both adjacent blocks without gaps
function FlushWire({
  mb,
  delay = 0,
  hasFourierDrop = false,
}: {
  mb: number;
  delay?: number;
  hasFourierDrop?: boolean;
}) {
  return (
    <div
      className="flex-1 min-w-[20px] relative flex items-center self-end"
      style={{ height: 2, marginBottom: mb }}
    >
      {/* Fourier Depth Conditioning Node & Vertical Feed */}
      {hasFourierDrop && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
          <div className="px-2.5 py-1 rounded-md bg-[#1a082b] border border-purple-400/70 shadow-[0_0_16px_rgba(168,85,247,0.55)] flex items-center gap-2 whitespace-nowrap backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <div className="flex flex-col text-left">
              <span className="font-mono text-[9px] font-bold text-purple-200 tracking-wider">
                + γ(z) ∈ ℝ⁶⁴
              </span>
              <span className="font-mono text-[7px] text-purple-300/80">
                Fourier Depth Pos. Encoding
              </span>
            </div>
          </div>
          <div className="w-[1.5px] h-5 border-r border-dashed border-purple-400/80" />
          {/* Junction dot on wire */}
          <div className="w-2.5 h-2.5 rounded-full bg-purple-400 border border-white shadow-[0_0_10px_rgba(168,85,247,1)] -mt-1" />
        </div>
      )}

      {/* Solid glowing wire from block edge to block edge */}
      <div className="w-full h-[2px] bg-gradient-to-r from-sky-400/60 via-cyan-300/80 to-sky-400 relative overflow-hidden shadow-[0_0_8px_rgba(56,189,248,0.4)]">
        {/* Animated signal packet travelling from left block to right block */}
        <div
          className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white to-transparent"
          style={{
            animation: `wireSignal 1.8s ${delay}s linear infinite`,
          }}
        />
      </div>

      {/* Terminal connection node entering the downstream block */}
      <div className="w-2 h-2 rounded-full bg-cyan-300 border border-white shadow-[0_0_8px_rgba(76,224,210,1)] -ml-1 z-10 shrink-0" />
    </div>
  );
}

export function PipelineSection() {
  const [hoveredDepthIdx, setHoveredDepthIdx] = useState<number>(6); // 185m (Thermocline Z20)

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
        {/* Ambient deep ocean illumination */}
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
              <span>Neural Operator Architecture · PS 26066</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
              How OceanEmbed-Net{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-biolume via-sky-400 to-indigo-400">
                thinks.
              </span>
            </h2>
            <p className="text-foam/80 text-base sm:text-lg max-w-2xl leading-relaxed">
              Surface satellite observations in. Continuous 2,000-meter water-column temperature out — at 15 discrete sounding depths, simultaneously.
            </p>
          </motion.div>
        </div>

        {/* ── UNIFIED ARCHITECTURE & SOUNDING CARD ─────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="rounded-3xl border border-white/10 bg-[#020713]/90 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            
            {/* Top Workflow Phase Badges (Unified Responsive Grid) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pb-6 border-b border-white/[0.08] mb-8">
              <div className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-950/30 border border-cyan-500/25 text-cyan-300 font-mono text-[10.5px] font-medium tracking-wide uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="truncate">01 · 3D Spatiotemporal Encoder</span>
              </div>
              <div className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#063339]/40 border border-biolume/30 text-biolume font-mono text-[10.5px] font-medium tracking-wide uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-biolume shrink-0" />
                <span className="truncate">02 · 384-Dim Ocean Latent</span>
              </div>
              <div className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-purple-950/30 border border-purple-500/25 text-purple-300 font-mono text-[10.5px] font-medium tracking-wide uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="truncate">03 · Fourier MLP Decoder</span>
              </div>
              <div className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-sky-950/30 border border-sky-500/25 text-sky-300 font-mono text-[10.5px] font-medium tracking-wide uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                <span className="truncate">04 · 15-Layer Sounding Tensor</span>
              </div>
            </div>

            {/* ── PART 1: 7-STAGE PIPELINE (CONTINUOUS CONNECTED WIRES) ────────── */}
            <div className="w-full pt-2 pb-8">
              <div className="flex items-end w-full">
                
                {/* 1. STAGE: INPUT OBSERVATIONS */}
                <div style={{ width: 102 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-cyan-400/30 bg-cyan-950/40 font-mono text-[8.5px] font-semibold tracking-wider text-cyan-300 uppercase">
                      IN_01 · TELEMETRY
                    </span>
                  </div>
                  <div
                    style={{ height: 215 }}
                    className="w-full relative rounded-xl border border-sky-400/35 bg-gradient-to-b from-sky-950/40 via-[#031326]/60 to-[#010a14] p-1.5 flex flex-col justify-between overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:border-sky-400/60 transition-all"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-gradient-to-b from-cyan-400 via-sky-500 to-transparent" />
                    <div className="flex flex-col gap-1 w-full h-full justify-between py-1">
                      {[
                        { code: 'SST', name: 'Surface Temp', color: '#F97316' },
                        { code: 'SSH', name: 'Radar Altimetry', color: '#38BDF8' },
                        { code: 'SSS', name: 'Salinity Sensor', color: '#2DD4BF' },
                        { code: 'U₁₀', name: 'Zonal Wind 10m', color: '#A78BFA' },
                        { code: 'V₁₀', name: 'Meridional Wind', color: '#A78BFA' },
                        { code: 'Uc',  name: 'Zonal Current', color: '#06B6D4' },
                        { code: 'Vc',  name: 'Merid. Current', color: '#06B6D4' },
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
                    <div className="text-xs font-semibold text-slate-100 tracking-tight">7 Input Channels</div>
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">X ∈ ℝ⁷ˣ³²ˣ³²ˣ⁷ᵈ</div>
                  </div>
                </div>

                {/* WIRE 1: Input to Conv3D 1 */}
                <FlushWire mb={136} delay={0} />

                {/* 2. STAGE: CONV3D ×1 */}
                <div style={{ width: 84 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] font-mono text-[8.5px] font-semibold tracking-wider text-slate-300 uppercase">
                      ENC_01 · CONV3D
                    </span>
                  </div>
                  <div
                    style={{ height: 180 }}
                    className="w-full relative rounded-xl border border-sky-400/25 bg-gradient-to-b from-sky-950/30 via-[#031326]/50 to-[#010a14] p-2 flex flex-col justify-around overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:border-sky-400/50 transition-all"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-sky-400/80" />
                    <div className="text-center pb-1 border-b border-white/5">
                      <span className="font-mono text-[7.5px] text-foam/60 uppercase">Kernel 3×3×3</span>
                    </div>
                    {Array.from({ length: 4 }).map((_, lineIdx) => (
                      <div key={lineIdx} className="h-[1px] w-full bg-sky-400/15" />
                    ))}
                    <div className="text-center py-1 bg-black/40 rounded border border-white/5">
                      <span className="font-mono text-[7.5px] text-sky-300 font-medium">H₁ ∈ ℝ³²ˣ¹⁶ˣ¹⁶</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-semibold text-slate-100 tracking-tight">32 Feature Maps</div>
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">Stride (2, 2, 1)</div>
                  </div>
                </div>

                {/* WIRE 2: Conv3D 1 to Conv3D 2 */}
                <FlushWire mb={123} delay={0.25} />

                {/* 3. STAGE: CONV3D ×2 */}
                <div style={{ width: 84 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] font-mono text-[8.5px] font-semibold tracking-wider text-slate-300 uppercase">
                      ENC_02 · CONV3D
                    </span>
                  </div>
                  <div
                    style={{ height: 155 }}
                    className="w-full relative rounded-xl border border-sky-400/25 bg-gradient-to-b from-sky-950/30 via-[#031326]/50 to-[#010a14] p-2 flex flex-col justify-around overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:border-sky-400/50 transition-all"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-sky-400/80" />
                    <div className="text-center pb-1 border-b border-white/5">
                      <span className="font-mono text-[7.5px] text-foam/60 uppercase">Spatial Pool</span>
                    </div>
                    {Array.from({ length: 3 }).map((_, lineIdx) => (
                      <div key={lineIdx} className="h-[1px] w-full bg-sky-400/15" />
                    ))}
                    <div className="text-center py-1 bg-black/40 rounded border border-white/5">
                      <span className="font-mono text-[7.5px] text-sky-300 font-medium">H₂ ∈ ℝ⁶⁴ˣ⁸ˣ⁸</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-semibold text-slate-100 tracking-tight">64 Feature Maps</div>
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">GELU Activation</div>
                  </div>
                </div>

                {/* WIRE 3: Conv3D 2 to Conv3D 3 */}
                <FlushWire mb={113} delay={0.5} />

                {/* 4. STAGE: CONV3D ×3 */}
                <div style={{ width: 88 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.03] font-mono text-[8.5px] font-semibold tracking-wider text-slate-300 uppercase">
                      ENC_03 · CONV3D
                    </span>
                  </div>
                  <div
                    style={{ height: 135 }}
                    className="w-full relative rounded-xl border border-sky-400/30 bg-gradient-to-b from-sky-950/40 via-[#031326]/60 to-[#010a14] p-2 flex flex-col justify-between overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:border-sky-400/60 transition-all"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-cyan-400" />
                    <div className="text-center pb-0.5 border-b border-white/5">
                      <span className="font-mono text-[7px] text-foam/60 uppercase">Global Compress</span>
                    </div>
                    {Array.from({ length: 2 }).map((_, lineIdx) => (
                      <div key={lineIdx} className="h-[1px] w-full bg-cyan-400/20" />
                    ))}
                    <div className="text-center py-1 bg-black/40 rounded border border-white/5">
                      <span className="font-mono text-[7.5px] text-cyan-300 font-medium">H₃ ∈ ℝ¹⁹²ˣ⁴ˣ⁴</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-semibold text-slate-100 tracking-tight">192 Feature Maps</div>
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">Latent Projection</div>
                  </div>
                </div>

                {/* WIRE 4: Conv3D 3 to Ocean Embedding */}
                <FlushWire mb={113} delay={0.75} />

                {/* 5. STAGE: THE 384-DIM OCEAN EMBEDDING */}
                <div style={{ width: 114 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2.5 py-0.5 rounded border border-biolume/50 bg-[#063339]/70 font-mono text-[8.5px] font-bold tracking-wider text-biolume uppercase shadow-[0_0_10px_rgba(76,224,210,0.3)]">
                      LAT_384 · CORE
                    </span>
                  </div>
                  <div
                    style={{ height: 155 }}
                    className="w-full relative rounded-2xl border-2 border-biolume/70 bg-gradient-to-b from-[#063339] via-[#021d24] to-[#010d12] p-2.5 flex flex-col justify-between overflow-hidden shadow-[0_0_35px_rgba(76,224,210,0.35)] hover:scale-[1.03] transition-all"
                  >
                    <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t-2 border-l-2 border-biolume" />
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t-2 border-r-2 border-biolume" />
                    <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b-2 border-l-2 border-biolume" />
                    <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b-2 border-r-2 border-biolume" />

                    <div className="text-center pb-1 border-b border-biolume/20">
                      <span className="font-mono text-[7px] text-biolume/80 uppercase tracking-wider font-semibold">
                        Latent Ocean Vector
                      </span>
                    </div>

                    {/* Animated Latent Barcode */}
                    <div className="flex items-center justify-between gap-1 w-full h-[65px] my-auto px-1">
                      {Array.from({ length: 9 }).map((_, barIdx) => (
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
                        z_ocean ∈ ℝ³⁸⁴
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-bold text-biolume tracking-tight">384-Dim Embedding</div>
                    <div className="text-[9.5px] text-foam/70 font-mono mt-0.5">Latent Ocean State</div>
                  </div>
                </div>

                {/* WIRE 5: Ocean Embedding to Decoder with Fourier Depth Injection Node */}
                <FlushWire mb={123} delay={1.0} hasFourierDrop={true} />

                {/* 6. STAGE: SHARED MLP DECODER */}
                <div style={{ width: 96 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-purple-400/40 bg-purple-950/50 font-mono text-[8.5px] font-semibold tracking-wider text-purple-300 uppercase">
                      DEC_01 · MLP
                    </span>
                  </div>
                  <div
                    style={{ height: 175 }}
                    className="w-full relative rounded-xl border border-purple-500/40 bg-gradient-to-b from-[#240b3b]/60 via-[#140624]/70 to-[#08020e] p-2 flex flex-col justify-between overflow-hidden shadow-[0_8px_25px_rgba(168,85,247,0.25)] hover:border-purple-400/70 transition-all"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-gradient-to-b from-purple-400 via-violet-500 to-transparent" />
                    <div className="text-center pb-1 border-b border-white/5">
                      <span className="font-mono text-[7.5px] text-purple-200/70 uppercase">Shared Decoder</span>
                    </div>
                    <div className="flex flex-col justify-around h-full py-1 px-1">
                      <div className="flex justify-around">
                        {Array.from({ length: 4 }).map((_, idx) => (
                          <span key={idx} className="w-2 h-2 rounded-full bg-purple-400/50 border border-purple-300" />
                        ))}
                      </div>
                      <div className="flex justify-around px-2">
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <span key={idx} className="w-2 h-2 rounded-full bg-purple-300/80 border border-white" />
                        ))}
                      </div>
                      <div className="flex justify-around px-1">
                        {Array.from({ length: 2 }).map((_, idx) => (
                          <span key={idx} className="w-2 h-2 rounded-full bg-purple-200 border border-white" />
                        ))}
                      </div>
                    </div>
                    <div className="text-center py-1 bg-black/50 rounded border border-purple-500/30">
                      <span className="font-mono text-[7.5px] text-purple-300 font-semibold">256 → 128 (GELU)</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center h-[46px] flex flex-col justify-center">
                    <div className="text-xs font-semibold text-purple-300 tracking-tight">Multi-Layer Decoder</div>
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">Fourier Conditioned</div>
                  </div>
                </div>

                {/* WIRE 6: Decoder to Output Tensor */}
                <FlushWire mb={133} delay={1.25} />

                {/* 7. STAGE: 15-DEPTH OUTPUT TENSOR */}
                <div style={{ width: 108 }} className="flex flex-col items-center shrink-0">
                  <div className="h-6 mb-2 flex items-center">
                    <span className="px-2 py-0.5 rounded border border-sky-400/35 bg-sky-950/40 font-mono text-[8.5px] font-bold tracking-wider text-sky-300 uppercase">
                      OUT_15D · SOUNDING
                    </span>
                  </div>
                  <div
                    style={{ height: 215 }}
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
                    <div className="text-[9.5px] text-foam/60 font-mono mt-0.5">T̂(z) ∈ [0, 2000m]</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Specifications Strip */}
            <div className="mt-8 pt-5 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-[10px] font-mono text-foam/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-biolume" />
                  <span>Forward Feature Pass</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                  <span>Fourier Depth Conditioning γ(z)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
                  <span>Multi-Depth Sounding Tensor</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                OceanEmbed-Net v1.2 · PyTorch & ONNX Runtime
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
