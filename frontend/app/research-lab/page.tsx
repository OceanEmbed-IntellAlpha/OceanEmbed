'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GlobalNav } from '@/components/shared/GlobalNav';
import { ResearchBand } from '@/components/research-lab/ResearchBand';
import { LiveBenchmarksBand } from '@/components/research-lab/LiveBenchmarksBand';
import { ArchitectureBand } from '@/components/research-lab/ArchitectureBand';
import { ResearchChartsSuite } from '@/components/research-lab/charts/ResearchChartsSuite';
import { ExperimentModal } from '@/components/research-lab/ExperimentModal';
import { StatModal, StatItem } from '@/components/research-lab/StatModal';
import { BenchmarkModal, BenchmarkDetail } from '@/components/research-lab/BenchmarkModal';
import { ArchitectureModal, ArchitectureBlock } from '@/components/research-lab/ArchitectureModal';
import { Experiment, ExperimentCategory } from '@/lib/api/research-types';
import experimentsData from '@/lib/fixtures/experiments.json';
import { Beaker, Database, Cpu, Compass, Zap } from 'lucide-react';

const ALL_EXPERIMENTS = experimentsData as Experiment[];

const HERO_STATS: StatItem[] = [
  {
    id: 'stat-studies',
    title: '8 Systemic Ablation Studies',
    subtitle: 'Systematic Ablation Suite',
    iconName: 'beaker',
    color: 'text-biolume',
    details: {
      description: 'Eight isolated ablation experiments testing data formulations, loss objectives, model architectures, and input variable selection across the North Indian Ocean basin.',
      highlights: [
        'Tested SST, SSS, SLA, Wind U/V, Current U/V independently and in hybrid combinations.',
        'Validated against 13 years of data (2010–2023 CMEMS / GLORYS data).',
        'Achieved 0.525°C overall test RMSE with 7.85M parameter U-Net architecture.'
      ],
      specs: [
        { label: 'Evaluation Period', value: '2010 – 2023' },
        { label: 'Canonical Grid', value: '0.25° × 0.25°' },
        { label: 'Lat/Lon Bounding', value: '5°N-30°N, 45°E-105°E' },
        { label: 'Basin Resolution', value: '101 × 241 Points' }
      ]
    }
  },
  {
    id: 'stat-domains',
    title: '8 Oceanographic Regimes',
    subtitle: 'Physical Diversity',
    iconName: 'database',
    color: 'text-cyan-400',
    details: {
      description: 'Evaluation spans diverse hydrodynamic regimes including monsoonal upwelling zones, high-salinity Arabian Sea waters, and stratified Bay of Bengal dynamics.',
      highlights: [
        'Coastal Upwelling along Southwest Coast of India & Oman.',
        'Low-salinity riverine stratification in the Bay of Bengal.',
        'Deep thermocline variance down to 902m depth.'
      ],
      specs: [
        { label: 'Regime Count', value: '8 Sub-domains' },
        { label: 'Max Salinity Var', value: '32.0 to 36.8 PSU' },
        { label: 'SST Range', value: '22.5°C to 31.8°C' },
        { label: 'Validation Points', value: '24,341 Points' }
      ]
    }
  },
  {
    id: 'stat-params',
    title: '7.85M Parameters',
    subtitle: 'U-Net Architecture',
    iconName: 'cpu',
    color: 'text-amber-400',
    details: {
      description: 'U-Net encoder-decoder architecture with skip connections optimized for subsurface ocean temperature anomaly prediction in the North Indian Ocean.',
      highlights: [
        '≤500 ms inference per request on GPU.',
        'U-Net encoder-decoder with skip connections.',
        'Direct 15-depth anomaly prediction from 7 surface input channels.'
      ],
      specs: [
        { label: 'Parameters', value: '7.85 Million' },
        { label: 'Inference Latency', value: '≤500 ms' },
        { label: 'Backbone', value: 'U-Net Encoder-Decoder' },
        { label: 'Input Channels', value: '14 (7 vars + 7 masks)' }
      ]
    }
  },
  {
    id: 'stat-depth',
    title: '15-Depth Output Head',
    subtitle: '0.49 m to 902 m',
    iconName: 'compass',
    color: 'text-purple-400',
    details: {
      description: '15-depth output head (0.49 m to 902 m) predicting subsurface ocean temperature anomaly profiles across standard GLORYS depth levels.',
      highlights: [
        '15-depth output head (0.49 m to 902 m).',
        'U-Net encoder-decoder with skip connections.',
        'Peak RMSE at thermocline (~92 m depth, 1.026°C RMSE).'
      ],
      specs: [
        { label: 'Depth Range', value: '0.49m to 902.34m' },
        { label: 'Output Depths', value: '15 Discrete Levels' },
        { label: 'Peak Depth Error', value: '1.026°C at 92.33m' },
        { label: 'Deep Error', value: '0.247°C at 902.34m' }
      ]
    }
  }
];

