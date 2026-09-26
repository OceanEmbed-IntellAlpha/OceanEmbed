'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Experiment } from '@/lib/api/research-types';
import { DecisionBadge } from './DecisionBadge';

const CATEGORY_DOT: Record<string, string> = {
  'Data & Inputs':            'bg-indigo-400 text-indigo-400',
  'Spatial Representation':   'bg-emerald-400 text-emerald-400',
  'Ocean Embedding':          'bg-indigo-400 text-indigo-400',
  'Depth Reconstruction':     'bg-amber-400 text-amber-400',
  'Temporal Dynamics':        'bg-emerald-400 text-emerald-400',
  'Physical Constraints':     'bg-amber-400 text-amber-400',
  'Robustness & Uncertainty': 'bg-zinc-400 text-zinc-400',
  'Ocean Regimes':            'bg-emerald-400 text-emerald-400',
  'Validation':               'bg-indigo-400 text-indigo-400',
};

// Mini SVG Sparkline with smooth area gradient
function MiniSparkline({ values }: { values: number[] }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 64, H = 24, PAD = 2;

  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    // Lower RMSE is better (mapped to bottom of chart)
    const y = H - PAD - ((max - v) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lineD = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p}`, '');
  const areaD = `${lineD} L ${W - PAD},${H} L ${PAD},${H} Z`;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${pts[0]}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${pts[0]})`} />
        <path d={lineD} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-mono text-[9px] text-zinc-500 font-medium">
        {min.toFixed(2)}°C RMSE
      </span>
    </div>
  );
}

export function ExperimentMiniCard({
  experiment,
  index,
  isSelected,
  onClick,
}: {
  experiment: Experiment;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const dotStyle = CATEGORY_DOT[experiment.category] ?? 'bg-zinc-500 text-zinc-500 shadow-none';

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={onClick}
      className={`
        relative w-full h-[200px] rounded-2xl text-left cursor-pointer
        transition-all duration-300 group overflow-hidden flex flex-col
        ${isSelected
          ? 'bg-zinc-900/60 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
          : 'bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
        }
        border
      `}
    >
      {/* Selection Glow Indicator */}
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-32 bg-indigo-500/10 blur-[40px] pointer-events-none" />
      )}
      {isSelected && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
      )}

      <div className="relative z-10 w-full h-full p-5 flex flex-col justify-between">
        
        {/* Card Header: ID, Category Dot, and Decision Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${dotStyle} ${isSelected ? 'animate-pulse' : ''}`} />
            <span className={`font-mono text-[10px] font-bold uppercase transition-colors tracking-wider ${isSelected ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
              {experiment.id}
            </span>
          </div>

          <DecisionBadge status={experiment.decision} />
        </div>

        {/* Card Body: Title */}
        <div className="my-auto py-2">
          <h3 className={`
            text-sm font-semibold leading-snug line-clamp-2
            ${isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'}
            transition-colors duration-200
          `}>
            {experiment.title}
          </h3>
          <p className="text-zinc-500 text-xs line-clamp-2 mt-1.5 leading-relaxed">
            {experiment.question}
          </p>
        </div>

        {/* Card Footer: Category Label, Sparkline, and Button-in-Button Hover Icon */}
        <div className="flex items-end justify-between gap-2 pt-3 border-t border-zinc-800/60 mt-2">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] text-zinc-500 uppercase max-w-[130px] truncate font-semibold tracking-wider">
              {experiment.category}
            </span>
            <span className={`text-[10px] font-medium transition-opacity duration-300 ${isSelected ? 'text-indigo-400 opacity-100' : 'text-zinc-600 opacity-0 group-hover:opacity-100'}`}>
              {isSelected ? 'Currently Viewing' : 'Click to inspect'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {experiment.metrics?.rmse ? (
              <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                <MiniSparkline values={experiment.metrics.rmse} />
              </div>
            ) : null}

            {/* Trailing Icon Affordance */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400' : 'bg-zinc-900 border border-zinc-800 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-300 group-hover:border-zinc-700'}`}>
              <ArrowUpRight size={14} className={isSelected ? 'animate-pulse' : ''} />
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
