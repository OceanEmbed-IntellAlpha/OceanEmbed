'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useExperiments } from '@/lib/api/queries';
import { 
  Activity, 
  TrendingUp, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  AlertCircle,
  Award,
  ChevronRight
} from 'lucide-react';

export function LiveBenchmarksBand() {
  const { data, isLoading, error } = useExperiments();

  if (error) {
    return null; // Gracefully degrade if backend API is not responding
  }

  const experiments = data?.experiments || [];
  const ablations = data?.variable_ablation || [];
  const findings = data?.key_findings || [];

  return (
    <section className="py-6 flex flex-col gap-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biolume/10 border border-biolume/25 text-biolume text-[10px] font-mono tracking-[0.2em] uppercase mb-2.5">
            <Activity size={11} className="text-biolume animate-pulse" />
            Live Backend ML Telemetry
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Empirical Architecture &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-biolume via-thermocline to-instrument-amber">
              Variable Ablation
            </span>
          </h2>
          <p className="text-foam-dim text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed font-light">
            Direct telemetry from our training iterations on 2010–2020 reanalysis and 2022 test evaluation across the North Indian Ocean basin.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-foam-dim">
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
        <>
          {/* Top Row: Variable Ablation Ladder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-semibold text-white/90 flex items-center gap-2">
                <Layers size={14} className="text-biolume" />
                Input Variable Importance Ladder (U-Net Architecture)
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
                    className={`relative p-5 rounded-2xl border transition-all ${
                      isBest
                        ? 'bg-gradient-to-b from-[#031525] to-[#020914] border-biolume/40 shadow-[0_0_20px_rgba(76,224,210,0.1)]'
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

          {/* Model Iteration Benchmarks Table */}
          <div className="p-1 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.06]">
            <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#030914] p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="font-display text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-biolume" />
                  Model Iteration History & Baseline Comparison
                </h3>
                <span className="font-mono text-[10px] text-white/40">
                  Evaluated on 2022 Unseen Basin Test Set
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-white/40 font-mono text-[10px] uppercase tracking-wider">
                      <th className="pb-3 font-normal">Iteration</th>
                      <th className="pb-3 font-normal">Architecture</th>
                      <th className="pb-3 font-normal">Formulation</th>
                      <th className="pb-3 font-normal text-right">Test RMSE</th>
                      <th className="pb-3 font-normal text-right">R²</th>
                      <th className="pb-3 font-normal text-right">vs Climatology</th>
                      <th className="pb-3 font-normal text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {experiments.map((exp) => {
                      const isWinner = exp.id === 'phase6.2-v4';
                      const isBaseline = exp.verdict.includes('BASELINE');
                      const isRejected = exp.verdict.includes('REJECTED');

                      return (
                        <tr
                          key={exp.id}
                          className={`transition-colors ${
                            isWinner
                              ? 'bg-biolume/[0.04] font-medium'
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="py-3 font-mono text-white/80">
                            {exp.name}
                          </td>
                          <td className="py-3 text-foam-dim">
                            {exp.architecture}
                          </td>
                          <td className="py-3 text-white/50 text-[11px]">
                            {exp.formulation}
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-white">
                            {exp.test_rmse.toFixed(4)}°C
                          </td>
                          <td className="py-3 text-right font-mono text-foam-dim">
                            {exp.test_r2.toFixed(4)}
                          </td>
                          <td className="py-3 text-right font-mono">
                            <span
                              className={
                                exp.delta_vs_clim < 0
                                  ? 'text-biolume'
                                  : exp.delta_vs_clim === 0
                                  ? 'text-white/40'
                                  : 'text-instrument-red'
                              }
                            >
                              {exp.delta_vs_clim > 0 ? '+' : ''}
                              {exp.delta_vs_clim.toFixed(4)}°C
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono text-[10px]">
                            {isWinner ? (
                              <span className="inline-flex items-center gap-1 text-biolume font-semibold px-2 py-0.5 rounded bg-biolume/10 border border-biolume/30">
                                <CheckCircle2 size={11} /> PRODUCTION v2
                              </span>
                            ) : isBaseline ? (
                              <span className="text-white/40">BENCHMARK</span>
                            ) : (
                              <span className="text-white/30">REJECTED</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Key Findings Callout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {findings.map((f, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-biolume/10 border border-biolume/30 flex items-center justify-center text-biolume text-[10px] font-mono shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-xs text-foam-dim leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
