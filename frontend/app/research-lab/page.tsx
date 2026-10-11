'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Beaker, Database, Cpu, Compass, Activity, LayoutDashboard, Layers, Network, ChevronRight, Lightbulb } from 'lucide-react';

const ALL_EXPERIMENTS = experimentsData as Experiment[];

const HERO_STATS: StatItem[] = [
  {
    id: 'stat-studies',
    title: '12 Systematic Ablation Studies',
    subtitle: 'Ablation Suite & Architectures',
    iconName: 'beaker',
    color: 'text-indigo-400',
    details: {
      description: 'Twelve isolated ablation experiments testing data formulations, loss objectives, deep architecture paradigms (U-Net, ViT, GNN, AE), and input variable selection across the North Indian Ocean basin.',
      highlights: [
        'Tested SST, SSS, SLA, Wind U/V, Current U/V independently and in hybrid combinations.',
        'Benchmarked 4 deep learning architectures: U-Net (7.85M), ViT (5.89M), GNN (89K), and AE (1.12M).',
        'Achieved 0.807 °C ocean-masked primary test RMSE (0.525 °C full-grid benchmark, +18.4% vs Climatology).',
        'In-situ ARGO validation across 8,881 physical float profiles (0.913 °C NIO basin RMSE).'
      ],
      specs: [
        { label: 'Evaluation Period', value: '2010 – 2023' },
        { label: 'Primary Test RMSE', value: '0.807 °C (Ocean)' },
        { label: 'Secondary Benchmark', value: '0.525 °C (Full)' },
        { label: 'ARGO In-Situ RMSE', value: '0.913 °C (8,881)' }
      ]
    }
  },
  {
    id: 'stat-domains',
    title: '8 Oceanographic Regimes',
    subtitle: 'Physical Diversity',
    iconName: 'database',
    color: 'text-emerald-400',
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
    color: 'text-rose-400',
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

type TabId = 'overview' | 'analytics' | 'experiments' | 'telemetry' | 'architecture';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'overview', label: 'Lab Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Quantitative Analytics', icon: Activity },
  { id: 'experiments', label: 'Ablation Studies', icon: Layers },
  { id: 'telemetry', label: 'Live Telemetry', icon: Database },
  { id: 'architecture', label: 'Model Architecture', icon: Network },
];

