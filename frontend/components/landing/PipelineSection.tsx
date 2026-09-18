'use client';

import React from 'react';
import { Network, Satellite, Database, ArrowRight } from 'lucide-react';

export function PipelineSection() {
  const [hoveredVar, setHoveredVar] = React.useState<string | null>(null);

  const variables = [
    { id: 'sst', name: 'SST', full: 'Sea Surface Temperature', source: 'ESA CCI / OSTIA (0.05°)', color: '#f97316' },
    { id: 'sss', name: 'SSS', full: 'Sea Surface Salinity', source: 'SMOS / SMAP (0.25°)', color: '#14b8a6' },
    { id: 'ssh', name: 'SSH / SLA', full: 'Sea Surface Height Anomaly', source: 'AVISO / CMEMS Altimetry', color: '#38bdf8' },
    { id: 'currents', name: 'U/V Currents', full: 'Surface Ocean Velocity', source: 'OSCAR / INCOIS Currents', color: '#4CE0D2' },
    { id: 'winds', name: 'U/V Winds', full: 'Surface 10m Wind Stress', source: 'ECMWF ERA5 Reanalysis', color: '#a855f7' },
  ];

  return (
    <section id="pipeline" className="relative py-28 md:py-36 bg-[#02070e] border-t border-thermocline/15">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 font-mono text-xs font-bold tracking-[0.25em] text-biolume uppercase mb-4 px-4 py-1.5 rounded-full border border-biolume/30 bg-biolume/10 backdrop-blur-md">
            Spatio-Temporal Deep Learning
          </div>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight mb-4 leading-tight">
            From Surface Signals <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-biolume via-biolume to-surfaceSignal">
              to Latent Ocean State.
            </span>
          </h2>
          <p className="text-foam-dim text-base md:text-lg leading-relaxed">
            Multi-modal satellite observations provide the thermodynamic boundary conditions of the ocean surface. Our deep learning encoder compresses these coupled dynamics into a unified latent ocean embedding.
          </p>
        </div>

        {/* ── SECTION 14 CONVERGENCE FUNNEL VISUAL ─────────────────── */}
        <div className="mb-24 p-8 rounded-3xl bg-[#040C16] border border-white/10 backdrop-blur-2xl relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div className="text-xs font-mono text-foam-dim uppercase tracking-widest text-center mb-8">
            Multimodal Input Convergence &amp; Latent Projection
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* 1. Five Surface Inputs (md:col-span-4) */}
            <div className="md:col-span-4 flex flex-col gap-2.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-foam-dim pl-1">
                5 Surface Boundary Inputs:
              </span>
              {variables.map((v) => {
                const isHovered = hoveredVar === v.id;
                return (
                  <div
                    key={v.id}
                    onMouseEnter={() => setHoveredVar(v.id)}
                    onMouseLeave={() => setHoveredVar(null)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isHovered
                        ? 'bg-white/10 border-white/40 shadow-lg scale-[1.02]'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
                      <div>
                        <span className="font-mono text-xs font-bold text-white block">{v.name}</span>
                        <span className="text-[11px] text-foam-dim">{v.full}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[9px] text-white/40 uppercase hidden sm:inline-block">
                      {v.source.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 2. Convergence Arrows / Encoder (md:col-span-4) */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-biolume/15 border border-biolume/50 shadow-[0_0_40px_rgba(0,210,255,0.3)] flex flex-col items-center justify-center relative mb-4">
                <span className="w-3 h-3 rounded-full bg-biolume animate-ping absolute -top-1 -right-1" />
                <Network className="w-8 h-8 text-biolume" />
                <span className="font-mono text-[8px] text-white/60 tracking-wider uppercase mt-1">Encoder</span>
              </div>
              <h4 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-1">
                Ocean Embedding
              </h4>
              <p className="font-ui text-xs text-foam-dim max-w-[220px]">
                High-dimensional latent representation encoding mixed layer physics &amp; thermocline coupling.
              </p>
            </div>

            {/* 3. Decoder & 15 Depths (md:col-span-4) */}
            <div className="md:col-span-4 flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-foam-dim">
                <span>Depth-Conditioned Decoder</span>
                <span className="text-instrument-amber">15 Depth Levels</span>
              </div>

              <div className="flex items-center gap-1.5 py-3">
                {[0, 10, 50, 100, 200, 500, 1000].map((d) => (
                  <div key={d} className="flex-1 flex flex-col items-center">
                    <div className="w-full h-8 rounded bg-gradient-to-b from-biolume/30 to-thermocline/40 border border-white/10 flex items-center justify-center">
                      <span className="font-mono text-[9px] text-white font-bold">{d}m</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="font-ui text-xs text-foam-dim leading-relaxed">
                A specialized decoder projects the continuous latent vector down through the water column, predicting physical temperature profiles from 0m to 1000m.
              </p>
            </div>

          </div>
        </div>

        {/* ── 6-STEP PIPELINE CARDS ─────────────────────────────────── */}
        <div className="mb-12">
          <div className="text-xs font-mono text-foam-dim uppercase tracking-widest text-center mb-10">
            End-to-End Architectural Pipeline
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector lines for desktop */}
          <div className="hidden md:block absolute top-[40%] left-[10%] right-[10%] h-0.5 bg-thermocline/20 z-0">
             <div className="h-full bg-biolume/50 w-full animate-scan-line"></div>
          </div>

          {[
            {
              step: '01',
              title: 'Surface Satellite Input',
              desc: 'Ingest SST, SSS, SSH, Wind & Current data fields from satellite observations.',
              icon: <Satellite className="w-6 h-6 text-surfaceSignal" />,
              borderColor: 'border-surfaceSignal/30'
            },
            {
              step: '02',
              title: 'Deep Feature Extraction',
              desc: 'CNNs and Vision Transformers extract spatial embeddings from the 2D surface fields.',
              icon: <Network className="w-6 h-6 text-embeddingPurple" />,
              borderColor: 'border-embeddingPurple/30'
            },
            {
              step: '03',
              title: 'Argo In-Situ Anchoring',
              desc: 'Sparse ARGO float profiles are ingested to anchor the model to physical ground truth.',
              icon: <Database className="w-6 h-6 text-argoObs" />,
              borderColor: 'border-argoObs/30'
            },
            {
              step: '04',
              title: 'Spatiotemporal Fusion',
              desc: 'Fusing surface features with historical climatology to understand long-term physical trends.',
              icon: <Database className="w-6 h-6 text-thermocline" />,
              borderColor: 'border-thermocline/30'
            },
            {
              step: '05',
              title: '15-Level Prediction',
              desc: 'The decoder architecture projects the fused embeddings into 15 distinct standard depth levels.',
              icon: <Network className="w-6 h-6 text-instrument-amber" />,
              borderColor: 'border-instrument-amber/30'
            },
            {
              step: '06',
              title: '3D Ocean Visualization',
              desc: 'CesiumJS and WebGL map the predictions in an interactive 3D digital twin of the Indian Ocean.',
              icon: <Satellite className="w-6 h-6 text-biolume" />,
              borderColor: 'border-biolume/30'
            }
          ].map((item, i) => (
            <div key={i} className={`relative z-10 p-8 rounded-2xl bg-deep-panel/80 border ${item.borderColor} backdrop-blur-md flex flex-col items-start`}>
              <div className="p-3 rounded-xl bg-black/50 mb-6">
                {item.icon}
              </div>
              <div className="text-xs font-mono text-foam-dim mb-2 uppercase tracking-widest">Step {item.step}</div>
              <h3 className="text-xl font-bold text-white mb-3 font-display">{item.title}</h3>
              <p className="text-foam/80 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
