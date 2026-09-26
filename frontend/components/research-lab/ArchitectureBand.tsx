'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Cpu, 
  Layers, 
  ArrowRight, 
  Eye, 
  Workflow
} from 'lucide-react';
import { ArchitectureBlock } from './ArchitectureModal';

export const EXPANDED_ARCHITECTURE_BLOCKS: ArchitectureBlock[] = [
  {
    id: 'surface-input-masks',
    title: '1. Surface Input & Validity Masks',
    subtitle: '7 Surface Observation Channels + 7 Validity Masks',
    tag: 'Input Layer',
    description: 'Concatenates 7 surface oceanographic observations (SST, SSS, SLA, u, v, uwnd, vwnd) with matching boolean validity masks into a 14-channel input tensor.',
    tensorShape: 'Input: [B, 14, 101, 241]',
    formula: 'X_{in} = Concat([SST, SSS, SLA, u, v, uwnd, vwnd], [M_{SST}, ...])',
    physicalMeaning: 'Provides full multi-modal surface state while explicitly signaling cloud coverage or missing satellite observation pixels via binary masks.'
  },
  {
    id: 'conv2d-encoder',
    title: '2. 4-Stage Conv2d Encoder',
    subtitle: '4 Encoder Stages of Conv2d + BatchNorm + ReLU',
    tag: 'Encoder Stage',
    description: 'Extracts multi-scale oceanographic features across 4 downsampling stages using 2D convolutions, Batch Normalization, and ReLU activations with Max-Pooling between stages.',
    tensorShape: 'Input: [B, 14, 101, 241] → Output: [B, 512, 13, 31]',
    formula: 'F_e = MaxPool(ReLU(BatchNorm(Conv2d(F_{e-1}))))',
    physicalMeaning: 'Captures mesoscale dynamics, eddy structures, and spatial gradients (∇SST, ∇SLA) at progressive spatial receptive fields.'
  },
  {
    id: 'conv-bottleneck',
    title: '3. Convolutional Bottleneck',
    subtitle: 'Dense Latent Feature Representation',
    tag: 'Bottleneck',
    description: 'Central bottleneck layer compressing spatial receptive fields into a 512-channel deep feature map at 13 × 31 resolution.',
    tensorShape: 'Feature Map: [B, 512, 13, 31]',
    formula: 'Z_{latent} = DoubleConv512(Encoder_4)',
    physicalMeaning: 'Integrates basin-scale circulation context and deep baroclinic coupling across the entire North Indian Ocean domain.'
  },
  {
    id: 'unet-decoder-skips',
    title: '4. 4-Stage Upsampling Decoder with Skips',
    subtitle: 'Bilinear Upsampling + Conv2d + Skip Connections',
    tag: 'Decoder Stage',
    description: 'Upsamples bottleneck representations across 4 stages using bilinear interpolation and 2D convolutions concatenated with encoder skip connections.',
    tensorShape: 'Input: [B, 512, 13, 31] → Output: [B, 64, 101, 241]',
    formula: 'F_d = Conv2d(Concat(BilinearUpsample(F_{d-1}), Skip_e))',
    physicalMeaning: 'Skip connections preserve fine-grained surface spatial gradients while reconstructing vertical thermal structure across depth.'
  },
  {
    id: '15-depth-output-head',
    title: '5. 15-Depth Anomaly Output Head',
    subtitle: 'Direct 15-Level Temperature Anomaly Prediction',
    tag: 'Output Head',
    description: 'Final 1x1 convolution mapping decoder features to 15 temperature anomaly channels corresponding to discrete GLORYS depths (0.49 m to 902.34 m).',
    tensorShape: 'Output Anomaly: [B, 15, 101, 241]',
    formula: 'T_{anomaly} = Conv_{1x1}(Decoder_4)',
    physicalMeaning: 'Yields simultaneous temperature anomaly predictions for 15 standard oceanographic depth layers from near-surface (0.49m) to 902.34m depth.'
  },
  {
    id: 'climatology-postproc',
    title: '6. Climatology Post-Processing',
    subtitle: 'Reconstruction of Absolute Temperature Field',
    tag: 'Post-Processing',
    description: 'Adds pre-computed monthly mean climatology back to predicted temperature anomalies to recover absolute ocean temperature fields in °C.',
    tensorShape: 'Output Absolute: [B, 15, 101, 241] (°C)',
    formula: 'T_{absolute} = T_{anomaly} + T_{climatology}',
    physicalMeaning: 'Combines ML anomaly predictive skill with robust historical climatological reference baselines.'
  }
];

interface ArchitectureBandProps {
  onSelectBlock?: (block: ArchitectureBlock) => void;
}

