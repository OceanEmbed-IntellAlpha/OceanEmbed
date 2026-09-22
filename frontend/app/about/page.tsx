import React from 'react';
import { GlobalNav } from '@/components/shared/GlobalNav';

export const metadata = {
  title: 'About — OceanEmbed',
  description: 'OceanEmbed is a solution for SIH 2026 Problem Statement 26066 by INCOIS & MoES.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-abyss text-foam selection:bg-biolume/30 relative overflow-x-hidden">
      <GlobalNav />

      {/* Decorative background effects */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-biolume/5 to-transparent pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-24 z-10 relative">
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          About OceanEmbed
        </h1>
        <p className="font-mono text-xs text-biolume tracking-[0.2em] uppercase mb-16">
          SIH 2026 Problem Statement 26066
        </p>

        <article className="prose prose-invert prose-p:text-foam-dim prose-h2:text-white prose-h2:font-display prose-h2:text-2xl prose-h2:tracking-wide max-w-none">
          
          {/* PS Card */}
          <div className="bg-deep-panel/50 border border-thermocline/30 rounded-lg p-6 mb-12 flex flex-col md:flex-row gap-6 md:gap-12 items-start md:items-center justify-between">
            <div>
              <h2 className="!mt-0 !mb-2 text-xl">Reconstruction of Subsurface Ocean Temperature</h2>
              <p className="!m-0 text-sm">from Surface Observations Using Deep Learning</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded font-mono text-[10px] text-white uppercase tracking-widest text-center">
                PS ID: 26066
              </div>
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded font-mono text-[10px] text-white uppercase tracking-widest text-center">
                MoES / INCOIS
              </div>
            </div>
          </div>

          <h2>The Problem</h2>
          <p>
            The ocean&apos;s subsurface thermal structure plays a critical role in global climate dynamics, marine ecosystems, and extreme weather events. While satellite technology provides unprecedented coverage of the ocean <em>surface</em>, it cannot penetrate beyond a few millimeters. 
          </p>
          <p>
            To understand the deep ocean, we currently rely on expensive, sparse in-situ instruments like Argo floats and buoys. This leaves vast blind spots in our spatial and temporal understanding of the ocean interior.
          </p>

          <div className="my-10 h-px w-full bg-gradient-to-r from-thermocline/0 via-thermocline/20 to-thermocline/0" />

          <h2>The Solution</h2>
          <p>
            OceanEmbed treats the ocean as a coupled dynamical system. Since surface variables (SST, SSS, SSH, currents, and winds) are driven in part by deep ocean processes, they contain latent signatures of the subsurface state.
          </p>
          <p>
            By fusing these multi-modal surface observations through a Spatio-Temporal Autoencoder, we extract an <strong>Ocean Embedding</strong>—a compressed representation of the ocean&apos;s physical state. A depth-aware decoder then reconstructs the full temperature profile across 15 standard depth levels, from the surface down to 1000 meters.
          </p>

          <div className="my-10 h-px w-full bg-gradient-to-r from-thermocline/0 via-thermocline/20 to-thermocline/0" />

          <h2>System Status</h2>
          <div className="bg-biolume/5 border border-biolume/20 p-6 rounded-lg my-6 flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-biolume animate-pulse mt-1.5 shrink-0" />
            <div>
              <h3 className="font-mono text-sm text-biolume uppercase tracking-widest mb-2 !mt-0">Current Development Phase</h3>
              <p className="text-sm text-foam m-0">
                Frontend architecture and visualization pipeline are complete. The deep learning model is currently in active training and validation on the North Indian Ocean dataset.
              </p>
            </div>
          </div>

          <h2>System Architecture</h2>
          <ul className="list-disc pl-6 space-y-2 mt-4 text-foam-dim">
            <li><strong>Frontend Platform:</strong> Next.js 14 App Router, React, TailwindCSS, Zustand</li>
            <li><strong>Geospatial Engine:</strong> Custom high-performance 2D mapping and 3D Dive Mode (Three.js)</li>
            <li><strong>Data Pipeline:</strong> Zarr, Xarray, Python (ETL)</li>
            <li><strong>Deep Learning:</strong> PyTorch (CNN + ViT Encoder, Depth-Decoder)</li>
          </ul>

        </article>
      </div>
    </main>
  );
}
