'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Cpu, Layers, GitBranch, Sparkles, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

interface ArchitectureBlock {
  id: string;
  stageNumber: string;
  name: string;
  subtitle: string;
  badge: string;
  specs: { label: string; value: string }[];
  description: string;
  why: string;
  formula?: string;
}

const ARCHITECTURE_BLOCKS: ArchitectureBlock[] = [
  {
    id: 'conv3d',
    stageNumber: '01',
    name: 'Conv3D Spatiotemporal Encoder',
    subtitle: 'Joint spatial & temporal feature extraction from 5-day surface windows',
    badge: 'Stage 01',
    specs: [
      { label: 'Kernel Dimension', value: '3 × 3 × 3 (T × H × W)' },
      { label: 'Normalization', value: 'BatchNorm3d + GELU' },
      { label: 'Input Tensor', value: '[B, 7, 5, 64, 64]' },
      { label: 'Output Tensor', value: '[B, 128, 1, 16, 16]' },
    ],
    description:
      'Processes 5 consecutive temporal snapshots of 7 surface input channels (SST, SSS, SLA, U/V geostrophic currents, wind stress components). Joint 3D convolutions capture baroclinic wave propagation and advective eddy kinematics.',
    why: 'Outperformed sequential ConvLSTM by 4× parameter reduction and identical 0.42°C RMSE, preventing catastrophic gradient degradation during long ocean simulations.',
  },
  {
    id: 'embedding',
    stageNumber: '02',
    name: 'Ocean Latent Embedding',
    subtitle: 'Unified depth-agnostic ocean state representation',
    badge: 'Stage 02',
    specs: [
      { label: 'Latent Dimension', value: '384-dimensional vector' },
      { label: 'Spatial Pooling', value: 'Adaptive Avg + Max Spatial' },
      { label: 'Projection', value: 'Linear + LayerNorm' },
      { label: 'Information', value: 'Continuous hydrographic manifold' },
    ],
    description:
      'A compact continuous representation that encodes the entire water column column potential from surface observation. Rather than generating 15 separate representations per depth, a single continuous manifold is maintained.',
    why: 'Allows continuous zero-shot evaluation at unobserved intermediate depths and prevents parameter explosion across vertical strata.',
  },
  {
    id: 'fourier',
    stageNumber: '03',
    name: 'Fourier Depth Conditioning',
    subtitle: 'Continuous vertical coordinate embedding via harmonic frequency basis',
    badge: 'Stage 03',
    specs: [
      { label: 'Harmonic Bands (K)', value: '16 frequency pairs' },
      { label: 'Encoding Dim', value: '32 (sin + cos pairs)' },
      { label: 'Vertical Coord', value: 'Normalized z ∈ [0, 1]' },
      { label: 'Reconstructed Depths', value: '0m to 2000m (15 levels)' },
    ],
    formula: 'γ(d) = [sin(2^0 π d), cos(2^0 π d), ..., sin(2^{15} π d), cos(2^{15} π d)]',
    description:
      'Maps continuous depth coordinates into high-dimensional sinusoidal basis functions before conditioning the decoder. Enables the network to resolve sharp, discontinuous thermocline transitions without grid artifacts.',
    why: 'Scalar depth inputs failed to resolve sharp 0.8°C/m thermocline gradients. 16-band Fourier encoding reduced thermocline RMSE by 0.32°C across 4,200 Argo validation profiles.',
  },
  {
    id: 'mlp_decoder',
    stageNumber: '04',
    name: 'Shared MLP Depth Decoder',
    subtitle: 'Universal vertical profile generator with shared parameter weights',
    badge: 'Stage 04',
    specs: [
      { label: 'Layer Sequence', value: 'MLP: 416 → 256 → 128 → 2' },
      { label: 'Activation Function', value: 'SiLU (Swish) + Residuals' },
      { label: 'Output Quantities', value: 'Temperature (°C) & Salinity (PSU)' },
      { label: 'Weight Sharing', value: '100% shared across all depths' },
    ],
    description:
      'Takes the concatenated ocean embedding (384) + Fourier depth encoding (32) and reconstructs the vertical temperature and salinity fields point-by-point.',
    why: 'A single shared decoder guarantees vertical physical continuity, preventing non-physical temperature inversions that plague depth-decoupled architectures.',
  },
];

