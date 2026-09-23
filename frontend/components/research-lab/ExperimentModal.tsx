'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLenis } from 'lenis/react';
import Link from 'next/link';
import { X, ArrowRight, Activity, Beaker, CheckCircle2, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { Experiment } from '@/lib/api/research-types';
import { DecisionBadge } from './DecisionBadge';

const CATEGORY_COLOR: Record<string, string> = {
  'Data & Inputs':            'text-biolume border-biolume/30 bg-biolume/10',
  'Spatial Representation':   'text-thermocline border-thermocline/30 bg-thermocline/10',
  'Ocean Embedding':          'text-biolume border-biolume/30 bg-biolume/10',
  'Depth Reconstruction':     'text-instrument-amber border-instrument-amber/30 bg-instrument-amber/10',
  'Temporal Dynamics':        'text-thermocline border-thermocline/30 bg-thermocline/10',
  'Physical Constraints':     'text-instrument-amber border-instrument-amber/30 bg-instrument-amber/10',
  'Robustness & Uncertainty': 'text-white/60 border-white/20 bg-white/5',
  'Ocean Regimes':            'text-thermocline border-thermocline/30 bg-thermocline/10',
  'Validation':               'text-biolume border-biolume/30 bg-biolume/10',
};

// Interactive RMSE Sparkline with depth milestones
function RmseChart({ values }: { values: number[] }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 360, H = 100, PAD = 20;

  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    // Lower RMSE is mapped towards bottom
    const y = H - PAD - ((max - v) / range) * (H - PAD * 2);
    return { x, y, v };
  });

  const pathD = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${W - PAD},${H - PAD} L ${PAD},${H - PAD} Z`;

  return (
    <div className="p-4 rounded-2xl bg-[#02060C] border border-white/[0.08] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5">
          <Activity size={12} className="text-biolume" />
          RMSE vs Depth Profile
        </span>
        <span className="font-mono text-[10px] text-biolume font-semibold">
          min {min.toFixed(2)}°C · max {max.toFixed(2)}°C
        </span>
      </div>

      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <linearGradient id="modal-rmse-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00D2FF" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Depth level horizontal guidelines */}
        <line x1={PAD} y1={PAD} x2={W - PAD} y2={PAD} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

        {/* Gradient fill */}
        <path d={areaD} fill="url(#modal-rmse-grad)" />

        {/* Curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#00D2FF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data nodes */}
        {pts.map((pt, i) => (
          <g key={i} className="group">
            <circle cx={pt.x} cy={pt.y} r="4" fill="#040D18" stroke="#00D2FF" strokeWidth="2" />
            <text
              x={pt.x}
              y={pt.y - 8}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="600"
              className="drop-shadow-sm"
            >
              {pt.v}°C
            </text>
          </g>
        ))}

        {/* Depth Labels */}
        <text x={PAD} y={H - 4} fill="#ffffff40" fontSize="8" fontFamily="monospace">0m (Surface)</text>
        <text x={W - PAD} y={H - 4} textAnchor="end" fill="#ffffff40" fontSize="8" fontFamily="monospace">902.3m (Deep)</text>
      </svg>
    </div>
  );
}

// Interactive Correlation Chart
function CorrelationChart({ values }: { values: number[] }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 360, H = 100, PAD = 20;

  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    // Higher Correlation mapped towards top (y=0)
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
    return { x, y, v };
  });

  const pathD = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${W - PAD},${H - PAD} L ${PAD},${H - PAD} Z`;

  return (
    <div className="p-4 rounded-2xl bg-[#02060C] border border-white/[0.08] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5">
          <Activity size={12} className="text-instrument-amber" />
          R² vs Depth Profile
        </span>
        <span className="font-mono text-[10px] text-instrument-amber font-semibold">
          avg {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)}
        </span>
      </div>

      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <linearGradient id="modal-corr-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Guidelines */}
        <line x1={PAD} y1={PAD} x2={W - PAD} y2={PAD} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

        {/* Gradient fill */}
        <path d={areaD} fill="url(#modal-corr-grad)" />

        {/* Curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data nodes */}
        {pts.map((pt, i) => (
          <g key={i} className="group">
            <circle cx={pt.x} cy={pt.y} r="4" fill="#040D18" stroke="#F59E0B" strokeWidth="2" />
            <text
              x={pt.x}
              y={pt.y - 8}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="600"
              className="drop-shadow-sm"
            >
              {pt.v.toFixed(2)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Synthetic Abstract Visualizer for when we don't have real images
function SyntheticArtifact({ name, index }: { name: string; index: number }) {
  const seed = name.length + index;
  const isHeatmap = name.includes('correlation') || name.includes('attention') || name.includes('heatmap');
  
  return (
    <div className="flex-none w-64 h-40 rounded-2xl bg-[#02060C] border border-white/[0.08] relative overflow-hidden flex flex-col group">
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10 z-10">
        <span className="font-mono text-[8px] uppercase tracking-widest text-white/70">
          {name.replace(/_/g, ' ')}
        </span>
      </div>
      
      {/* Generative Visual Content */}
      <div className="flex-1 w-full h-full relative opacity-60 group-hover:opacity-100 transition-opacity duration-500">
        {isHeatmap ? (
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-5 gap-0.5 p-1 opacity-80">
            {Array.from({ length: 40 }).map((_, i) => (
              <div 
                key={i} 
                className="rounded-sm" 
                style={{ 
                  backgroundColor: `rgba(28, 92, 107, ${0.1 + (Math.sin(i * seed) + 1) * 0.4})` 
                }} 
              />
            ))}
          </div>
        ) : (
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id={`grid-${index}`} width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${index})`} />
            {Array.from({ length: 5 }).map((_, i) => (
              <path 
                key={i}
                d={`M -20 ${50 + Math.sin(i)*20} Q 100 ${100 + Math.cos(i*seed)*50}, 280 ${30 + Math.sin(i+seed)*40}`}
                fill="none"
                stroke={i % 2 === 0 ? "rgba(0,210,255,0.3)" : "rgba(255,255,255,0.1)"}
                strokeWidth={1 + i}
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}

interface ExperimentModalProps {
  experiment: Experiment | null;
  onClose: () => void;
}

export function ExperimentModal({ experiment, onClose }: ExperimentModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  // Close on Escape key press, lock background scroll, pause Lenis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (experiment) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      lenis?.stop();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      lenis?.start();
    };
  }, [experiment, onClose, lenis]);

  // Isolate wheel events within modal so global listeners (like Lenis) never intercept
  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl || !experiment) return;

    const stopWheelBubble = (e: WheelEvent) => {
      e.stopPropagation();
    };

    modalEl.addEventListener('wheel', stopWheelBubble, { passive: true });
    return () => {
      modalEl.removeEventListener('wheel', stopWheelBubble);
    };
  }, [experiment]);

  const catStyle = experiment ? (CATEGORY_COLOR[experiment.category] ?? 'text-white/60 border-white/20 bg-white/5') : '';

  return (
    <AnimatePresence>
      {experiment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-xl cursor-pointer"
          />

          {/* Modal Outer Double-Bezel Hardware Shell */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
            data-lenis-prevent-touch="true"
            className="relative w-full max-w-4xl h-[85vh] p-1.5 rounded-[2.5rem] bg-white/[0.04] border border-white/[0.1] shadow-[0_30px_100px_rgba(0,0,0,0.95),0_0_60px_rgba(0,210,255,0.08)] z-10 flex flex-col"
          >
            {/* Inner Core Container */}
            <div 
              data-lenis-prevent="true"
              className="flex-1 min-h-0 w-full h-full rounded-[calc(2.5rem-0.375rem)] bg-[#030914] overflow-hidden flex flex-col border border-white/[0.04]"
            >
              {/* Header Bar */}
              <div className="shrink-0 flex items-center justify-between px-6 sm:px-8 py-4.5 border-b border-white/[0.08] bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-white/50 tracking-widest uppercase bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                    {experiment.id}
                  </span>
                  <span className={`font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded-full border ${catStyle}`}>
                    {experiment.category}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <DecisionBadge status={experiment.decision} />
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer active:scale-95"
                    aria-label="Close modal"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body with Custom Subtle Scrollbar */}
              <div
                ref={scrollRef}
                data-lenis-prevent="true"
                data-lenis-prevent-wheel="true"
                tabIndex={0}
                className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-6 sm:px-8 py-6 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent outline-none focus:outline-none"
              >
                {/* Title */}
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug mb-6">
                  {experiment.title}
                </h2>

                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Scientific Formulation & Findings */}
                  <div className="lg:col-span-7 flex flex-col gap-5">
                    {/* Scientific Question */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-biolume" />
                      <p className="font-mono text-[9px] text-biolume tracking-[0.2em] uppercase mb-1.5 flex items-center gap-1.5">
                        <Beaker size={12} className="text-biolume" />
                        Scientific Hypothesis & Objective
                      </p>
                      <p className="text-white text-sm sm:text-base leading-relaxed font-light pl-2">
                        {experiment.question}
                      </p>
                    </div>

                    {/* Motivation & Purpose */}
                    {(experiment.motivation || experiment.purpose) && (
                      <div className="p-4 rounded-2xl bg-white/[0.015] border border-white/[0.05] flex flex-col gap-3">
                        {experiment.motivation && (
                          <div>
                            <p className="font-mono text-[9px] text-white/40 tracking-[0.2em] uppercase mb-1.5">
                              Physical Motivation
                            </p>
                            <p className="text-foam-dim text-xs sm:text-sm leading-relaxed font-light">
                              {experiment.motivation}
                            </p>
                          </div>
                        )}
                        {experiment.purpose && (
                          <div>
                            <p className="font-mono text-[9px] text-white/40 tracking-[0.2em] uppercase mb-1.5">
                              Experimental Purpose
                            </p>
                            <p className="text-white/70 text-xs sm:text-sm leading-relaxed font-light">
                              {experiment.purpose}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Finding */}
                    {experiment.finding && (
                      <div className="p-4 rounded-2xl bg-biolume/[0.02] border border-biolume/20">
                        <p className="font-mono text-[9px] text-biolume tracking-[0.2em] uppercase mb-1.5 flex items-center gap-1.5">
                          <Sparkles size={11} className="text-biolume" />
                          Empirical Finding & Conclusion
                        </p>
                        <p className="text-white/85 text-xs sm:text-sm leading-relaxed font-light">
                          {experiment.finding}
                        </p>
                      </div>
                    )}

                    {/* Decision Rationale */}
                    {experiment.decisionReason && (
                      <div className="p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.06] text-xs text-white/60 leading-relaxed font-light">
                        <span className="font-mono text-[8.5px] text-white/35 uppercase tracking-widest block mb-1">
                          Downstream Integration Decision
                        </span>
                        {experiment.decisionReason}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Comparative Setup & Quantitative Metrics */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Baseline vs Variant */}
                    <div className="flex flex-col gap-2.5">
                      <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-3.5">
                        <span className="font-mono text-[8.5px] text-white/30 tracking-[0.2em] uppercase block mb-1">
                          Control (Baseline)
                        </span>
                        <span className="text-white/80 text-xs font-mono font-medium block">
                          {experiment.baseline}
                        </span>
                      </div>

                      <div className="bg-biolume/[0.05] border border-biolume/25 rounded-2xl p-3.5">
                        <span className="font-mono text-[8.5px] text-biolume/70 tracking-[0.2em] uppercase block mb-1 flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-biolume" />
                          Candidate (Variant)
                        </span>
                        <span className="text-biolume text-xs font-mono font-medium block">
                          {experiment.variant}
                        </span>
                      </div>
                    </div>

                    {/* Metrics Chart */}
                    {experiment.metrics?.rmse ? (
                      <RmseChart values={experiment.metrics.rmse} />
                    ) : (
                      <div className="p-4 rounded-2xl bg-white/[0.015] border border-white/[0.05] text-center">
                        <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
                          Ablation Evaluation Pending
                        </span>
                      </div>
                    )}

                    {/* Correlation Score / Chart */}
                    {experiment.metrics?.correlation ? (
                      <CorrelationChart values={experiment.metrics.correlation} />
                    ) : (
                      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.07]">
                        <span className="font-mono text-[9px] text-white/40 tracking-[0.2em] uppercase flex items-center gap-1.5">
                          <Activity size={11} className="text-white/40" />
                          Correlation Data Unavailable
                        </span>
                      </div>
                    )}

                    {/* Next Experiment Link */}
                    {experiment.nextExperiment && (
                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-white/40">
                        <span>Successor Study:</span>
                        <span className="text-biolume font-semibold">{experiment.nextExperiment}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Research Visualizations Section */}
                {experiment.visuals && experiment.visuals.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/[0.05]">
                    <h3 className="font-mono text-[10px] text-white/50 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Layers size={12} />
                      Research Visualizations & Artifacts
                    </h3>
                    <div 
                      data-lenis-prevent="true"
                      data-lenis-prevent-horizontal="true"
                      className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full"
                    >
                      {experiment.visuals.map((vis, idx) => (
                        <SyntheticArtifact key={idx} name={vis} index={idx} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Action Bar */}
              <div className="relative z-10 shrink-0 px-6 sm:px-8 py-4 border-t border-white/[0.08] bg-[#030914] flex items-center justify-end gap-4">
                {/* Button-In-Button Nested Architecture used for Dismiss */}
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-3 group bg-white text-black hover:bg-biolume font-semibold rounded-full pl-5 pr-2 py-2 transition-all duration-300 shadow-[0_0_25px_rgba(255,255,255,0.15)] active:scale-95 cursor-pointer"
                >
                  <span className="font-mono text-[10px] tracking-widest uppercase">
                    Close Dossier
                  </span>
                  <div className="w-7 h-7 rounded-full bg-black/10 group-hover:bg-black/20 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5">
                    <X size={13} className="text-black" />
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
