'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Filter } from 'lucide-react';
import { Experiment, ExperimentCategory } from '@/lib/api/research-types';
import { ExperimentMiniCard } from './ExperimentMiniCard';

const CATEGORIES: ('All' | ExperimentCategory)[] = [
  'All',
  'Data & Inputs',
  'Spatial Representation',
  'Ocean Embedding',
  'Depth Reconstruction',
  'Temporal Dynamics',
  'Physical Constraints',
  'Robustness & Uncertainty',
  'Ocean Regimes',
  'Validation',
];

interface ResearchBandProps {
  experiments: Experiment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeCategory: 'All' | ExperimentCategory;
  onCategoryChange: (cat: 'All' | ExperimentCategory) => void;
}

export function ResearchBand({
  experiments,
  selectedId,
  onSelect,
  activeCategory,
  onCategoryChange,
}: ResearchBandProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = experiments.filter(e =>
    activeCategory === 'All' ? true : e.category === activeCategory
  );

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Count items per category
  const getCategoryCount = (cat: 'All' | ExperimentCategory) => {
    if (cat === 'All') return experiments.length;
    return experiments.filter(e => e.category === cat).length;
  };

  return (
    <section className="py-6 flex flex-col gap-6">
      {/* Section Header & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biolume/10 border border-biolume/25 text-biolume text-[10px] font-mono tracking-[0.2em] uppercase mb-2.5">
            <Sparkles size={11} className="text-biolume" />
            Systematic Empirical Runs ({experiments.length} Studies)
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Scientific Decision{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-biolume to-thermocline">
              Explorer
            </span>
          </h2>
          <p className="text-foam-dim text-xs sm:text-sm mt-1 max-w-xl leading-relaxed font-light">
            Every input variable, depth loss, and temporal window was individually isolated. Click any card to inspect the full hypothesis, findings, and RMSE depth profiles.
          </p>
        </div>

        {/* Scroll Nav Buttons for Desktop */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="font-mono text-[9px] text-white/30 uppercase tracking-[0.2em] mr-2 hidden sm:inline">
            Scroll Telemetry
          </span>
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-8 h-8 rounded-full bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-biolume/40 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-8 h-8 rounded-full bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-biolume/40 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-1.5 pl-1 pr-3 border-r border-white/10 shrink-0 text-white/30">
          <Filter size={12} />
          <span className="font-mono text-[9px] uppercase tracking-widest">Filter:</span>
        </div>

        <div className="flex gap-2 shrink-0">
          {CATEGORIES.map(cat => {
            const count = getCategoryCount(cat);
            const isActive = activeCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`
                  flex-shrink-0 px-3.5 py-1.5 rounded-full font-mono text-[9px] tracking-[0.15em] uppercase
                  flex items-center gap-2 transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'bg-white text-black font-semibold shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                    : 'bg-white/[0.03] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.07] hover:border-white/20'
                  }
                `}
              >
                <span>{cat}</span>
                <span className={`
                  px-1.5 py-0.2 rounded-full text-[8px] font-mono
                  ${isActive ? 'bg-black/15 text-black' : 'bg-white/10 text-white/40'}
                `}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal Cards Scroller with Edge Fades */}
      <div className="relative group/scroller">
        {/* Left Edge Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#02060A] via-[#02060A]/80 to-transparent z-10 pointer-events-none" />
        {/* Right Edge Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#02060A] via-[#02060A]/80 to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pt-2 pb-5 px-2 scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {filtered.length > 0 ? (
            filtered.map((exp, i) => (
              <ExperimentMiniCard
                key={exp.id}
                experiment={exp}
                index={i}
                isSelected={selectedId === exp.id}
                onClick={() => onSelect(exp.id)}
              />
            ))
          ) : (
            <div className="flex items-center justify-center w-full py-16">
              <p className="font-mono text-xs text-white/30 uppercase tracking-[0.2em]">
                No experiments found in &quot;{activeCategory}&quot;
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Meta Row */}
      <div className="flex items-center justify-between px-1 text-white/30 font-mono text-[9px] uppercase tracking-[0.2em]">
        <span>
          Showing {filtered.length} of {experiments.length} ablation records
        </span>
        <span className="hidden sm:inline">
          Use mouse wheel or drag to pan horizontally →
        </span>
      </div>
    </section>
  );
}
