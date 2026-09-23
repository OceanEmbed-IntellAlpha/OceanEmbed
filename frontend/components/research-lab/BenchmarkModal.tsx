'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Activity, Layers, CheckCircle2, AlertCircle, Database, ArrowUpRight } from 'lucide-react';

export interface BenchmarkDetail {
  variant_id: string;
  name: string;
  n_variables: number;
  test_rmse: number;
  ml_rmse: number;
  thermocline_rmse: number;
  deep_rmse: number;
  description?: string;
  variablesIncluded?: string[];
  parameterCount?: string;
  trainingTime?: string;
}

interface BenchmarkModalProps {
  benchmark: BenchmarkDetail | null;
  onClose: () => void;
}

export function BenchmarkModal({ benchmark, onClose }: BenchmarkModalProps) {
  if (!benchmark) return null;

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
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-biolume/20 border border-biolume/40 font-mono text-[10px] text-biolume font-semibold">
                  {benchmark.n_variables} Input Variables
                </span>
                <span className="font-mono text-[10px] text-white/50">ID: {benchmark.variant_id}</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-white">
                {benchmark.name}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Key Metric Hero Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center">
              <div className="font-mono text-[10px] text-white/40 uppercase">Total Test RMSE</div>
              <div className="font-mono text-xl font-bold text-biolume mt-1">{benchmark.test_rmse.toFixed(4)}°C</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center">
              <div className="font-mono text-[10px] text-white/40 uppercase">Mixed Layer</div>
              <div className="font-mono text-xl font-bold text-cyan-400 mt-1">{benchmark.ml_rmse.toFixed(3)}°C</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center">
              <div className="font-mono text-[10px] text-thermocline uppercase">Thermocline</div>
              <div className="font-mono text-xl font-bold text-thermocline mt-1">{benchmark.thermocline_rmse.toFixed(3)}°C</div>
            </div>
          </div>

          {/* Included Features */}
          <div className="flex flex-col gap-2">
            <h4 className="font-mono text-xs text-white/70 uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} className="text-biolume" />
              Input Tensor Channels Included
            </h4>
            <div className="flex flex-wrap gap-2">
              {(benchmark.variablesIncluded || ['SST', 'SSS', 'SLA', 'U', 'V', 'Wind U', 'Wind V']).slice(0, benchmark.n_variables).map((v, i) => (
                <span key={i} className="px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 font-mono text-xs text-white flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-biolume" />
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Physical Interpretation */}
          <div className="p-4 rounded-xl bg-biolume/[0.04] border border-biolume/20 text-xs text-foam-dim leading-relaxed">
            <p className="font-bold text-white mb-1 flex items-center gap-1.5">
              <Activity size={13} className="text-biolume" />
              Oceanographic Impact & Analysis:
            </p>
            {benchmark.description || 'Adding multi-modal surface observations enhances density stratification constraints, yielding substantial error reduction in the critical thermocline region (50–200m).'}
          </div>

          {/* Footer Action */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-biolume/20 hover:bg-biolume/30 border border-biolume/40 text-biolume font-mono text-xs font-bold transition-all"
          >
            Close Telemetry Detail
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