export function ArchitectureBand({ onSelectBlock }: ArchitectureBandProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'encoder' | 'decoder' | 'output'>('all');

  const filteredBlocks = EXPANDED_ARCHITECTURE_BLOCKS.filter(b => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'encoder') return b.tag.includes('Input') || b.tag.includes('Encoder') || b.tag.includes('Bottleneck');
    if (activeCategory === 'decoder') return b.tag.includes('Decoder');
    if (activeCategory === 'output') return b.tag.includes('Output') || b.tag.includes('Post-Processing');
    return true;
  });

  return (
    <section className="py-6 flex flex-col gap-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-zinc-800 relative">
        <div className="absolute top-0 right-1/4 w-64 h-32 bg-indigo-500/10 blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono tracking-widest uppercase mb-3">
            <Cpu size={12} className="text-indigo-400" />
            Neural Architecture Inspector (~7.85M Parameters)
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            OceanEmbed v2 U-Net Architecture
          </h2>
          <p className="text-zinc-400 text-sm mt-2 max-w-2xl leading-relaxed">
            End-to-end U-Net encoder-decoder architecture with skip connections. Maps 7 surface channels + 7 validity masks [14 × 101 × 241] to a 15-depth anomaly prediction output head [15 × 101 × 241].
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 shrink-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeCategory === 'all'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            All Stages (6)
          </button>
          <button
            onClick={() => setActiveCategory('encoder')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeCategory === 'encoder'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            Inputs & Encoder
          </button>
          <button
            onClick={() => setActiveCategory('decoder')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeCategory === 'decoder'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            Decoder & Skips
          </button>
          <button
            onClick={() => setActiveCategory('output')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeCategory === 'output'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            Output Head
          </button>
        </div>
      </div>

      {/* Architecture Data Pipeline Flow Diagram Banner */}
      <div className="p-1 rounded-xl bg-zinc-900 border border-zinc-800/80">
        <div className="rounded-lg bg-zinc-950 p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-400 font-semibold flex items-center gap-2">
              <Workflow size={14} /> End-to-End OceanEmbed v2 U-Net Pipeline
            </span>
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
              MSE Objective Loss Only
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center text-xs">
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-1">
              <span className="text-[10px] text-zinc-500 uppercase font-medium tracking-wider">1. Input Tensor</span>
              <span className="text-white font-mono font-bold text-xs">[14 × 101 × 241]</span>
              <span className="text-[10px] text-zinc-400">7 Surface Vars + 7 Masks</span>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-1">
              <span className="text-[10px] text-zinc-500 uppercase font-medium tracking-wider">2. 4-Stage Encoder</span>
              <span className="text-emerald-400 font-mono font-bold text-xs">Conv2d + BN + ReLU</span>
              <span className="text-[10px] text-zinc-400">Max-Pooling Between Stages</span>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-1">
              <span className="text-[10px] text-zinc-500 uppercase font-medium tracking-wider">3. Decoder & Skips</span>
              <span className="text-purple-400 font-mono font-bold text-xs">Bilinear Upsample</span>
              <span className="text-[10px] text-zinc-400">Skip Connections to Encoder</span>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-1">
              <span className="text-[10px] text-zinc-500 uppercase font-medium tracking-wider">4. 15-Depth Output</span>
              <span className="text-amber-400 font-mono font-bold text-xs">[15 × 101 × 241]</span>
              <span className="text-[10px] text-zinc-400">0.49 m to 902.34 m Depths</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Architecture Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBlocks.map((block, idx) => (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onSelectBlock?.(block)}
            className="group relative p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between gap-3 overflow-hidden"
          >
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-[9px] text-zinc-300 font-medium uppercase tracking-wider truncate max-w-[140px]">
                  {block.tag}
                </span>
                <div className="w-6 h-6 rounded-md bg-zinc-800/50 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 group-hover:bg-zinc-700 transition-colors shrink-0">
                  <Eye size={14} />
                </div>
              </div>

              {/* Title & Subtitle */}
              <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors leading-snug break-words">
                {block.title}
              </h4>
              <p className="text-xs text-zinc-500 font-medium mt-1 leading-tight break-words">
                {block.subtitle}
              </p>

              {/* Description */}
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed line-clamp-3 break-words">
                {block.description}
              </p>
            </div>

            {/* Bottom Meta */}
            <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between text-[10px] font-mono overflow-hidden">
                <span className="text-zinc-500">Tensor:</span>
                <span className="text-zinc-300 font-medium truncate max-w-[160px]">{block.tensorShape}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                <span>Inspect Details</span>
                <ArrowRight size={12} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
