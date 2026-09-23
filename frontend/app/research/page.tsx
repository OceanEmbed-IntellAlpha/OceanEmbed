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
        <section className="text-center md:text-left relative z-10">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-instrument-amber/40 bg-deep-panel/60 backdrop-blur-md mb-8 shadow-[0_4px_24px_rgba(232,163,61,0.15)] hover:bg-deep-panel/80 hover:border-instrument-amber/60 transition-all duration-300">
            <div className="w-2.5 h-2.5 rounded-full bg-instrument-amber animate-pulse shadow-[0_0_12px_rgba(232,163,61,1)]" />
            <span className="font-mono text-[11px] font-bold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-instrument-amber to-amber-200 uppercase">
              Research
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold text-white tracking-tighter leading-tight mb-8 drop-shadow-lg">
            Datasets & Validation
          </h1>
          <p className="text-foam/80 max-w-2xl text-xl leading-relaxed font-light">
            OceanEmbed trains a U-Net encoder-decoder on 13 years of satellite-derived surface observations,
            using GLORYS12V1 as the volumetric target. Independent ARGO profiles confirm real-world performance.
          </p>

          {/* Data Spec Strip */}
          <div className="mt-12 w-full flex flex-wrap items-center gap-3 justify-center md:justify-start">
            {['North Indian Ocean', '5°N–30°N | 45°E–105°E', '0.25° × 0.25°', 'Daily', '15 Depths', '0.49–902 m'].map((spec, i) => (
              <div key={i} className="px-4 py-2 rounded-md border border-white/10 bg-black/30 backdrop-blur-sm font-mono text-[10px] md:text-xs text-white uppercase tracking-widest shadow-sm hover:border-instrument-amber/30 hover:bg-instrument-amber/10 transition-colors cursor-default">
                {spec}
              </div>
            ))}
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
          <div className="bg-deep-panel/30 backdrop-blur-md rounded-2xl p-8 border border-white/5 hover:bg-deep-panel/40 transition-colors duration-500 shadow-xl">
            <h2 className="font-display text-2xl text-white font-bold tracking-tight mb-6 flex items-center gap-3">
              <div className="w-2 h-6 bg-instrument-amber rounded-sm" />
              Model Architecture
            </h2>
            <div className="prose prose-invert prose-p:text-foam/80 prose-p:leading-relaxed max-w-none">
              <p>
                Our production model is a <strong>U-Net encoder-decoder</strong> (~7.85M parameters)
                operating on 7 surface channels plus 7 validity masks at 0.25° resolution.
              </p>
              <p>
                The <strong>Encoder</strong> consists of 3 convolutional stages with BatchNorm,
                ReLU, and 2×2 max-pooling, extracting progressively coarser spatial features from
                mesoscale eddies to basin-wide gradients. Skip connections preserve fine-scale detail
                across the bottleneck.
              </p>
              <p>
                The <strong>Decoder</strong> upsamples the bottleneck feature map back to full 0.25°
                grid resolution using bilinear upsampling and convolution with skip connections from
                the encoder.
              </p>
              <p>
                The output head produces <strong>15 depth levels from 0.49 m to 902 m</strong> as
                temperature anomalies relative to a day-of-year climatology, which is added back at
                inference to produce absolute temperatures.
              </p>
              <p className="text-sm text-foam/60 italic">
                Loss: MSE (auxiliary thermocline and smoothness losses tested but rejected via ablation,
                improving test RMSE from 0.605°C to 0.594°C).
              </p>
            </div>
          </div>

          <div className="bg-deep-panel/30 backdrop-blur-md rounded-2xl p-8 border border-white/5 hover:bg-deep-panel/40 transition-colors duration-500 shadow-xl">
            <h2 className="font-display text-2xl text-white font-bold tracking-tight mb-6 flex items-center gap-3">
              <div className="w-2 h-6 bg-instrument-amber rounded-sm" />
              Regional Validation (ARGO)
            </h2>
            <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
              <table className="w-full text-left font-mono text-sm">
                <thead>
                  <tr className="bg-black/50 border-b border-white/10">
                    <th className="p-4 text-foam-dim font-medium tracking-widest uppercase text-xs">Region</th>
                    <th className="p-4 text-foam-dim font-medium tracking-widest uppercase text-xs">Profiles</th>
                    <th className="p-4 text-foam-dim font-medium tracking-widest uppercase text-xs">RMSE</th>
                    <th className="p-4 text-foam-dim font-medium tracking-widest uppercase text-xs">Bias</th>
                    <th className="p-4 text-foam-dim font-medium tracking-widest uppercase text-xs">Corr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-instrument-amber/10 transition-colors group cursor-default">
                    <td className="p-4 text-white group-hover:text-instrument-amber transition-colors">N. Indian Ocean</td>
                    <td className="p-4 text-foam">8,883</td>
                    <td className="p-4 text-validation-good font-semibold">1.572°C</td>
                    <td className="p-4 text-foam">−0.298°C</td>
                    <td className="p-4 text-foam">0.980</td>
                  </tr>
                  <tr className="hover:bg-instrument-amber/10 transition-colors group cursor-default">
                    <td className="p-4 text-white group-hover:text-instrument-amber transition-colors">Bay of Bengal</td>
                    <td className="p-4 text-foam">2,779</td>
                    <td className="p-4 text-validation-good font-semibold">1.390°C</td>
                    <td className="p-4 text-foam">−0.209°C</td>
                    <td className="p-4 text-foam">0.988</td>
                  </tr>
                  <tr className="hover:bg-instrument-amber/10 transition-colors group cursor-default">
                    <td className="p-4 text-white group-hover:text-instrument-amber transition-colors">Arabian Sea</td>
                    <td className="p-4 text-foam">5,943</td>
                    <td className="p-4 text-validation-warn font-semibold">1.646°C</td>
                    <td className="p-4 text-foam">−0.338°C</td>
                    <td className="p-4 text-foam">0.973</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-5 text-[10px] font-mono text-foam-dim/60 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-instrument-amber/50" />
              Validated on 8,883 independent ARGO profiles (2020–2022) not used during training.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}