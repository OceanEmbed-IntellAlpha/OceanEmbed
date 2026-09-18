'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, ArrowRight, BarChart3, Activity, GitCommit } from 'lucide-react';

interface SampleMatchup {
  depth: number;
  model: number;
  argo: number;
  delta: number;
}

const SAMPLE_MATCHUP_DATA: SampleMatchup[] = [
  { depth: 0, model: 28.6, argo: 28.5, delta: 0.1 },
  { depth: 10, model: 28.4, argo: 28.4, delta: 0.0 },
  { depth: 50, model: 26.2, argo: 26.4, delta: -0.2 },
  { depth: 100, model: 21.8, argo: 21.5, delta: 0.3 },
  { depth: 150, model: 17.8, argo: 18.1, delta: -0.3 },
  { depth: 200, model: 15.2, argo: 15.0, delta: 0.2 },
  { depth: 300, model: 12.6, argo: 12.8, delta: -0.2 },
  { depth: 500, model: 9.8, argo: 9.7, delta: 0.1 },
  { depth: 1000, model: 6.8, argo: 6.9, delta: -0.1 },
];

export function ValidationSpotlight() {
  const [activeRegion, setActiveRegion] = useState<'All' | 'BoB' | 'AS'>('All');

  const regionMetrics = {
    All: { rmse: '0.84°C', bias: '+0.12°C', corr: '0.96', profiles: '1,420', status: 'Optimal' },
    BoB: { rmse: '0.79°C', bias: '+0.09°C', corr: '0.97', profiles: '680', status: 'High Accuracy' },
    AS: { rmse: '0.88°C', bias: '+0.14°C', corr: '0.95', profiles: '740', status: 'Optimal' },
  };

  const metrics = regionMetrics[activeRegion];

  return (
    <section id="validation" className="relative py-28 md:py-36 bg-[#030912] border-t border-thermocline/15 overflow-hidden">
      
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-argoObs/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold tracking-[0.25em] text-argoObs uppercase mb-3 px-4 py-1.5 rounded-full border border-argoObs/30 bg-argoObs/10 backdrop-blur-md">
              <ShieldCheck size={14} className="text-argoObs" />
              Empirical Holdout Verification
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              Validated against independent <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-argoObs to-biolume">
                Argo Float Observations.
              </span>
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Link
              href="/explorer/validation"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-wider transition-all"
            >
              Open Full Validation Dashboard
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Region Switcher Pills */}
        <div className="flex items-center gap-3 mb-10">
          <span className="text-xs font-mono text-foam-dim uppercase tracking-wider">Region Focus:</span>
          {(['All', 'BoB', 'AS'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setActiveRegion(r)}
              className={`px-3 py-1 rounded-lg text-xs font-mono tracking-wider uppercase transition-all ${
                activeRegion === r
                  ? 'bg-argoObs/20 border border-argoObs/60 text-argoObs font-bold shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'bg-white/5 border border-white/10 text-foam-dim hover:text-white'
              }`}
            >
              {r === 'All' ? 'North Indian Ocean' : r === 'BoB' ? 'Bay of Bengal' : 'Arabian Sea'}
            </button>
          ))}
        </div>

        {/* 4 Quantitative Benchmark Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-foam-dim font-mono text-xs uppercase mb-3">
              <span>Overall RMSE</span>
              <span className="text-argoObs">Target &lt; 1.0°C</span>
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {metrics.rmse}
            </div>
            <p className="text-[11px] text-foam-dim mt-2">Root Mean Square Error across all 15 depths</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-foam-dim font-mono text-xs uppercase mb-3">
              <span>Mean Bias</span>
              <span className="text-biolume">Unbiased</span>
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {metrics.bias}
            </div>
            <p className="text-[11px] text-foam-dim mt-2">Average deviation from in-situ ground truth</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-foam-dim font-mono text-xs uppercase mb-3">
              <span>Pearson Correlation</span>
              <span className="text-instrument-amber">r &gt; 0.95</span>
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {metrics.corr}
            </div>
            <p className="text-[11px] text-foam-dim mt-2">Linear correlation with autonomous sensors</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-foam-dim font-mono text-xs uppercase mb-3">
              <span>Holdout Profiles</span>
              <span className="text-white/40">Tested</span>
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {metrics.profiles}
            </div>
            <p className="text-[11px] text-foam-dim mt-2">Independent profiles never seen in training</p>
          </div>
        </div>

        {/* Interactive Matchup Visualizer */}
        <div className="p-6 md:p-8 rounded-3xl bg-[#050D18] border border-white/10 backdrop-blur-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/10 gap-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-argoObs block mb-1">
                Sample Float Matchup: WMO-6903829 (Bay of Bengal)
              </span>
              <h3 className="font-display text-xl font-bold text-white">
                Reconstructed Profile vs Physical Sensor Matchup
              </h3>
            </div>
            
            <div className="flex items-center gap-6 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-instrument-amber shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span className="text-white">OceanEmbed Model</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-argoObs shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                <span className="text-white">Argo Sensor (In-situ)</span>
              </div>
            </div>
          </div>

          {/* Data Table / Profile Comparison Strip */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3 pt-6">
            {SAMPLE_MATCHUP_DATA.map((pt) => {
              const absDelta = Math.abs(pt.delta);
              const isMatch = absDelta <= 0.2;
              return (
                <div 
                  key={pt.depth}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center hover:border-white/20 transition-colors"
                >
                  <span className="font-mono text-xs font-bold text-white mb-2">
                    {pt.depth}m
                  </span>
                  
                  {/* Model Value */}
                  <span className="font-mono text-xs text-instrument-amber font-semibold">
                    {pt.model.toFixed(1)}°
                  </span>

                  {/* Argo Value */}
                  <span className="font-mono text-xs text-argoObs font-semibold mt-0.5">
                    {pt.argo.toFixed(1)}°
                  </span>

                  {/* Delta */}
                  <div className={`mt-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isMatch ? 'bg-argoObs/15 text-argoObs' : 'bg-instrument-amber/15 text-instrument-amber'
                  }`}>
                    {pt.delta > 0 ? `+${pt.delta}` : pt.delta}°
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-foam-dim font-mono gap-3">
            <span>Spatial Matchup: Co-located within 25 km &amp; ±12 hours of satellite pass.</span>
            <span className="text-argoObs flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              Conforms to IOC/WMO Argo Quality Control Flag Level 1 (Good)
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
