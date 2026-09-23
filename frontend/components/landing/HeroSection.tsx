'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, Compass, FlaskConical } from 'lucide-react';

import { FallingStars } from './FallingStars';
import { HeroSolutionDock } from './HeroSolutionDock';

const HeroGlobe = dynamic(() => import('./HeroGlobe'), {
  ssr: false,
  loading: () => null,
});

export function HeroSection() {
  const [activeStationId, setActiveStationId] = useState('STN-AS01');
  const [activeConversionStep, setActiveConversionStep] = useState(1);

  return (
    <section
      id="hero-section"
      className="relative min-h-[100dvh] flex items-center justify-center border-b border-white/10 pt-24 pb-16 lg:py-0"
    >
      {/* Background Oceanic Void & Natural Celestial Atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_35%,#07192f_0%,#020b14_55%,#01050a_100%)]" />
        <div className="absolute top-[-10%] right-[10%] w-[50%] h-[50%] bg-[#0284c7]/10 blur-[160px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#064e3b]/10 blur-[160px] rounded-full pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#01050a] to-transparent" />
      </div>

      {/* Lightweight celestial star streaks */}
      <FallingStars />

      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center justify-between px-6 lg:min-h-[860px] h-full pointer-events-none">
        {/* Left Side: Editorial Typography & Problem Statement (pointer-events-auto for clicks) */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left w-full lg:w-[48%] z-20 pt-8 lg:pt-0 pointer-events-auto">
          

          {/* Majestic Editorial Headline */}
          <h1 className="font-outfit text-4xl sm:text-5xl md:text-6xl lg:text-[4.3rem] font-bold tracking-tight text-white leading-[1.06] mb-6">
            See Beneath <br />
            <span className="text-white/70 font-normal">the Ocean Surface.</span>
          </h1>

          {/* Authoritative Subheading */}
          <p className="font-sans text-base sm:text-lg text-foam/80 font-normal max-w-lg leading-relaxed mb-8">
            Reconstructing 1000 meters of vertical ocean temperature from satellite altimetry and surface radiometry with a 7.85M parameter neural operator.
          </p>

          {/* Minimal Scientific Telemetry Spec */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs font-mono text-foam/60 mb-10">
            <span>0–1000m Sounding</span>
            <span className="text-white/20">/</span>
            <span>0.25° Daily Grid</span>
            <span className="text-white/20">/</span>
            <span className="text-emerald-400 font-medium">Test RMSE = 0.525 °C</span>
          </div>

          {/* Agency-Grade "Button-in-Button" CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full sm:w-auto">
            {/* Primary CTA with Nested Trailing Icon */}
            <Link 
              href="/explorer" 
              className="
                group relative flex items-center justify-between gap-3 w-full sm:w-auto
                pl-6 pr-2 py-2 rounded-full border border-biolume/40 bg-biolume/10 text-white font-sans font-semibold text-sm sm:text-base
                hover:bg-biolume hover:text-black hover:border-biolume transition-all duration-300 transform hover:-translate-y-0.5
                shadow-[0_0_25px_rgba(76,224,210,0.25)] hover:shadow-[0_0_35px_rgba(76,224,210,0.5)] backdrop-blur-xl
              "
            >
              <span>Launch 3D Explorer</span>
              <span className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-black/15 flex items-center justify-center transition-colors">
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>

            {/* Secondary Link to Research Lab */}
            <Link 
              href="/research-lab" 
              className="
                flex items-center justify-center gap-2 w-full sm:w-auto
                px-6 py-3 rounded-full border border-white/15 text-foam/90 bg-white/[0.03] backdrop-blur-md
                font-sans font-medium text-sm sm:text-base hover:bg-white/10 hover:border-white/40 hover:text-white transition-all duration-300
              "
            >
              <FlaskConical size={16} className="text-foam/60" />
              <span>Research Lab</span>
            </Link>
          </div>
        </div>

        {/* Right Side: Interactive Solution Telemetry Dock (pointer-events-auto) */}
        <div className="w-full lg:w-auto mt-10 lg:mt-0 z-20 flex justify-center lg:justify-end lg:self-end lg:mb-8 pointer-events-auto">
          <HeroSolutionDock
            activeStationId={activeStationId}
            onSelectStation={setActiveStationId}
            activeConversionStep={activeConversionStep}
            onSelectConversionStep={setActiveConversionStep}
          />
        </div>
      </div>

      {/* 3D Solution Visualization Globe (Optimized Right-Half Positioning) */}
      <div className="absolute inset-0 lg:left-[44%] lg:right-0 select-none z-[1] flex items-center justify-center opacity-85 sm:opacity-95 lg:opacity-100 transition-opacity pointer-events-auto overflow-hidden">
        {/* Soft celestial radial illumination */}
        <div className="absolute z-[0] inset-0 bg-[radial-gradient(circle_at_55%_48%,rgba(2,132,199,0.12)_0%,transparent_65%)] blur-2xl pointer-events-none" />
        
        {/* ThreeJS Globe Canvas */}
        <div className="absolute inset-0 z-[1] w-full h-full">
          <Suspense fallback={null}>
            <HeroGlobe
              activeStationId={activeStationId}
              activeConversionStep={activeConversionStep}
            />
          </Suspense>
        </div>
      </div>

      {/* Top Atmosphere Scrim: guarantees clean contrast for navbar over 3D globe */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#01050a] via-[#01050a]/80 to-transparent pointer-events-none z-[8]" />
    </section>
  );
}
