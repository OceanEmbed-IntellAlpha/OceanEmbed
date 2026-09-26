'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Beaker, Database, Cpu, Compass, ShieldCheck, Activity, CheckCircle2, ChevronRight } from 'lucide-react';

export interface StatItem {
  id: string;
  title: string;
  subtitle: string;
  iconName: 'beaker' | 'database' | 'cpu' | 'compass';
  color: string;
  details: {
    description: string;
    highlights: string[];
    specs: { label: string; value: string }[];
  };
}

interface StatModalProps {
  stat: StatItem | null;
  onClose: () => void;
}

export function StatModal({ stat, onClose }: StatModalProps) {
  if (!stat) return null;

  const renderIcon = () => {
    switch (stat.iconName) {
      case 'beaker':
        return <Beaker className="text-biolume" size={24} />;
      case 'database':
        return <Database className="text-cyan-400" size={24} />;
      case 'cpu':
        return <Cpu className="text-amber-400" size={24} />;
      case 'compass':
        return <Compass className="text-purple-400" size={24} />;
      default:
        return <Activity className="text-biolume" size={24} />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-xl w-full rounded-2xl bg-[#030B18] border border-biolume/40 p-6 sm:p-8 shadow-[0_0_60px_rgba(76,224,210,0.2)] flex flex-col gap-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-biolume/10 border border-biolume/30 flex items-center justify-center shrink-0">
                {renderIcon()}
              </div>
              <div>
                <span className="font-mono text-[10px] text-biolume uppercase tracking-widest">
                  Architectural Metric Focus
                </span>
                <h3 className="font-display text-2xl font-bold text-white leading-tight">
                  {stat.title}
                </h3>
                <p className="text-xs text-foam-dim font-mono">{stat.subtitle}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-foam-dim leading-relaxed font-light">
            {stat.details.description}
          </p>

          {/* Key Specs */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
            {stat.details.specs.map((spec, i) => (
              <div key={i} className="flex flex-col">
                <span className="font-mono text-[10px] text-white/40 uppercase">{spec.label}</span>
                <span className="font-mono text-sm font-bold text-white mt-0.5">{spec.value}</span>
              </div>
            ))}
          </div>

          {/* Highlights */}
          <div className="flex flex-col gap-2.5">
            <h4 className="font-mono text-xs text-white/80 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={14} className="text-biolume" />
              Empirical Validation Highlights
            </h4>
            <div className="flex flex-col gap-2">
              {stat.details.highlights.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-foam-dim">
                  <CheckCircle2 size={13} className="text-biolume shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-biolume/20 hover:bg-biolume/30 border border-biolume/40 text-biolume font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(76,224,210,0.15)]"
          >
            Close Insight Panel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
