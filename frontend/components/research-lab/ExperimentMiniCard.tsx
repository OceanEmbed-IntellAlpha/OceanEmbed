'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Experiment } from '@/lib/api/research-types';
import { DecisionBadge } from './DecisionBadge';

const CATEGORY_DOT: Record<string, string> = {
  'Data & Inputs':            'bg-biolume text-biolume shadow-[0_0_8px_rgba(0,210,255,0.6)]',
  'Spatial Representation':   'bg-thermocline text-thermocline shadow-[0_0_8px_rgba(28,92,107,0.6)]',
  'Ocean Embedding':          'bg-biolume text-biolume shadow-[0_0_8px_rgba(0,210,255,0.6)]',
  'Depth Reconstruction':     'bg-instrument-amber text-instrument-amber shadow-[0_0_8px_rgba(232,163,61,0.6)]',
  'Temporal Dynamics':        'bg-thermocline text-thermocline shadow-[0_0_8px_rgba(28,92,107,0.6)]',
  'Physical Constraints':     'bg-instrument-amber text-instrument-amber shadow-[0_0_8px_rgba(232,163,61,0.6)]',
  'Robustness & Uncertainty': 'bg-white/50 text-white/50 shadow-[0_0_8px_rgba(255,255,255,0.3)]',
  'Ocean Regimes':            'bg-thermocline text-thermocline shadow-[0_0_8px_rgba(28,92,107,0.6)]',
  'Validation':               'bg-biolume text-biolume shadow-[0_0_8px_rgba(0,210,255,0.6)]',
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
            <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00D2FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${pts[0]})`} />
        <path d={lineD} fill="none" stroke="#00D2FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-mono text-[7px] text-biolume/70 tracking-wider">
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
  const dotStyle = CATEGORY_DOT[experiment.category] ?? 'bg-white/40 text-white/40 shadow-none';

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.35, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={`
        relative w-[285px] shrink-0 h-[210px] rounded-[1.75rem] text-left cursor-pointer
        transition-all duration-300 group p-1
        ${isSelected
          ? 'bg-gradient-to-b from-biolume/40 via-biolume/10 to-transparent shadow-[0_0_35px_rgba(0,210,255,0.18)]'
          : 'bg-white/[0.04] hover:bg-white/[0.08] hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
        }
      `}
    >
      {/* Inner Double-Bezel Container */}
      <div className={`
        relative w-full h-full rounded-[calc(1.75rem-0.25rem)] p-5 flex flex-col justify-between
        border transition-all duration-300
        ${isSelected
          ? 'bg-[#040E1B] border-biolume/40'
          : 'bg-[#030812]/90 border-white/[0.06] group-hover:border-white/15'
        }
      `}>
        {/* Subtle Top Glow Highlight */}
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-white/20 group-hover:via-biolume/40 to-transparent transition-opacity duration-300 pointer-events-none" />

        {/* Card Header: ID, Category Dot, and Decision Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
            <span className="font-mono text-[9px] text-white/40 group-hover:text-white/70 tracking-[0.2em] uppercase transition-colors">
              {experiment.id}
            </span>
          </div>

          <div className="scale-90 origin-right">
            <DecisionBadge status={experiment.decision} />
          </div>
        </div>

        {/* Card Body: Title */}
        <div className="my-auto py-1">
          <h3 className={`
            font-display text-[14px] font-semibold leading-snug line-clamp-2
            ${isSelected ? 'text-white' : 'text-white/80 group-hover:text-white'}
            transition-colors duration-200
          `}>
            {experiment.title}
          </h3>
          <p className="text-white/35 text-[11px] font-light line-clamp-1 mt-1 font-sans">
            {experiment.question}
          </p>
        </div>

        {/* Card Footer: Category Label, Sparkline, and Button-in-Button Hover Icon */}
        <div className="flex items-end justify-between gap-2 pt-2 border-t border-white/[0.04]">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[7.5px] text-white/30 tracking-[0.18em] uppercase max-w-[130px] truncate">
              {experiment.category}
            </span>
            <span className="font-mono text-[8px] text-biolume/60 group-hover:text-biolume transition-colors flex items-center gap-1">
              Click to view
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {experiment.metrics?.rmse ? (
              <MiniSparkline values={experiment.metrics.rmse} />
            ) : null}

            {/* Trailing Icon Affordance */}
            <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 group-hover:border-biolume/40 group-hover:bg-biolume/10 flex items-center justify-center transition-all duration-300 shrink-0">
              <ArrowUpRight size={11} className="text-white/30 group-hover:text-biolume group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
