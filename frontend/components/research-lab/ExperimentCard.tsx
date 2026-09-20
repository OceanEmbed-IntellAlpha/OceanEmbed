'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Experiment } from '@/lib/api/research-types';
import { DecisionBadge } from './DecisionBadge';
import { ArrowRight, Beaker } from 'lucide-react';

export function ExperimentCard({ experiment, index }: { experiment: Experiment, index: number }) {
  return (
    <div className="group relative w-full">
      <Link href={`/research-lab/${experiment.id.toLowerCase()}`} className="block h-full cursor-pointer">
        
        {/* Double-Bezel Outer Shell */}
        <div className="h-full rounded-[2.5rem] bg-white/[0.03] ring-1 ring-white/10 p-2.5 md:p-3 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-active:scale-[0.98] shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          
          {/* Inner Core */}
          <div className="relative h-full bg-[#0A0A0A] rounded-[calc(2.5rem-0.75rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden p-8 md:p-12 flex flex-col gap-10">
            
            {/* Ethereal Hover Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-biolume/5 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between relative z-10">
              <div className="flex flex-col gap-3">
                <span className="font-mono text-[11px] text-foam-dim/60 uppercase tracking-[0.2em] bg-white/5 px-3 py-1.5 rounded-full border border-white/5 w-fit">
                  {experiment.id}
                </span>
                <span className="font-mono text-[10px] text-biolume/80 uppercase tracking-[0.2em]">
                  {experiment.category}
                </span>
              </div>
              <DecisionBadge status={experiment.decision} />
            </div>

            {/* Title & Question */}
            <div className="relative z-10 mt-2">
              <h3 className="font-display font-medium text-white text-3xl md:text-4xl tracking-tight leading-[1.1] group-hover:text-biolume transition-colors duration-700 mb-6">
                {experiment.title}
              </h3>
              <p className="text-[clamp(1.125rem,1.5vw,1.25rem)] text-foam/70 leading-relaxed font-light line-clamp-2">
                {experiment.question}
              </p>
            </div>

            {/* Setup Box (Nested Architecture) */}
            <div className="relative z-10 p-2 bg-white/[0.02] rounded-[1.5rem] ring-1 ring-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] mt-4">
              <div className="bg-[#050505] rounded-[calc(1.5rem-0.5rem)] p-6 md:p-8 grid grid-cols-2 gap-8 md:gap-12 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-[80%] bg-white/10" />
                
                <div className="flex flex-col gap-3 relative z-10">
                  <span className="font-mono text-[10px] text-foam-dim/50 uppercase tracking-[0.2em]">Baseline</span>
                  <span className="font-display text-xl md:text-2xl text-foam/90 font-medium tracking-tight">{experiment.baseline}</span>
                </div>
                <div className="flex flex-col gap-3 relative z-10">
                  <span className="font-mono text-[10px] text-biolume/50 uppercase tracking-[0.2em]">Variant</span>
                  <span className="font-display text-xl md:text-2xl text-biolume font-medium tracking-tight">{experiment.variant}</span>
                </div>
              </div>
            </div>

            {/* Footer / CTA (Button-in-Button Architecture) */}
            <div className="mt-8 pt-8 relative z-10 flex items-center justify-between border-t border-white/5">
              <span className="flex items-center gap-3 font-mono text-[10px] text-foam-dim uppercase tracking-[0.2em]">
                <Beaker size={14} className="opacity-50" />
                {experiment.visuals ? experiment.visuals.length : 0} Visuals
              </span>
              
              <div className="flex items-center gap-4 bg-white/5 rounded-full pl-6 pr-1.5 py-1.5 ring-1 ring-white/10 group-hover:bg-white/10 group-hover:ring-white/20 transition-all duration-700">
                <span className="font-mono text-[11px] text-white uppercase tracking-[0.2em]">
                  View
                </span>
                {/* Nested Icon Circle */}
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-2 group-hover:bg-biolume group-hover:text-black">
                  <ArrowRight size={16} strokeWidth={1.5} />
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </Link>
    </div>
  );
}
