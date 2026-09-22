'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/gsap';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const InstrumentsScene = dynamic(
  () => import('./instruments/InstrumentsScene').then(m => m.InstrumentsScene),
  { ssr: false }
);

export function MeetTheInstruments() {
  const containerRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  
  const [progress, setProgress] = useState(0);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReduced) {
        setProgress(1);
        return;
      }

        // Pin the container and track scroll progress to drive the 3D scene
        ScrollTrigger.create({
          trigger: containerRef.current,
          start: 'top top',
          end: '+=350%', // Increased scroll duration significantly
          pin: true,
        scrub: true,
        onUpdate: (self) => {
          setProgress(self.progress);
        },
      });

      // Text Entrance (Fade up heavy)
      gsap.fromTo(
        textRef.current,
        { opacity: 0, y: 40, filter: 'blur(8px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 60%',
          }
        }
      );

      // CTA Fade In
      gsap.fromTo(
        ctaRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 50%',
          }
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      id="instruments"
      className="relative w-full min-h-[100dvh] bg-[#02050A] overflow-hidden flex flex-col md:flex-row border-t border-white/5"
    >
      {/* ── Background Noise Texture ── */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      {/* ── Left Side: Editorial Typography ── */}
      <div className="w-full md:w-[45%] h-full min-h-[50vh] flex flex-col justify-center p-8 md:p-16 lg:p-24 relative z-20 pointer-events-none">
        
        <div ref={textRef}>
          {/* Eyebrow Tag */}
          <div className="inline-block rounded-full border border-thermocline/30 bg-thermocline/5 px-3 py-1 mb-8 backdrop-blur-md">
            <p className="font-mono text-[10px] tracking-[0.2em] text-thermocline uppercase font-medium">
              Physical Infrastructure
            </p>
          </div>
          
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold text-foam tracking-tight leading-[1.05] mb-8">
            Meet the<br />instruments<br />
            <span className="text-foam/40 font-normal">beneath the data.</span>
          </h2>
          
          <p className="font-ui text-lg text-foam-dim max-w-sm leading-relaxed mb-16">
            Every observation has a physical story. Explore the platforms that measure the global ocean.
          </p>
          
          {/* Horizontal Track Indicators */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-[1px] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] origin-left ${progress < 0.5 ? 'bg-biolume scale-x-100' : 'bg-white/20 scale-x-50'}`} />
              <span className={`font-mono text-[10px] uppercase tracking-[0.15em] transition-colors duration-700 ${progress < 0.5 ? 'text-biolume font-bold' : 'text-foam-dim'}`}>
                01 — Argo Float
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-[1px] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] origin-left ${progress >= 0.5 ? 'bg-instrument-amber scale-x-100' : 'bg-white/20 scale-x-50'}`} />
              <span className={`font-mono text-[10px] uppercase tracking-[0.15em] transition-colors duration-700 ${progress >= 0.5 ? 'text-instrument-amber font-bold' : 'text-foam-dim'}`}>
                02 — Auto Glider
              </span>
            </div>
          </div>
        </div>

        {/* CTA Button-in-Button Architecture */}
        <div ref={ctaRef} className="mt-20 pointer-events-auto w-max group">
          <Link
            href="/explore"
            className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full pl-6 pr-2 py-2 hover:bg-white/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] backdrop-blur-2xl"
          >
            <span className="font-ui text-[11px] font-bold tracking-[0.2em] uppercase text-white">
              Explore Instruments
            </span>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-biolume group-hover:text-abyss transition-all duration-500 group-hover:scale-105 group-hover:translate-x-1 group-hover:-translate-y-[1px]">
               <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      {/* ── Right Side: 3D Scene Track ── */}
      <div className="w-full md:w-[55%] h-full min-h-[50vh] relative border-t md:border-t-0 md:border-l border-white/5 bg-[#02070e]">
        {/* Cinematic gradient overlay to blend the edge */}
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#02050A] to-transparent z-10 pointer-events-none w-24 hidden md:block" />
        
        {/* Dynamic Background Glow based on progress */}
        <div className={`absolute inset-0 transition-opacity duration-1000 bg-[radial-gradient(ellipse_at_center,rgba(76,224,210,0.05)_0%,transparent_60%)] ${progress < 0.5 ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute inset-0 transition-opacity duration-1000 bg-[radial-gradient(ellipse_at_center,rgba(232,163,61,0.05)_0%,transparent_60%)] ${progress >= 0.5 ? 'opacity-100' : 'opacity-0'}`} />

        {/* 3D Scene Layer */}
        <InstrumentsScene progress={progress} />
      </div>
    </section>
  );
}
