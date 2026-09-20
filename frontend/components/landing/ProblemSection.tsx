'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { Satellite, BrainCircuit } from 'lucide-react';

export function ProblemSection() {
  const containerRef = useRef<HTMLElement>(null);
  
  useGSAP(() => {
    // We use GSAP ScrollTrigger to animate opacities, 
    // but rely on CSS native "sticky" for pinning to prevent layout bugs.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
      }
    });

    // Animate transition (Fade out problem, fade in solution)
    tl.to('.problem-element', { opacity: 0, y: -20, duration: 1 })
      .to('.unknown-element', { opacity: 0, duration: 1 }, '<')
      
      // Add a small pause between the fade out and fade in
      .to({}, { duration: 0.5 })
      
      // Fade in the solution
      .to('.solution-element', { opacity: 1, y: 0, duration: 1 })
      .to('.ai-glow', { opacity: 1, duration: 1 }, '<')
      .to('.ai-layers', { opacity: 1, duration: 1 }, '<');
      
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative h-[200vh] bg-abyss border-t border-thermocline/10">
      
      {/* Native Sticky Container - Flawless Scrolling without GSAP Pin bugs */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden px-6 md:px-12">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* Left Side: Plain-English Text */}
          <div className="relative h-[250px] md:h-[300px] flex flex-col justify-center z-20">
             
             {/* Text: The Problem */}
             <div className="problem-element absolute inset-0 flex flex-col justify-center opacity-100">
                <div className="flex items-center gap-3 text-cyan-400 mb-6">
                  <div className="p-2 rounded-full bg-cyan-400/10 border border-cyan-400/30">
                    <Satellite size={20} />
                  </div>
                  <span className="font-mono text-sm tracking-widest uppercase font-bold">The Problem</span>
                </div>
                <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1]">
                  Satellites only see the <span className="text-cyan-400">top 1 millimeter</span>.
                </h2>
                <p className="text-foam-dim text-lg md:text-xl leading-relaxed max-w-md">
                  The remaining <span className="text-white font-semibold">99% of the ocean</span> is a massive blind spot. We simply do not have enough physical sensors to measure it all.
                </p>
             </div>

             {/* Text: The Solution */}
             <div className="solution-element absolute inset-0 flex flex-col justify-center pointer-events-none opacity-0 translate-y-5">
                <div className="flex items-center gap-3 text-biolume mb-6">
                  <div className="p-2 rounded-full bg-biolume/10 border border-biolume/30">
                    <BrainCircuit size={20} />
                  </div>
                  <span className="font-mono text-sm tracking-widest uppercase font-bold">The Solution</span>
                </div>
                <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1]">
                  Our AI acts as an <span className="text-transparent bg-clip-text bg-gradient-to-r from-biolume to-cyan-300">X-Ray for the ocean</span>.
                </h2>
                <p className="text-foam-dim text-lg md:text-xl leading-relaxed max-w-md">
                  OceanEmbed uses Deep Learning to predict temperature at every depth level, instantly filling in the missing 99% with high accuracy.
                </p>
             </div>

          </div>

          {/* Right Side: The Simple Visual Metaphor */}
          <div className="w-full h-[400px] md:h-[500px] flex items-center justify-center" style={{ perspective: '1200px' }}>
             
             {/* The 3D Ocean Block */}
             <div 
               className="relative w-full max-w-[380px] h-[350px] md:h-[450px] rounded-2xl group shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
               style={{ transformStyle: 'preserve-3d', transform: 'rotateX(15deg) rotateY(-10deg)' }}
             >
                
                {/* 1. Surface Plane (Glowing Cyan) */}
                <div 
                  className="absolute top-0 left-0 right-0 h-20 bg-cyan-950/80 border-t-2 border-x-2 border-cyan-400 backdrop-blur-md rounded-t-2xl flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.2)_inset]"
                  style={{ transform: 'translateZ(1px)', zIndex: 20 }}
                >
                   <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(34,211,238,0.2)_1px,transparent_1px),linear-gradient(0deg,rgba(34,211,238,0.2)_1px,transparent_1px)] bg-[size:24px_24px] animate-[pulse_4s_ease-in-out_infinite]" />
                   <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/20 to-transparent" />
                   <span className="font-mono text-cyan-100 text-xs font-bold tracking-[0.2em] uppercase bg-cyan-950/90 px-4 py-2 rounded-full border border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.5)] relative z-10">
                     Satellite View
                   </span>
                </div>

                {/* 2. The Deep Ocean Body */}
                <div 
                  className="absolute top-20 left-0 right-0 bottom-0 bg-[#020810] border-x-2 border-b-2 border-white/10 rounded-b-2xl overflow-hidden flex flex-col"
                  style={{ transform: 'translateZ(0px)', zIndex: 10 }}
                >
                   {/* Background Gradient */}
                   <div className="absolute inset-0 bg-gradient-to-b from-[#051320] to-black" />

                   {/* PROBLEM STATE: The "Unknown" Void */}
                   <div className="unknown-element absolute inset-0 flex items-center justify-center z-20 opacity-100">
                      <div className="flex flex-col items-center opacity-40">
                        <span className="font-display text-3xl font-bold text-white tracking-widest uppercase mb-2">99%</span>
                        <span className="font-mono text-sm tracking-[0.3em] text-white/70 uppercase">Unknown</span>
                      </div>
                   </div>

                   {/* SOLUTION STATE: The AI Glow and Layers */}
                   <div className="ai-glow absolute inset-0 bg-gradient-to-b from-orange-500/10 via-biolume/20 to-blue-900/40 z-10 opacity-0 mix-blend-screen" />
                   
                   <div className="ai-layers absolute inset-0 z-30 opacity-0 overflow-hidden">
                      
                      {/* 1. Volumetric Thermal Heatmap */}
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.15),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(34,211,238,0.15),transparent_50%)] mix-blend-screen" />
                      
                      {/* 2. 3D Depth Grid Lines */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100%_40px]" />
                      
                      {/* 3. Sweeping Vertical Scanner Beam */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b from-transparent via-biolume/10 to-biolume/40 border-b-2 border-biolume shadow-[0_10px_40px_rgba(76,224,210,0.4)] pointer-events-none" 
                        style={{ animation: 'scanDown 4s ease-in-out infinite alternate' }} 
                      />

                      {/* 4. Refined Premium Dashboard Widget */}
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="bg-[#020b14]/70 backdrop-blur-2xl p-4 rounded-xl border border-biolume/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center justify-between group">
                          
                          <div className="flex items-center gap-3">
                            {/* Animated Tech Icon */}
                            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-biolume/10 border border-biolume/30 overflow-hidden">
                              <div className="absolute inset-0 bg-biolume/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                              <BrainCircuit size={18} className="text-biolume animate-pulse relative z-10" />
                            </div>
                            
                            <div className="flex flex-col">
                              <span className="font-mono text-[9px] text-biolume/70 tracking-[0.2em] uppercase mb-0.5">Deep Learning Model</span>
                              <span className="font-display text-white text-xs font-bold tracking-widest uppercase">Volumetric X-Ray</span>
                            </div>
                          </div>
                          
                          {/* Metrics */}
                          <div className="text-right flex flex-col justify-center border-l border-white/10 pl-4">
                             <span className="font-mono text-biolume text-sm font-bold leading-none mb-1">100%</span>
                             <span className="font-mono text-[8px] text-foam/50 tracking-widest uppercase leading-none">Visibility</span>
                          </div>
                          
                        </div>
                      </div>
                   </div>

                </div>
             </div>

          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes scanDown {
          0% { transform: translateY(-120px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(450px); opacity: 0; }
        }
      `}} />
    </section>
  );
}
