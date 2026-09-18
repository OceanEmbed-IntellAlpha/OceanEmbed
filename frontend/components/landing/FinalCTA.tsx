'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="relative w-full h-screen min-h-[800px] flex flex-col justify-center items-center overflow-hidden bg-abyss">
      
      {/* ── 1. The Portal Background ───────────────────────────────────────── */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none perspective-[1000px] flex items-center justify-center overflow-hidden"
      >
        {/* The 3D Grid */}
        <div 
          className="absolute bottom-[-20%] w-[200%] h-[150%] scale-100 rotate-x-[75deg] opacity-100"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Base Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(76,224,210,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(76,224,210,0.1)_1px,transparent_1px)] bg-[size:100px_100px]" />
          
          {/* Observation Points (Scatter) */}
          <div className="absolute top-[30%] left-[40%] w-2 h-2 rounded-full bg-biolume shadow-[0_0_15px_rgba(76,224,210,0.8)]" />
          <div className="absolute top-[60%] left-[20%] w-1.5 h-1.5 rounded-full bg-biolume/60 shadow-[0_0_10px_rgba(76,224,210,0.5)]" />
          <div className="absolute top-[45%] left-[70%] w-2 h-2 rounded-full bg-instrument-amber shadow-[0_0_15px_rgba(255,170,0,0.8)]" />
          <div className="absolute top-[80%] left-[65%] w-1 h-1 rounded-full bg-biolume/40" />
        </div>

        {/* Ocean Horizon Gradient Fade (Top edge) */}
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-abyss via-abyss/80 to-transparent z-10" />
      </div>

      {/* ── 2. Content ────────────────────────────────────────────────────── */}
      <div className="relative z-30 flex flex-col items-center text-center max-w-4xl px-6">
        <p className="font-mono text-xs tracking-[0.3em] text-biolume uppercase mb-8">
          Ocean Intelligence Platform
        </p>
        
        <h2 className="font-display text-5xl md:text-7xl font-semibold text-white mb-8 tracking-tighter leading-[1.1]">
          Explore what is happening<br className="hidden md:block" /> 
          <span className="text-white/60 font-normal">beneath the surface.</span>
        </h2>
        
        <p className="font-ui text-xl text-foam-dim mb-16 max-w-2xl mx-auto leading-relaxed">
          Explore temperature, salinity, currents, depth profiles, observations and model context.
        </p>
        
        {/* Primary CTA Button */}
        <Link
          href="/explore"
          className="group relative flex items-center gap-4 bg-deep-panel border border-thermocline/30 text-white px-10 py-5 rounded-sm hover:border-biolume hover:bg-[#06121f] transition-all duration-300"
        >
          {/* Subtle background glow on hover */}
          <div className="absolute inset-0 bg-biolume/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-sm pointer-events-none" />
          
          <span className="font-mono text-sm font-bold tracking-[0.2em] uppercase relative z-10">
            Launch Ocean Explorer
          </span>
          <ArrowRight className="w-5 h-5 text-biolume group-hover:translate-x-1.5 transition-transform duration-300 relative z-10" />
        </Link>
      </div>

    </section>
  );
}
