'use client';

import { useRef } from 'react';
import { Layers, Activity, Navigation, Database } from 'lucide-react';
import { gsap, useGSAP } from '@/lib/gsap';

export function ProblemSection() {
  const containerRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Only animate above mobile to avoid complex touch issues, or animate safely
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=150%',
          scrub: 1,
          pin: true,
        }
      });

      // Cards start fragmented
      gsap.set('.frag-card-1', { x: -50, y: -80, rotation: -8, opacity: 1 });
      gsap.set('.frag-card-2', { x: 70, y: 40, rotation: 6, opacity: 1 });
      gsap.set('.frag-card-3', { x: -20, y: 140, rotation: -3, opacity: 1 });
      gsap.set('.unified-frame', { opacity: 0, scale: 0.95 });

      tl.to(['.frag-card-1', '.frag-card-2', '.frag-card-3'], {
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 0,
        stagger: 0.05,
        duration: 1,
        ease: 'power3.inOut'
      }, 0)
      .to('.unified-frame', {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out'
      }, 0.5)
      .fromTo('.unified-glow', 
         { backgroundPosition: '200% center' },
         { backgroundPosition: '-200% center', duration: 1.5, ease: 'none' }, 0.5);
         
      // fade out text slightly when scrolling deep
      tl.to(leftRef.current, { opacity: 0.4, duration: 1 }, 0);
    });

    mm.add("(max-width: 767px)", () => {
      // simpler non-pinned scroll animation for mobile
      gsap.fromTo(['.frag-card-1', '.frag-card-2', '.frag-card-3'], 
        { opacity: 0, y: 30 },
        { 
          opacity: 1, y: 0, stagger: 0.1, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: containerRef.current, start: 'top 80%' }
        }
      );
      gsap.fromTo('.unified-frame', 
        { opacity: 0, scale: 0.95 },
        { 
          opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out', delay: 0.5,
          scrollTrigger: { trigger: containerRef.current, start: 'top 60%' }
        }
      );
    });

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative min-h-[100dvh] bg-abyss flex items-center justify-center overflow-hidden py-24 px-4 md:py-32 md:px-6 border-t border-thermocline/10">
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center gap-16 lg:gap-24">
        
        {/* Left Side: Typography */}
        <div ref={leftRef} className="w-full md:w-1/2 flex flex-col gap-6 md:pr-8 z-10">
          <div className="inline-flex items-center gap-2 font-mono text-xs font-bold tracking-[0.3em] text-instrument-amber uppercase mb-2 px-4 py-1.5 rounded-full border border-instrument-amber/40 bg-instrument-amber/10 backdrop-blur-md shadow-[0_0_20px_rgba(232,163,61,0.15)] w-max">
            Physical Limitation
          </div>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tighter leading-[1.05]">
            The surface tells only<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-biolume to-thermocline">part of the story.</span>
          </h2>
          <p className="text-foam-dim text-base md:text-lg max-w-lg leading-relaxed mt-2">
            Earth observation satellites scan thousands of kilometers daily, but electromagnetic radiation cannot penetrate more than a few millimeters into seawater. 
            Direct subsurface measurements rely on autonomous Argo floats separated by hundreds of kilometers—leaving over <span className="text-white font-semibold">95% of the ocean interior unobserved</span>.
          </p>
          <div className="flex items-center gap-6 pt-2 font-mono text-xs text-foam/60">
            <div>
              <span className="block text-2xl font-bold text-white">0.01 mm</span>
              <span>Satellite Penetration</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <span className="block text-2xl font-bold text-instrument-amber">~300 km</span>
              <span>Average Float Spacing</span>
            </div>
          </div>
        </div>

        {/* Right Side: Stage */}
        <div className="w-full md:w-1/2 h-[400px] md:h-[500px] relative flex items-center justify-center perspective-[1000px] mt-12 md:mt-0">
          
          {/* Fragmented Card 1: Satellite Surface Barrier */}
          <div className="frag-card-1 absolute z-30 w-[290px] rounded-[1.75rem] p-1.5 ring-1 ring-white/10 bg-black/40 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
            <div className="w-full h-full rounded-[calc(1.75rem-0.375rem)] bg-gradient-to-b from-[#0B1D2E] to-[#050B14] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center gap-5 border border-white/5">
              <div className="w-12 h-12 rounded-full bg-surfaceSignal/10 flex items-center justify-center border border-surfaceSignal/30 shadow-[inset_0_1px_10px_rgba(56,189,248,0.15)]">
                <Database size={22} className="text-surfaceSignal stroke-[1.5]" />
              </div>
              <div>
                <p className="font-mono text-[10px] text-surfaceSignal tracking-[0.2em] uppercase font-bold mb-0.5">Surface Swath</p>
                <p className="text-sm text-white font-semibold font-ui tracking-wide">Continuous Satellites</p>
                <p className="text-[11px] text-foam-dim">Skin Layer Only (Z = 0)</p>
              </div>
            </div>
          </div>

          {/* Fragmented Card 2: Sparse Argo In-situ */}
          <div className="frag-card-2 absolute z-20 w-[290px] rounded-[1.75rem] p-1.5 ring-1 ring-white/10 bg-black/40 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] md:translate-x-0 translate-y-24">
             <div className="w-full h-full rounded-[calc(1.75rem-0.375rem)] bg-gradient-to-b from-[#0B1D2E] to-[#050B14] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center gap-5 border border-instrument-amber/10">
              <div className="w-12 h-12 rounded-full bg-instrument-amber/5 flex items-center justify-center border border-instrument-amber/20 shadow-[inset_0_1px_10px_rgba(232,163,61,0.15)]">
                <Activity size={22} className="text-instrument-amber stroke-[1.5]" />
              </div>
              <div>
                <p className="font-mono text-[10px] text-instrument-amber tracking-[0.2em] uppercase font-bold mb-0.5">In-Situ Profilers</p>
                <p className="text-sm text-white font-semibold font-ui tracking-wide">Sparse Argo Network</p>
                <p className="text-[11px] text-foam-dim">Point Samples (10-Day Cycle)</p>
              </div>
            </div>
          </div>

          {/* Fragmented Card 3: Unobserved Water Column */}
          <div className="frag-card-3 absolute z-10 w-[290px] rounded-[1.75rem] p-1.5 ring-1 ring-white/10 bg-black/40 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] md:translate-x-0 translate-y-48">
             <div className="w-full h-full rounded-[calc(1.75rem-0.375rem)] bg-gradient-to-b from-[#0B1D2E] to-[#050B14] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center gap-5 border border-thermocline/20">
              <div className="w-12 h-12 rounded-full bg-thermocline/10 flex items-center justify-center border border-thermocline/30 shadow-[inset_0_1px_10px_rgba(28,92,107,0.2)]">
                <Navigation size={22} className="text-thermocline stroke-[1.5]" />
              </div>
              <div>
                <p className="font-mono text-[10px] text-thermocline tracking-[0.2em] uppercase font-bold mb-0.5">Subsurface State</p>
                <p className="text-sm text-white font-semibold font-ui tracking-wide">The Blind Zone</p>
                <p className="text-[11px] text-foam-dim">0 to 1000m Unmeasured</p>
              </div>
            </div>
          </div>

          {/* Unified Frame (Revealed on scroll) */}
          <div className="unified-frame absolute inset-0 m-auto w-full max-w-[340px] h-[380px] rounded-[2rem] p-[1.5px] z-40"
            style={{ background: 'linear-gradient(135deg, rgba(76,224,210,0.35) 0%, rgba(76,224,210,0.05) 50%, rgba(28,92,107,0.3) 100%)', boxShadow: '0 0 60px rgba(76,224,210,0.25), 0 0 120px rgba(76,224,210,0.1), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <div className="relative w-full h-full rounded-[calc(2rem-1.5px)] bg-[#040c14] flex flex-col items-center justify-center overflow-hidden">
               
               {/* Deep background grid */}
               <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(76,224,210,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(76,224,210,0.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
               
               {/* Core radial glow */}
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_30%,rgba(76,224,210,0.18)_0%,transparent_100%)] pointer-events-none" />

               {/* Sweep shimmer */}
               <div className="unified-glow absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,rgba(76,224,210,0.08)_50%,transparent_70%)] bg-[length:250%_100%] pointer-events-none" />

               {/* Top status bar */}
               <div className="absolute top-4 left-5 right-5 flex items-center justify-between">
                 <div className="flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-biolume shadow-[0_0_6px_rgba(76,224,210,0.9)]" style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
                   <span className="font-mono text-[9px] tracking-[0.2em] text-biolume/80 uppercase">OceanEmbed</span>
                 </div>
                 <span className="font-mono text-[9px] tracking-[0.15em] text-white/40 uppercase">Reconstruction Engine</span>
               </div>

               {/* Icon with orbital rings */}
               <div className="relative flex items-center justify-center mb-6">
                 {/* Outer orbit */}
                 <div className="absolute w-28 h-28 rounded-full border border-biolume/10" style={{ animation: 'spin 12s linear infinite' }}>
                   <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-biolume/60 shadow-[0_0_6px_rgba(76,224,210,0.8)]" />
                 </div>
                 {/* Mid orbit */}
                 <div className="absolute w-20 h-20 rounded-full border border-biolume/20" style={{ animation: 'spin 7s linear infinite reverse' }}>
                   <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-instrument-amber/70 shadow-[0_0_4px_rgba(232,163,61,0.8)]" />
                 </div>
                 {/* Core icon circle */}
                 <div className="relative w-14 h-14 rounded-full flex items-center justify-center border border-biolume/40"
                   style={{ background: 'radial-gradient(circle, rgba(76,224,210,0.15) 0%, rgba(4,12,20,0.8) 70%)', boxShadow: '0 0 30px rgba(76,224,210,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
                   <Layers size={26} className="text-biolume stroke-[1.5] drop-shadow-[0_0_8px_rgba(76,224,210,1)]" />
                 </div>
               </div>
               
               {/* Title */}
               <h3 className="font-mono text-[13px] tracking-[0.3em] text-white uppercase relative z-10 text-center px-6 font-bold" style={{ textShadow: '0 0 20px rgba(76,224,210,0.5)' }}>
                 Latent Space Fusion
               </h3>
               
               {/* Divider */}
               <div className="w-24 h-px mt-4 mb-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(76,224,210,0.4), transparent)' }} />

               {/* Descriptor */}
               <p className="font-ui text-[12px] text-foam-dim text-center max-w-[210px] relative z-10 leading-relaxed">
                 Surface signals projected across 15 depths down to 1000m with deep learning.
               </p>

               {/* Floating metric chips */}
               <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2 px-5">
                 {[
                   { label: '5 Variables', color: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)', text: 'rgba(56,189,248,1)' },
                   { label: '15 Depths', color: 'rgba(232,163,61,0.15)', border: 'rgba(232,163,61,0.3)', text: 'rgba(232,163,61,1)' },
                   { label: '0.25° Daily', color: 'rgba(76,224,210,0.1)', border: 'rgba(76,224,210,0.3)', text: 'rgba(76,224,210,1)' },
                 ].map(chip => (
                   <div key={chip.label} className="px-2.5 py-1 rounded-full font-mono text-[9px] tracking-[0.15em] uppercase font-bold backdrop-blur-sm"
                     style={{ background: chip.color, border: `1px solid ${chip.border}`, color: chip.text }}>
                     {chip.label}
                   </div>
                 ))}
               </div>

               {/* Corner accent dots */}
               <div className="absolute top-3 right-3 w-1 h-1 rounded-full bg-biolume/40" />
               <div className="absolute bottom-3 left-3 w-1 h-1 rounded-full bg-instrument-amber/30" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
