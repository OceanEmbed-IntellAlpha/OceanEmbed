'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useExperiments } from '@/lib/api/queries';
import { BenchmarkDetail } from './BenchmarkModal';
import { 
  Activity, 
  TrendingUp, 
  Layers, 
  Award,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';

interface LiveBenchmarksBandProps {
  onSelectBenchmark?: (bm: BenchmarkDetail) => void;
}

export function LiveBenchmarksBand({ onSelectBenchmark }: LiveBenchmarksBandProps) {
  const { data, isLoading, error } = useExperiments();

  if (error) {
    return null;
  }

  const experiments = data?.experiments || [];
  const ablations = data?.variable_ablation || [];

  return (
    <section className="py-4 flex flex-col gap-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-white/[0.06]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biolume/10 border border-biolume/25 text-biolume text-[10px] font-mono tracking-[0.2em] uppercase mb-2.5">
            <Activity size={11} className="text-biolume animate-pulse" />
            Live Backend ML Telemetry
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Empirical Architecture & <span className="text-biolume">Variable Ablation</span>
          </h2>
          <p className="text-foam-dim text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed font-light">
            Direct telemetry from our training iterations on 2010–2020 reanalysis and 2022 test evaluation across the North Indian Ocean basin. Click any card for telemetry details.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-foam-dim bg-white/[0.02] px-3 py-1.5 rounded-xl border border-white/5">
          <span className="w-2 h-2 rounded-full bg-biolume animate-ping" />
          <span>v2 Frozen Model Active (0.5246°C RMSE)</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-36 rounded-2xl bg-white/[0.02] border border-white/5" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Top Row: Variable Ablation Ladder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-semibold text-white/90 flex items-center gap-2">
                <Layers size={14} className="text-biolume" />
                Input Variable Importance Ladder (Click to Inspect)
              </h3>
              <span className="font-mono text-[10px] text-white/40 uppercase tracking-wider">
                Phase 6.2 Matrix
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ablations.map((ab, idx) => {
                const isBest = idx === ablations.length - 1;
                return (
                  <motion.div
                    key={ab.variant_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    onClick={() => onSelectBenchmark?.(ab as BenchmarkDetail)}
                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${
                      isBest
                        ? 'bg-gradient-to-b from-[#031525] to-[#020914] border-biolume/40 shadow-[0_0_25px_rgba(76,224,210,0.15)] hover:border-biolume'
                        : 'bg-[#030914] border-white/[0.07] hover:border-white/20'
                    }`}
                  >
                    {isBest && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-biolume/20 border border-biolume/40 text-[9px] font-mono text-biolume font-semibold">
                        <Award size={10} /> PRODUCTION
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 font-mono text-[10px] text-foam-dim">
                        {ab.n_variables} {ab.n_variables === 1 ? 'Var' : 'Vars'}
                      </span>
                      <h4 className="font-display text-sm font-bold text-white">{ab.name}</h4>
                    </div>

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-mono text-2xl font-bold text-white">
                        {ab.test_rmse.toFixed(4)}
                      </span>
                      <span className="font-mono text-xs text-white/50">°C RMSE</span>
                    </div>

                    {/* Band breakdown */}
                    <div className="mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="font-mono text-[9px] text-white/40 uppercase">Mixed Lyr</div>
                        <div className="font-mono text-xs text-foam font-medium mt-0.5">
                          {ab.ml_rmse.toFixed(3)}°
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] text-thermocline uppercase">Thermo</div>
                        <div className="font-mono text-xs text-thermocline font-medium mt-0.5">
                          {ab.thermocline_rmse.toFixed(3)}°
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[9px] text-white/40 uppercase">Deep</div>
                        <div className="font-mono text-xs text-foam font-medium mt-0.5">
                          {ab.deep_rmse.toFixed(3)}°
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