const STATS = [
  { label: 'Total Parameters', value: '~1.74M', sub: 'Compact & Edge-Deployable', unit: 'FP32' },
  { label: 'Surface Inputs', value: '7 Channels', sub: 'SST, SSS, SLA, U, V, τx, τy', unit: 'Satellite' },
  { label: 'Reconstructed Depths', value: '15 Strata', sub: '0m to 2,000m Water Column', unit: 'In Situ' },
  { label: 'Latent Manifold', value: '384-Dim', sub: 'Continuous Ocean State', unit: 'Vector' },
];

const DESIGN_DECISIONS = [
  {
    component: 'Encoder Backbone',
    tested: 'ConvLSTM (3 layers)',
    chosen: 'Conv3D Spatiotemporal',
    impact: '4× parameter reduction, faster training, identical 0.42°C RMSE',
    status: 'CHOSEN',
  },
  {
    component: 'Decoder Weighting',
    tested: '15 Separate MLPs per depth',
    chosen: 'Single Shared MLP + Positional',
    impact: 'Eliminates non-physical vertical inversions; generalizes to unseen depths',
    status: 'CHOSEN',
  },
  {
    component: 'Depth Injection',
    tested: 'Scalar depth input z ∈ [0, 2000]',
    chosen: '16-band Fourier Harmonics',
    impact: '0.32°C RMSE improvement in steep thermocline layer (50m–200m)',
    status: 'CHOSEN',
  },
  {
    component: 'Loss Formulation',
    tested: 'Physics-constrained density penalty',
    chosen: 'Smooth L1 + Gradient Consistency',
    impact: 'Prevents overfitting to spurious surface salinity anomalies',
    status: 'CHOSEN',
  },
];

