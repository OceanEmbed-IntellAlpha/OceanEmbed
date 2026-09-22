'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';

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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const regionMetrics = {
    All: { rmse: '0.84', bias: '+0.12', corr: '0.96', profiles: '1,420', status: 'Optimal' },
    BoB: { rmse: '0.79', bias: '+0.09', corr: '0.97', profiles: '680', status: 'High Accuracy' },
    AS: { rmse: '0.88', bias: '+0.14', corr: '0.95', profiles: '740', status: 'Optimal' },
  };

  const metrics = regionMetrics[activeRegion];

  // SVG Chart Configuration
  const width = 1000;
  const height = 240;
  const getX = (idx: number) => (idx / (SAMPLE_MATCHUP_DATA.length - 1)) * width;
  const getY = (temp: number) => height - ((temp - 5) / 25) * height; // Maps 5C-30C

  // Generate SVG Path strings
  const modelPath = SAMPLE_MATCHUP_DATA.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(pt.model)}`).join(' ');
  const argoPath = SAMPLE_MATCHUP_DATA.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(pt.argo)}`).join(' ');

  return (
    <section id="validation" className="relative py-32 bg-[#000205] border-t border-white/[0.02] overflow-hidden">
      
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase mb-4 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            >
              <ShieldCheck size={14} className="text-emerald-400" />
              Empirical Holdout Verification
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl font-medium text-white tracking-tight leading-tight"
            >
              Validated against independent <br />
              <span className="text-white/30">
                Argo Float Observations.
              </span>
            </motion.h2>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <Link
              href="/explorer/validation"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-mono text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Open Full Validation Dashboard
              <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>

        {/* Region Switcher */}
        <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold whitespace-nowrap">Region Focus:</span>
          {(['All', 'BoB', 'AS'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setActiveRegion(r)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest uppercase font-bold transition-all whitespace-nowrap ${
                activeRegion === r
                  ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              {r === 'All' ? 'North Indian Ocean' : r === 'BoB' ? 'Bay of Bengal' : 'Arabian Sea'}
            </button>
          ))}
        </div>

        {/* ── THE VALIDATION BENTO GRID ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Metrics Row (Top 4 Cards) */}
          {[
             { title: 'Overall RMSE', value: metrics.rmse, suffix: '°C', target: 'Target < 1.0°C', color: 'text-white' },
             { title: 'Mean Bias', value: metrics.bias, suffix: '°C', target: 'Unbiased', color: 'text-cyan-400' },
             { title: 'Pearson Correlation', value: metrics.corr, suffix: '', target: 'r > 0.95', color: 'text-amber-400' },
             { title: 'Holdout Profiles', value: metrics.profiles, suffix: '', target: 'Tested', color: 'text-emerald-400' }
          ].map((metric, idx) => (
             <motion.div 
               key={metric.title}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.5, delay: idx * 0.1 }}
               className="col-span-1 bg-[#030812]/50 backdrop-blur-xl border border-white/[0.05] rounded-[2rem] p-8 flex flex-col justify-between hover:bg-[#050b18]/80 transition-colors duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
             >
                <div className="flex items-center justify-between text-white/40 font-mono text-[9px] uppercase tracking-widest font-bold mb-6">
                  <span>{metric.title}</span>
                  <span className={metric.color}>{metric.target}</span>
                </div>
                <div className="font-display text-5xl font-medium tracking-tighter text-white">
                  {metric.value}<span className="text-2xl text-white/30 ml-1">{metric.suffix}</span>
                </div>
             </motion.div>
          ))}


          {/* The Massive Chart Card (Bottom Row) */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.7, delay: 0.4 }}
             className="col-span-1 md:col-span-2 lg:col-span-4 bg-[#030812]/50 backdrop-blur-xl border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-12 overflow-hidden relative shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
             {/* Header inside Chart Card */}
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12 relative z-10">
                <div>
                  <h3 className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-1">Sample Float Matchup: WMO-6903829 (Bay of Bengal)</h3>
                  <p className="font-ui text-sm text-white/60">Independent ground-truth comparison across 9 standard depths.</p>
                </div>
                <div className="flex flex-wrap items-center gap-6 font-mono text-[10px] uppercase tracking-widest font-bold">
                   <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_orange]" />
                      <span className="text-white">OceanEmbed Model</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_cyan]" />
                      <span className="text-white">Argo Sensor (In-situ)</span>
                   </div>
                </div>
             </div>

             {/* The Interactive SVG Chart */}
             <div className="relative w-full h-[280px]">
                
                {/* Y-Axis Grid Lines (Temperature) */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                   {[30, 25, 20, 15, 10, 5].map(temp => (
                      <div key={temp} className="w-full h-[1px] bg-white/[0.02] flex items-end">
                         <span className="absolute -left-2 -translate-x-full -translate-y-1/2 font-mono text-[9px] text-white/20">{temp}°</span>
                      </div>
                   ))}
                </div>

                {/* SVG Lines Overlay */}
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-[240px] overflow-visible pointer-events-none z-10 mt-5">
                   {/* Argo Path (Cyan - Ground Truth) */}
                   <path d={argoPath} fill="none" stroke="rgba(34,211,238,0.5)" strokeWidth="3" strokeDasharray="6 6" className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                   {/* Model Path (Amber - Prediction) */}
                   <motion.path 
                     initial={{ pathLength: 0 }}
                     whileInView={{ pathLength: 1 }}
                     viewport={{ once: true }}
                     transition={{ duration: 2, ease: "easeInOut" }}
                     d={modelPath} 
                     fill="none" 
                     stroke="#f59e0b" 
                     strokeWidth="3" 
                     className="drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" 
                   />
                </svg>

                {/* Interactive Hover Columns & X-Axis Labels */}
                <div className="absolute inset-0 flex justify-between mt-5">
                   {SAMPLE_MATCHUP_DATA.map((pt, idx) => (
                      <div 
                         key={pt.depth}
                         className="relative h-full flex flex-col justify-end group cursor-crosshair"
                         onMouseEnter={() => setActiveIndex(idx)}
                         onMouseLeave={() => setActiveIndex(null)}
                         style={{ width: `${100 / SAMPLE_MATCHUP_DATA.length}%` }}
                      >
                         {/* Depth Label (X-Axis) */}
                         <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] text-white/40 group-hover:text-white transition-colors">
                            {pt.depth}m
                         </div>

                         {/* Hover Scrubber Line */}
                         <div className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-white/20 transition-opacity duration-300 ${activeIndex === idx ? 'opacity-100' : 'opacity-0'}`} />

                         {/* Hover Data Tooltip */}
                         <AnimatePresence>
                            {activeIndex === idx && (
                               <motion.div 
                                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                 className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-3 min-w-[140px] shadow-2xl z-30 pointer-events-none"
                               >
                                  <div className="font-mono text-[9px] uppercase tracking-widest text-white/50 mb-2 font-bold text-center border-b border-white/10 pb-2">
                                     Depth {pt.depth}m
                                  </div>
                                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                                     <span className="text-amber-500">Model</span>
                                     <span className="text-white font-bold">{pt.model.toFixed(1)}°</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                                     <span className="text-cyan-400">Sensor</span>
                                     <span className="text-white font-bold">{pt.argo.toFixed(1)}°</span>
                                  </div>
                                  <div className={`text-[10px] font-mono font-bold text-center py-1 rounded bg-white/5 ${Math.abs(pt.delta) <= 0.2 ? 'text-emerald-400' : 'text-amber-500'}`}>
                                     Δ {pt.delta > 0 ? '+' : ''}{pt.delta}°C
                                  </div>
                               </motion.div>
                            )}
                         </AnimatePresence>

                         {/* Hover Points on the lines */}
                         {activeIndex === idx && (
                            <>
                               {/* Argo Point */}
                               <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_15px_cyan] border-2 border-black z-20 pointer-events-none" style={{ top: `${(getY(pt.argo) / height) * 100}%` }} />
                               {/* Model Point */}
                               <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_15px_orange] border-2 border-black z-20 pointer-events-none" style={{ top: `${(getY(pt.model) / height) * 100}%` }} />
                            </>
                         )}
                      </div>
                   ))}
                </div>
             </div>

          </motion.div>
        </div>

      </div>
    </section>
  );
}