export default function ResearchLabPage() {
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'All' | ExperimentCategory>('All');

  // Interactive Modal States
  const [activeStat, setActiveStat] = useState<StatItem | null>(null);
  const [activeBenchmark, setActiveBenchmark] = useState<BenchmarkDetail | null>(null);
  const [activeArchitectureBlock, setActiveArchitectureBlock] = useState<ArchitectureBlock | null>(null);

  const selectedExperiment = useMemo(() => {
    if (!selectedExperimentId) return null;
    return ALL_EXPERIMENTS.find(e => e.id === selectedExperimentId) ?? null;
  }, [selectedExperimentId]);

  return (
    <main className="min-h-screen bg-[#02060A] text-foam flex flex-col relative selection:bg-biolume/30 selection:text-white overflow-x-hidden">
      <GlobalNav />

      {/* Atmospheric Deep Sea Lighting & Radial Beacon */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-gradient-to-b from-biolume/[0.04] via-thermocline/[0.02] to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-32 w-[45vw] h-[50vh] bg-biolume/[0.02] rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 -left-32 w-[40vw] h-[50vh] bg-thermocline/[0.03] rounded-full blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-32 flex flex-col gap-12 sm:gap-16">
        
        {/* Hero Banner Section */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center max-w-4xl mx-auto pt-2"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biolume/10 border border-biolume/30 text-biolume text-xs font-mono tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(76,224,210,0.15)]">
            <Zap size={13} className="animate-pulse" />
            INCOIS SIH26066 Deep Learning Lab
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-bold text-white tracking-tight mb-4">
            Research Lab<span className="text-biolume">.</span>
          </h1>

          <p className="text-foam-dim text-sm sm:text-base max-w-2xl font-light leading-relaxed">
            Empirical neural architecture isolation, variable ablation ladders, and U-Net encoder-decoder skip connections for subsurface temperature reconstruction in the North Indian Ocean.
          </p>

          {/* Key Hero Metric Badges - CLICKABLE for detailed Modal Insights! */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 w-full">
            {HERO_STATS.map((stat) => (
              <motion.div
                key={stat.id}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveStat(stat)}
                className="p-1 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.08] hover:border-biolume/50 transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(76,224,210,0.15)]"
              >
                <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#030914] p-4 flex items-center gap-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                  <div className="w-10 h-10 rounded-xl bg-biolume/10 border border-biolume/20 flex items-center justify-center text-biolume shrink-0">
                    {stat.iconName === 'beaker' && <Beaker size={18} />}
                    {stat.iconName === 'database' && <Database size={18} className="text-cyan-400" />}
                    {stat.iconName === 'cpu' && <Cpu size={18} className="text-amber-400" />}
                    {stat.iconName === 'compass' && <Compass size={18} className="text-purple-400" />}
                  </div>
                  <div className="text-left">
                    <div className="font-display text-base sm:text-lg font-bold text-white leading-tight">
                      {stat.title.split(' ')[0]} {stat.title.split(' ')[1]}
                    </div>
                    <div className="font-mono text-[9px] text-white/40 uppercase tracking-wider mt-0.5">
                      {stat.subtitle}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* SECTION 1: Interactive Quantitative Data & Performance Analytics Suite */}
        <ResearchChartsSuite />

        {/* SECTION 2: Horizontal Systematic Research Explorer */}
        <ResearchBand
          experiments={ALL_EXPERIMENTS}
          selectedId={selectedExperimentId}
          onSelect={id => setSelectedExperimentId(id)}
          activeCategory={activeCategory}
          onCategoryChange={cat => setActiveCategory(cat)}
        />

        {/* SECTION 3: Live Model Telemetry & Variable Ablation Ladder */}
        <LiveBenchmarksBand
          onSelectBenchmark={(bm) => setActiveBenchmark(bm)}
        />

        {/* SECTION 4: Architecture Deep Dive */}
        <ArchitectureBand
          onSelectBlock={(block) => setActiveArchitectureBlock(block)}
        />

      </div>

      {/* POPUP MODALS */}

      {/* 1. Experiment Detail Modal */}
      <ExperimentModal
        experiment={selectedExperiment}
        onClose={() => setSelectedExperimentId(null)}
      />

      {/* 2. Stat Badge Detail Modal */}
      <StatModal
        stat={activeStat}
        onClose={() => setActiveStat(null)}
      />

      {/* 3. Benchmark Telemetry Modal */}
      <BenchmarkModal
        benchmark={activeBenchmark}
        onClose={() => setActiveBenchmark(null)}
      />

      {/* 4. Architecture Block Detail Modal */}
      <ArchitectureModal
        block={activeArchitectureBlock}
        onClose={() => setActiveArchitectureBlock(null)}
      />
    </main>
  );
}