export function ArchitectureBand() {
  const [expandedId, setExpandedId] = useState<string>('conv3d');

  return (
    <section className="py-12 border-t border-white/[0.06] flex flex-col gap-10">
      {/* Section Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-thermocline/15 border border-thermocline/30 text-biolume text-[10px] font-mono tracking-[0.2em] uppercase mb-3">
          <Layers size={12} className="text-biolume" />
          Model Architecture
        </div>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
          How OceanEmbed maps surface signatures to the{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-biolume via-[#6EE7B7] to-thermocline">
            abyssal plane
          </span>
        </h2>
        <p className="text-foam-dim text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed font-light">
          The architecture was not assumed a priori. It emerged through 15 systematic ablation experiments designed to balance physical fidelity, parameter efficiency, and vertical smoothness.
        </p>
      </div>

      {/* Sub-panel A: Double-Bezel Hardware Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {STATS.map((stat, i) => (
          <div
            key={i}
            className="p-1 rounded-[1.75rem] bg-white/[0.03] border border-white/[0.08] hover:border-white/20 transition-all duration-300 group"
          >
            <div className="w-full h-full rounded-[calc(1.75rem-0.25rem)] bg-[#030914] p-5 flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-biolume/[0.06] to-transparent rounded-bl-full pointer-events-none" />

              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/40">
                  {stat.label}
                </span>
                <span className="font-mono text-[8px] text-biolume/60 uppercase px-1.5 py-0.5 rounded bg-biolume/10 border border-biolume/20">
                  {stat.unit}
                </span>
              </div>

              <div className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight group-hover:text-biolume transition-colors duration-300 my-1">
                {stat.value}
              </div>

              <div className="text-[11px] text-white/40 font-mono mt-1">
                {stat.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Pipeline Progression Ribbon */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hidden md:flex items-center justify-between gap-3 overflow-x-auto">
        {ARCHITECTURE_BLOCKS.map((block, idx) => {
          const isSelected = expandedId === block.id;

          return (
            <React.Fragment key={block.id}>
              <button
                type="button"
                onClick={() => setExpandedId(block.id)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-left
                  ${isSelected
                    ? 'bg-biolume/10 border-biolume/40 shadow-[0_0_20px_rgba(0,210,255,0.15)]'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }
                `}
              >
                <span className={`font-mono text-[10px] font-bold ${isSelected ? 'text-biolume' : 'text-white/40'}`}>
                  {block.stageNumber}
                </span>
                <span className={`font-mono text-[10px] tracking-wider uppercase font-medium ${isSelected ? 'text-white' : 'text-white/60'}`}>
                  {block.name.split(' ')[0]}
                </span>
              </button>
              {idx < ARCHITECTURE_BLOCKS.length - 1 && (
                <ArrowRight size={14} className="text-white/20 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Sub-panel B: Block-by-block Vertical Accordion */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
            <Cpu size={13} className="text-biolume" />
            Layer Specification & Mathematical Foundations
          </span>
          <span className="font-mono text-[9px] text-white/25 uppercase tracking-widest">
            Click block to expand
          </span>
        </div>

        {ARCHITECTURE_BLOCKS.map(block => {
          const isExpanded = expandedId === block.id;

          return (
            <div
              key={block.id}
              className={`
                p-1 rounded-[1.75rem] border transition-all duration-300 overflow-hidden
                ${isExpanded
                  ? 'border-biolume/30 bg-gradient-to-b from-biolume/[0.08] to-transparent shadow-[0_0_35px_rgba(0,210,255,0.06)]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15'
                }
              `}
            >
              <div className="w-full h-full rounded-[calc(1.75rem-0.25rem)] bg-[#030914] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? '' : block.id)}
                  className="w-full px-6 py-4.5 flex items-center justify-between text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className={`
                      font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded-full border font-semibold
                      ${isExpanded
                        ? 'bg-biolume/10 border-biolume/40 text-biolume'
                        : 'bg-white/5 border-white/10 text-white/40'
                      }
                    `}>
                      {block.badge}
                    </span>
                    <div>
                      <h4 className="font-display text-base sm:text-lg font-semibold text-white tracking-tight">
                        {block.name}
                      </h4>
                      <p className="text-white/40 text-xs mt-0.5 line-clamp-1 font-light">
                        {block.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`
                      w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300
                      ${isExpanded ? 'border-biolume/40 bg-biolume/10' : 'border-white/10 bg-white/5'}
                    `}>
                      <ChevronDown
                        size={15}
                        className={`text-white/40 transition-transform duration-300 ${
                          isExpanded ? 'rotate-180 text-biolume' : ''
                        }`}
                      />
                    </div>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-3 border-t border-white/[0.04] flex flex-col gap-5">
                        {/* Specs grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                          {block.specs.map((spec, sIdx) => (
                            <div
                              key={sIdx}
                              className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                            >
                              <span className="font-mono text-[8.5px] uppercase tracking-wider text-white/35 block mb-0.5">
                                {spec.label}
                              </span>
                              <span className="font-mono text-xs text-white font-medium">
                                {spec.value}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Formula if available */}
                        {block.formula && (
                          <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="font-mono text-[9px] text-biolume tracking-widest uppercase shrink-0">
                              Harmonic Encoding Formulation
                            </span>
                            <code className="font-mono text-xs text-biolume font-semibold bg-biolume/10 px-3 py-1.5 rounded border border-biolume/20 overflow-x-auto">
                              {block.formula}
                            </code>
                          </div>
                        )}

                        {/* Description & Empirical Why */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.05]">
                            <span className="font-mono text-[8.5px] text-white/35 uppercase tracking-[0.2em] block mb-1.5">
                              Architectural Mechanism
                            </span>
                            <p className="text-white/70 text-xs sm:text-sm leading-relaxed font-light">
                              {block.description}
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-biolume/[0.03] border border-biolume/20">
                            <span className="font-mono text-[8.5px] text-biolume uppercase tracking-[0.2em] block mb-1.5 flex items-center gap-1.5 font-semibold">
                              <Sparkles size={11} className="text-biolume" />
                              Empirical Rationale (Ablation Finding)
                            </span>
                            <p className="text-white/80 text-xs sm:text-sm leading-relaxed font-light">
                              {block.why}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sub-panel C: Design Decisions Log Matrix */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
            <GitBranch size={13} className="text-thermocline" />
            Empirical Architecture Decision Matrix
          </span>
          <span className="font-mono text-[9px] text-white/25 uppercase tracking-widest">
            15 Experiments Evaluated
          </span>
        </div>

        <div className="p-1 rounded-[1.75rem] border border-white/[0.06] bg-white/[0.02]">
          <div className="rounded-[calc(1.75rem-0.25rem)] bg-[#030914] overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="py-3.5 px-6 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
                    Subsystem
                  </th>
                  <th className="py-3.5 px-6 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
                    Alternative Tested
                  </th>
                  <th className="py-3.5 px-6 font-mono text-[9px] uppercase tracking-[0.2em] text-biolume">
                    Chosen Architecture
                  </th>
                  <th className="py-3.5 px-6 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
                    Empirical Justification
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {DESIGN_DECISIONS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-mono text-white font-medium">
                      {row.component}
                    </td>
                    <td className="py-4 px-6 text-white/40 font-mono text-xs">
                      <span className="line-through decoration-white/30">{row.tested}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-biolume/10 border border-biolume/30 text-biolume font-mono text-[10px] font-semibold">
                        <CheckCircle2 size={11} />
                        {row.chosen}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-white/70 text-xs leading-relaxed font-light">
                      {row.impact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
