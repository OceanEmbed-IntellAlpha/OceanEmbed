'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { Experiment } from '@/lib/api/research-types';
import { DecisionBadge } from './DecisionBadge';

// ── Inline RMSE sparkline (no library needed) ─────────────────────────────
function RmseSparkline({ values }: { values: number[] }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 140, H = 40, PAD = 4;
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    // Higher RMSE = higher on chart (worse at top)
    const y = PAD + ((v - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="opacity-70">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="#4CE0D2"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(',').map(Number);
        return <circle key={i} cx={x} cy={y} r="2" fill="#4CE0D2" />;
      })}
      {/* Depth labels */}
      <text x={PAD} y={H - 1} fill="#ffffff30" fontSize="7" fontFamily="monospace">surf</text>
      <text x={W - PAD - 20} y={H - 1} fill="#ffffff30" fontSize="7" fontFamily="monospace">deep</text>
    </svg>
  );
}

// ── Category accent colour ────────────────────────────────────────────────
const CATEGORY_COLOR: Record<string, string> = {
  'Data & Inputs':            'text-biolume',
  'Spatial Representation':   'text-thermocline',
  'Ocean Embedding':          'text-biolume',
  'Depth Reconstruction':     'text-instrument-amber',
  'Temporal Dynamics':        'text-thermocline',
  'Physical Constraints':     'text-instrument-amber',
  'Robustness & Uncertainty': 'text-foam-dim',
  'Ocean Regimes':            'text-thermocline',
  'Validation':               'text-biolume',
};

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
      <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
        <FlaskConical size={20} className="text-white/20" />
      </div>
      <div>
        <p className="text-white/30 text-sm font-mono tracking-widest uppercase mb-2">No experiment selected</p>
        <p className="text-white/15 text-xs leading-relaxed">
          Click any experiment card<br />to view its details here
        </p>
      </div>
      {/* Animated arrow pointing right */}
      <motion.div
        animate={{ x: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        className="text-white/15 text-lg mt-2"
      >
        →
      </motion.div>
    </div>
  );
}

// ── Main DetailPanel ──────────────────────────────────────────────────────
export function DetailPanel({
  experiment,
  onClose,
}: {
  experiment: Experiment | null;
  onClose?: () => void;
}) {
  const catColor = experiment ? (CATEGORY_COLOR[experiment.category] ?? 'text-foam-dim') : '';

  return (
    <div className="h-[540px] lg:h-[calc(100vh-96px-32px)] lg:sticky lg:top-24 flex flex-col w-full">
      <div className="h-full rounded-[2rem] border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden flex flex-col shadow-2xl">
        <AnimatePresence mode="wait">
          {!experiment ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex-1"
            >
              <EmptyState />
            </motion.div>
          ) : (
            <motion.div
              key={experiment.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              {/* Header bar */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px] text-white/40 tracking-widest uppercase bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                    {experiment.id}
                  </span>
                  <span className={`font-mono text-[10px] tracking-widest uppercase ${catColor}`}>
                    {experiment.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DecisionBadge status={experiment.decision} />
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="p-1 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                      title="Deselect"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 px-6 py-5 flex flex-col gap-5 overflow-y-auto">
                {/* Title */}
                <h3 className="font-display text-xl font-bold text-white tracking-tight leading-snug">
                  {experiment.title}
                </h3>

                {/* Question */}
                <div>
                  <p className="font-mono text-[9px] text-white/30 tracking-[0.2em] uppercase mb-1.5">Scientific Question</p>
                  <p className="text-foam-dim text-sm leading-relaxed">{experiment.question}</p>
                </div>

                {/* Motivation */}
                {experiment.motivation && (
                  <div>
                    <p className="font-mono text-[9px] text-white/30 tracking-[0.2em] uppercase mb-1.5">Motivation</p>
                    <p className="text-white/40 text-[13px] leading-relaxed">{experiment.motivation}</p>
                  </div>
                )}

                {/* Baseline vs Variant */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
                    <p className="font-mono text-[9px] text-white/25 tracking-[0.2em] uppercase mb-1">Baseline</p>
                    <p className="text-white/70 text-sm font-medium">{experiment.baseline}</p>
                  </div>
                  <div className="bg-biolume/5 border border-biolume/20 rounded-2xl px-4 py-3">
                    <p className="font-mono text-[9px] text-biolume/50 tracking-[0.2em] uppercase mb-1">Variant</p>
                    <p className="text-biolume text-sm font-medium">{experiment.variant}</p>
                  </div>
                </div>

                {/* Finding */}
                {experiment.finding && (
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl px-4 py-3">
                    <p className="font-mono text-[9px] text-white/30 tracking-[0.2em] uppercase mb-1.5">Finding</p>
                    <p className="text-white/60 text-[13px] leading-relaxed">{experiment.finding}</p>
                  </div>
                )}

                {/* RMSE sparkline */}
                {experiment.metrics?.rmse && (
                  <div>
                    <p className="font-mono text-[9px] text-white/30 tracking-[0.2em] uppercase mb-2">
                      RMSE vs Depth  (°C, lower = better)
                    </p>
                    <RmseSparkline values={experiment.metrics.rmse} />
                  </div>
                )}
              </div>

              {/* Footer CTA */}
              <div className="px-6 py-4 border-t border-white/[0.05]">
                <Link
                  href={`/research-lab/${experiment.id.toLowerCase()}`}
                  className="flex items-center justify-between w-full group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-biolume/30 rounded-2xl px-5 py-3 transition-all duration-300"
                >
                  <span className="font-mono text-[10px] text-white/60 group-hover:text-white tracking-widest uppercase transition-colors">
                    View full experiment
                  </span>
                  <ArrowRight size={14} className="text-white/30 group-hover:text-biolume group-hover:translate-x-1 transition-all duration-300" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