export default function ResearchLabPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
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
    <main className="min-h-screen bg-[#09090b] text-zinc-300 flex flex-col selection:bg-indigo-500/30 selection:text-white">
      <GlobalNav />

      <div className="flex-1 flex overflow-hidden pt-20 sm:pt-24">
        {/* Sidebar Navigation */}
        <aside className="w-[280px] border-r border-zinc-800/50 bg-[#09090b]/80 backdrop-blur-xl flex flex-col hidden md:flex shrink-0">
          <div className="p-6">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 px-3">
              Deep Learning Lab
            </h2>
            <nav className="flex flex-col gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 w-full text-left overflow-hidden group ${
                      isActive 
                        ? 'text-white shadow-sm' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabGlow"
                        className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 rounded-xl"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    )}

                    <div className={`relative z-10 p-1.5 rounded-lg transition-colors ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-transparent text-zinc-500 group-hover:text-zinc-400 group-hover:bg-zinc-800/50'}`}>
                      <Icon size={16} />
                    </div>

                    <span className="relative z-10 flex-1">{tab.label}</span>
                    
                    {isActive && (
                      <ChevronRight size={14} className="relative z-10 text-indigo-400/70" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#09090b]">
          <div className="max-w-6xl mx-auto p-6 md:p-10 pb-32">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-10"
              >
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="flex flex-col gap-10">
                    <header className="relative">
                      <div className="absolute -inset-x-6 -top-10 h-40 bg-indigo-500/5 blur-[100px] pointer-events-none" />
                      
                      {/* Canonical Dual-Domain Telemetry Badge */}
                      <div className="inline-flex flex-wrap items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono mb-4 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-zinc-400">Canonical Test RMSE:</span>
                        <span className="text-white font-bold">0.807 °C</span>
                        <span className="text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]">(Ocean-Masked)</span>
                        <span className="text-zinc-600 hidden sm:inline">|</span>
                        <span className="text-zinc-400 hidden sm:inline">Full-Grid:</span>
                        <span className="text-zinc-200 font-medium hidden sm:inline">0.525 °C</span>
                        <span className="text-indigo-400 font-medium bg-indigo-500/10 px-1.5 py-0.5 rounded text-[11px]">+18.4% vs Climatology</span>
                      </div>

                      <motion.h1 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4"
                      >
                        Research Lab & Benchmark Suite
                      </motion.h1>
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-zinc-400 max-w-3xl leading-relaxed text-sm md:text-base"
                      >
                        Empirical neural architecture isolation, multi-sensor variable ablation ladders, and U-Net encoder-decoder skip connections for subsurface temperature reconstruction in the North Indian Ocean. Explore our 12 systematic studies, architecture baselines (ViT, GNN, AE), and in-situ ARGO validation.
                      </motion.p>
                    </header>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      {HERO_STATS.map((stat, idx) => (
                        <motion.div
                          key={stat.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + (idx * 0.05) }}
                          onClick={() => setActiveStat(stat)}
                          className="relative group bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700/80 hover:bg-zinc-800/40 transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
                        >
                          {/* Hover Glow Effect */}
                          <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none
                            ${stat.iconName === 'beaker' ? 'bg-indigo-500' : ''}
                            ${stat.iconName === 'database' ? 'bg-emerald-500' : ''}
                            ${stat.iconName === 'cpu' ? 'bg-amber-500' : ''}
                            ${stat.iconName === 'compass' ? 'bg-rose-500' : ''}
                          `} />

                          <div>
                            <div className="flex items-start justify-between mb-5">
                              <div className="w-10 h-10 rounded-xl bg-zinc-900 shadow-inner border border-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                {stat.iconName === 'beaker' && <Beaker size={18} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />}
                                {stat.iconName === 'database' && <Database size={18} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                                {stat.iconName === 'cpu' && <Cpu size={18} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
                                {stat.iconName === 'compass' && <Compass size={18} className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />}
                              </div>
                              <div className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] uppercase tracking-widest font-semibold text-zinc-500">
                                {stat.subtitle}
                              </div>
                            </div>
                            
                            <div className="text-lg font-semibold text-white leading-tight mb-2 group-hover:text-indigo-50 transition-colors">
                              {stat.title}
                            </div>
                            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                              {stat.details.description}
                            </p>
                          </div>

                          <div className="mt-6 flex items-center gap-1.5 text-[11px] font-medium text-indigo-400/80 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <span>Inspect Detail</span>
                            <ChevronRight size={12} />
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                      <div className="col-span-1 md:col-span-1 flex flex-col justify-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono tracking-widest uppercase mb-4 w-fit">
                          <Lightbulb size={12} className="text-indigo-400" />
                          Major Insights
                        </div>
                        <h2 className="text-2xl font-semibold text-white leading-tight">
                          Key Discoveries from our Deep Learning Runs
                        </h2>
                      </div>
                      
                      <div className="col-span-1 md:col-span-2">
                        <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/80 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] pointer-events-none" />
                          <div className="relative z-10 prose prose-invert max-w-none text-sm text-zinc-400 leading-relaxed space-y-4">
                            <p className="text-zinc-300 text-base font-medium">Through our comprehensive ablation studies across the North Indian Ocean basin, we have established a definitive correlation between Sea Level Anomaly (SLA) and subsurface thermocline structure.</p>
                            
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 list-none p-0">
                              <li className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 m-0 relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                                <strong className="block text-white mb-1">Data Fusion</strong>
                                SLA accounts for the vast majority (87.5%) of the performance gain when reconstructing deeper layers (below 50m).
                              </li>
                              <li className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 m-0 relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                                <strong className="block text-white mb-1">Model Architecture</strong>
                                Full 2D spatial context resolves mesoscale eddy structures that single-column point models completely miss.
                              </li>
                              <li className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 m-0 relative overflow-hidden sm:col-span-2">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                                <strong className="block text-white mb-1">Inference Efficiency</strong>
                                The 7.85M parameter model achieves sub-500ms inference times across an entire ocean basin grid (101x241), making real-time telemetry viable.
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === 'analytics' && (
                  <div className="flex flex-col gap-6 pt-4">
                    <ResearchChartsSuite />
                  </div>
                )}

                {/* EXPERIMENTS TAB */}
                {activeTab === 'experiments' && (
                  <div className="flex flex-col gap-6 pt-4">
                    <ResearchBand
                      experiments={ALL_EXPERIMENTS}
                      selectedId={selectedExperimentId}
                      onSelect={id => setSelectedExperimentId(id)}
                      activeCategory={activeCategory}
                      onCategoryChange={cat => setActiveCategory(cat)}
                    />
                  </div>
                )}

                {/* TELEMETRY TAB */}
                {activeTab === 'telemetry' && (
                  <div className="flex flex-col gap-6 pt-4">
                    <LiveBenchmarksBand
                      onSelectBenchmark={(bm) => setActiveBenchmark(bm)}
                    />
                  </div>
                )}

                {/* ARCHITECTURE TAB */}
                {activeTab === 'architecture' && (
                  <div className="flex flex-col gap-6 pt-4">
                    <ArchitectureBand
                      onSelectBlock={(block) => setActiveArchitectureBlock(block)}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* POPUP MODALS */}
      <ExperimentModal
        experiment={selectedExperiment}
        onClose={() => setSelectedExperimentId(null)}
      />
      <StatModal
        stat={activeStat}
        onClose={() => setActiveStat(null)}
      />
      <BenchmarkModal
        benchmark={activeBenchmark}
        onClose={() => setActiveBenchmark(null)}
      />
      <ArchitectureModal
        block={activeArchitectureBlock}
        onClose={() => setActiveArchitectureBlock(null)}
      />
    </main>
  );
}
