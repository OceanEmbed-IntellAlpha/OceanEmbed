'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GlobalNav } from '@/components/shared/GlobalNav';
import { ResearchBand } from '@/components/research-lab/ResearchBand';
import { LiveBenchmarksBand } from '@/components/research-lab/LiveBenchmarksBand';
import { ArchitectureBand } from '@/components/research-lab/ArchitectureBand';
import { ExperimentModal } from '@/components/research-lab/ExperimentModal';
import { Experiment, ExperimentCategory } from '@/lib/api/research-types';
import experimentsData from '@/lib/fixtures/experiments.json';
import { Beaker, Database, Cpu, Compass, Radio, ShieldCheck, Activity } from 'lucide-react';

const ALL_EXPERIMENTS = experimentsData as Experiment[];

export default function ResearchLabPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'All' | ExperimentCategory>('All');

  const selectedExperiment = useMemo(() => {
    if (!selectedId) return null;
    return ALL_EXPERIMENTS.find(e => e.id === selectedId) ?? null;
  }, [selectedId]);

  return (
    <main className="min-h-screen bg-[#02060A] text-foam flex flex-col relative selection:bg-biolume/30 selection:text-white overflow-x-hidden">
      <GlobalNav />

      {/* Atmospheric Deep Sea Lighting & Radial Beacon */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft atmospheric gradient pools */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-gradient-to-b from-biolume/[0.04] via-thermocline/[0.02] to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-32 w-[45vw] h-[50vh] bg-biolume/[0.02] rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 -left-32 w-[40vw] h-[50vh] bg-thermocline/[0.03] rounded-full blur-[160px]" />

        {/* Subtle Sonar Grid Coordinates */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* Page Container */}
      <div className="relative z-10 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-32 flex flex-col gap-12 sm:gap-16">
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center max-w-4xl mx-auto pt-4"
        >

          {/* Styled Page Heading */}
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight mb-10">
            Research Lab<span className="text-biolume">.</span>
          </h1>

          {/* Key Architectural Milestone Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-10 w-full">
            <div className="p-1 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.08]">
              <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#030914] p-4 flex items-center gap-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <div className="w-9 h-9 rounded-xl bg-biolume/10 border border-biolume/20 flex items-center justify-center text-biolume shrink-0">
                  <Beaker size={16} />
                </div>
                <div className="text-left">
                  <div className="font-display text-lg font-bold text-white leading-tight">15 Studies</div>
                  <div className="font-mono text-[8.5px] text-white/40 uppercase tracking-wider mt-0.5">Ablations Tested</div>
                </div>
              </div>
            </div>

            <div className="p-1 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.08]">
              <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#030914] p-4 flex items-center gap-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <div className="w-9 h-9 rounded-xl bg-thermocline/20 border border-thermocline/40 flex items-center justify-center text-biolume shrink-0">
                  <Database size={16} />
                </div>
                <div className="text-left">
                  <div className="font-display text-lg font-bold text-white leading-tight">8 Domains</div>
                  <div className="font-mono text-[8.5px] text-white/40 uppercase tracking-wider mt-0.5">Physical Regimes</div>
                </div>
              </div>
            </div>

            <div className="p-1 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.08]">
              <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#030914] p-4 flex items-center gap-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <div className="w-9 h-9 rounded-xl bg-instrument-amber/10 border border-instrument-amber/25 flex items-center justify-center text-instrument-amber shrink-0">
                  <Cpu size={16} />
                </div>
                <div className="text-left">
                  <div className="font-display text-lg font-bold text-white leading-tight">~1.74M</div>
                  <div className="font-mono text-[8.5px] text-white/40 uppercase tracking-wider mt-0.5">Parameters (FP32)</div>
                </div>
              </div>
            </div>

            <div className="p-1 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.08]">
              <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#030914] p-4 flex items-center gap-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <div className="w-9 h-9 rounded-xl bg-argoObs/10 border border-argoObs/25 flex items-center justify-center text-argoObs shrink-0">
                  <Compass size={16} />
                </div>
                <div className="text-left">
                  <div className="font-display text-lg font-bold text-white leading-tight">0 – 2000m</div>
                  <div className="font-mono text-[8.5px] text-white/40 uppercase tracking-wider mt-0.5">Continuous Depth</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* UPPER SECTION: Horizontal Research Strip */}
        <ResearchBand
          experiments={ALL_EXPERIMENTS}
          selectedId={selectedId}
          onSelect={id => setSelectedId(id)}
          activeCategory={activeCategory}
          onCategoryChange={cat => setActiveCategory(cat)}
        />

        {/* MIDDLE SECTION: Live Model Telemetry & Variable Ablations from API */}
        <LiveBenchmarksBand />

        {/* LOWER SECTION: Architecture Deep Dive */}
        <ArchitectureBand />

      </div>

      {/* Interactive Popup Modal for selected experiment */}
      <ExperimentModal
        experiment={selectedExperiment}
        onClose={() => setSelectedId(null)}
      />
    </main>
  );
}
