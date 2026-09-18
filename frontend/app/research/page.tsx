import React from 'react';
import { GlobalNav } from '@/components/shared/GlobalNav';
import { DatasetCard } from '@/components/research/DatasetCard';
import datasetsData from '@/lib/fixtures/datasets.json';
import type { DatasetCard as DatasetCardType } from '@/lib/api/types';

export const metadata = {
  title: 'Research & Datasets — OceanEmbed',
  description: 'Datasets and architecture details for OceanEmbed subsurface temperature reconstruction.',
};

export default function ResearchPage() {
  const datasets = datasetsData as DatasetCardType[];

  return (
    <main className="min-h-screen bg-abyss flex flex-col relative overflow-hidden text-foam">
      <GlobalNav />
      
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-instrument-amber/5 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="relative pt-32 pb-24 px-6 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-24">
        
        {/* Header */}
        <section className="text-center md:text-left">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-thermocline/30 bg-deep-panel/50 mb-6">
            <div className="w-2 h-2 rounded-full bg-instrument-amber shadow-[0_0_8px_rgba(232,163,61,0.8)]" />
            <span className="font-mono text-[10px] tracking-[0.2em] text-thermocline uppercase">
              Research
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-white tracking-tighter leading-tight mb-6">
            Datasets & Validation
          </h1>
          <p className="text-foam/70 max-w-2xl text-lg">
            OceanEmbed leverages high-resolution satellite products to train a latent embedding of the ocean surface, using GLORYS12V1 as the volumetric target. Independent ARGO profiles confirm real-world performance.
          </p>

          {/* Data Spec Strip */}
          <div className="mt-12 w-full flex flex-wrap items-center gap-2 md:gap-4 justify-center md:justify-start">
            <div className="px-3 py-1.5 rounded border border-white/10 bg-white/5 font-mono text-[10px] md:text-xs text-white uppercase tracking-widest">
              North Indian Ocean
            </div>
            <div className="px-3 py-1.5 rounded border border-white/10 bg-white/5 font-mono text-[10px] md:text-xs text-white uppercase tracking-widest">
              5°N–30°N | 45°E–105°E
            </div>
            <div className="px-3 py-1.5 rounded border border-white/10 bg-white/5 font-mono text-[10px] md:text-xs text-white uppercase tracking-widest">
              0.25° × 0.25°
            </div>
            <div className="px-3 py-1.5 rounded border border-white/10 bg-white/5 font-mono text-[10px] md:text-xs text-white uppercase tracking-widest">
              Daily
            </div>
            <div className="px-3 py-1.5 rounded border border-white/10 bg-white/5 font-mono text-[10px] md:text-xs text-white uppercase tracking-widest">
              15 Depths
            </div>
            <div className="px-3 py-1.5 rounded border border-white/10 bg-white/5 font-mono text-[10px] md:text-xs text-white uppercase tracking-widest">
              0–1000m
            </div>
          </div>
        </section>

        {/* Datasets Grid */}
        <section>
          <div className="flex items-center gap-4 mb-8 border-b border-thermocline/20 pb-4">
            <h2 className="font-display text-2xl text-white font-bold tracking-tight">Data Integration</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map(dataset => (
              <DatasetCard key={dataset.id} dataset={dataset} />
            ))}
          </div>
        </section>

        {/* Model Architecture */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="font-display text-2xl text-white font-bold tracking-tight mb-4 border-b border-thermocline/20 pb-4">
              Model Architecture
            </h2>
            <div className="prose prose-invert prose-p:text-foam/80 prose-p:leading-relaxed max-w-none">
              <p>
                Our core architecture is a <strong>Spatio-Temporal Autoencoder (STAE)</strong> tailored for oceanic data. 
                Surface fields (SST, SSS, SSH, U, V) are stacked temporally to capture both spatial gradients and temporal evolution.
              </p>
              <p>
                The <strong>Encoder</strong> utilizes Convolutional Neural Networks (CNN) coupled with Vision Transformer (ViT) attention blocks to extract both local mesoscale eddies and broad basin-wide signals. This produces a low-dimensional <em>Ocean Embedding</em>.
              </p>
              <p>
                The <strong>Depth-Aware Decoder</strong> takes this latent embedding and projects it across 15 vertical layers (0m to 1000m). A custom loss function penalizes instability in the vertical density profile, ensuring oceanographic consistency.
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl text-white font-bold tracking-tight mb-4 border-b border-thermocline/20 pb-4">
              Regional Validation (ARGO)
            </h2>
            <div className="bg-deep-panel border border-thermocline/20 rounded-lg overflow-hidden">
              <table className="w-full text-left font-mono text-sm">
                <thead>
                  <tr className="bg-black/40 border-b border-thermocline/20">
                    <th className="p-4 text-foam-dim font-normal tracking-widest uppercase text-xs">Region</th>
                    <th className="p-4 text-foam-dim font-normal tracking-widest uppercase text-xs">Profiles</th>
                    <th className="p-4 text-foam-dim font-normal tracking-widest uppercase text-xs">RMSE</th>
                    <th className="p-4 text-foam-dim font-normal tracking-widest uppercase text-xs">Bias</th>
                    <th className="p-4 text-foam-dim font-normal tracking-widest uppercase text-xs">Corr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-thermocline/10">
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white">N. Indian Ocean</td>
                    <td className="p-4">12,450</td>
                    <td className="p-4 text-validation-good">0.82°C</td>
                    <td className="p-4">+0.08°C</td>
                    <td className="p-4">0.95</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white">Bay of Bengal</td>
                    <td className="p-4">4,120</td>
                    <td className="p-4 text-validation-good">0.78°C</td>
                    <td className="p-4">+0.05°C</td>
                    <td className="p-4">0.96</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white">Arabian Sea</td>
                    <td className="p-4">8,330</td>
                    <td className="p-4 text-validation-warn">0.89°C</td>
                    <td className="p-4">+0.12°C</td>
                    <td className="p-4">0.93</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs font-mono text-foam-dim uppercase tracking-widest">
              * Validated on independent profiles not used during training.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
