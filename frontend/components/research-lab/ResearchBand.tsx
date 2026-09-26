'use client';

import React, { useRef, useState } from 'react';
import { Search, X, Layers } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = experiments.filter(e => {
    const matchesCategory = activeCategory === 'All' ? true : e.category === activeCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.finding && e.finding.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getCategoryCount = (cat: 'All' | ExperimentCategory) => {
    if (cat === 'All') return experiments.length;
    return experiments.filter(e => e.category === cat).length;
  };

  return (
    <section className="py-6 flex flex-col gap-6">
      {/* Section Header & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-zinc-800 relative">
        <div className="absolute top-0 right-1/4 w-64 h-32 bg-indigo-500/10 blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono tracking-widest uppercase mb-3">
            <Layers size={12} className="text-indigo-400" />
            Systematic Empirical Runs ({experiments.length} Studies)
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Scientific Decision Explorer
          </h2>
          <p className="text-zinc-400 text-sm mt-2 max-w-xl leading-relaxed">
            Every input variable, depth loss, and temporal window was individually isolated. Click any card to inspect the full hypothesis, findings, and RMSE depth profiles.
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Instant Search Bar */}
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search experiments, variables, RMSE..."
              className="pl-9 pr-8 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all w-full sm:w-64"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-zinc-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2 pb-5">
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
          <div className="col-span-full flex items-center justify-center w-full py-16">
            <p className="font-mono text-xs text-white/30 uppercase tracking-[0.2em]">
              No matching experiments found
            </p>
          </div>
        )}
      </div>

      {/* Footer Meta Row */}
      <div className="flex items-center justify-between px-1 text-white/30 font-mono text-[9px] uppercase tracking-[0.2em]">
        <span>
          Showing {filtered.length} of {experiments.length} ablation records
        </span>
      </div>
    </section>
  );
}
