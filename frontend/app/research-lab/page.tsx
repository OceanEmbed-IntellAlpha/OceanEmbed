'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { GlobalNav } from '@/components/shared/GlobalNav';
import { ResearchTimeline } from '@/components/research-lab/ResearchTimeline';
import { ExperimentCard } from '@/components/research-lab/ExperimentCard';
import { Experiment, ExperimentCategory } from '@/lib/api/research-types';
import experimentsData from '@/lib/fixtures/experiments.json';

const ALL_EXPERIMENTS = experimentsData as Experiment[];

const CATEGORIES: ('All' | ExperimentCategory)[] = [
  'All',
  'Data & Inputs',
  'Spatial Representation',
  'Ocean Embedding',
  'Depth Reconstruction',
  'Temporal Dynamics',
  'Physical Constraints',
  'Robustness & Uncertainty',
  'Ocean Regimes',
  'Validation',
];

export default function ResearchLabLandingPage() {
  const [activeCategory, setActiveCategory] = useState<'All' | ExperimentCategory>('All');
  
  const filteredExperiments = ALL_EXPERIMENTS.filter(exp => 
    activeCategory === 'All' ? true : exp.category === activeCategory
  );

  // --- Hero Scroll Physics ---
  const { scrollYProgress: heroProgress } = useScroll();
  const heroY = useTransform(heroProgress, [0, 0.2], [0, 100]);
  const heroOpacity = useTransform(heroProgress, [0, 0.2], [1, 0]);

  // --- Horizontal Canvas Physics ---
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: horizontalProgress } = useScroll({
    target: targetRef,
  });
  
  // Smooth out the scroll so it feels weighty like an Apple page
  const smoothProgress = useSpring(horizontalProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Map vertical scroll progress to horizontal translation
  // To ensure the last card stops near the right edge, we translate by -100% of the track width PLUS the viewport width.
  // Using a simpler approach: Translate to `-(totalWidth - viewportWidth)`
  const x = useTransform(smoothProgress, [0, 1], ["0%", "-85%"]);

  return (
    <main className="min-h-[100dvh] bg-[#000000] flex flex-col relative text-foam">
      <GlobalNav />
      
      {/* Minimal Ambient Light */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-white/[0.02] rounded-[100%] blur-[120px]" />
      </div>
      
      <div className="relative pt-40 z-10">


        {/* The Journey Overview */}
        <section className="flex flex-col gap-12 max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col items-center gap-4">
            <h2 className="font-display text-2xl md:text-3xl text-white font-medium tracking-tight text-center">
              The Research Journey
            </h2>
          </div>
          <ResearchTimeline />
        </section>
        
        {/* Seamless Filter Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 sticky top-20 z-50 bg-[#000000]/80 backdrop-blur-2xl py-4 mt-24 border-b border-t border-white/[0.05] px-4 shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2.5 rounded-full font-mono text-[9px] uppercase tracking-[0.2em] transition-colors duration-300 ${
                activeCategory === category
                  ? 'bg-white text-black font-medium'
                  : 'bg-transparent border border-white/10 text-foam-dim hover:text-white hover:bg-white/5'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* --- HORIZONTAL CANVAS SIDE-SCROLLER --- */}
        <section ref={targetRef} className="relative h-[400vh] w-full mt-[-1px]">
          {/* Sticky Container holds the horizontal track */}
          <div className="sticky top-[160px] h-[calc(100vh-160px)] w-full flex items-center overflow-hidden border-b border-white/[0.05] bg-[#000000]">
            
            {filteredExperiments.length > 0 ? (
              <motion.div style={{ x }} className="flex gap-16 px-[10vw] items-center w-max">
                {/* Visual Connection Line running through the center of all cards */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.05] -translate-y-1/2 -z-10" />

                {filteredExperiments.map((exp, index) => (
                  <div key={exp.id} className="relative w-[85vw] md:w-[600px] shrink-0 group">
                    {/* The Node on the horizontal timeline */}
                    <div className="absolute top-1/2 -left-8 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center w-3 h-3 rounded-full bg-black border border-white/20 z-10 transition-colors duration-500 group-hover:border-white">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-white transition-colors duration-500" />
                    </div>
                    
                    {/* The Experiment Card */}
                    <div className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-4">
                      <ExperimentCard experiment={exp} index={index} />
                    </div>
                  </div>
                ))}

                {/* Final End Node */}
                <div className="relative shrink-0 flex flex-col items-center justify-center px-24">
                  <div className="w-3 h-3 rounded-full bg-white mb-8" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">End of Record</span>
                </div>

              </motion.div>
            ) : (
              <div className="w-full flex justify-center">
                <p className="text-foam-dim font-mono text-sm tracking-[0.2em] uppercase">No experiments found.</p>
              </div>
            )}
          </div>
        </section>

        {/* From Experiments to Model (Visual Summary) */}
        <section className="flex flex-col items-center gap-12 relative z-20 pt-32 pb-32 max-w-[1400px] mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <h2 className="font-display text-3xl md:text-4xl text-white font-medium tracking-tight">
              From Experiments to Model
            </h2>
            <p className="text-foam-dim font-light max-w-xl text-[clamp(0.875rem,1.2vw,1rem)]">
              The architecture was not predetermined. It was assembled step-by-step through empirical validation.
            </p>
          </motion.div>
          
          <div className="flex flex-col items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase text-foam-dim relative">
            {['Surface Variables', 'Spatial Context', 'Ocean Embedding', 'Depth Reconstruction', 'Temporal Context', 'Physical Constraints', 'Validation'].map((step, i) => (
              <React.Fragment key={step}>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="py-3 px-6 border border-white/5 rounded-full bg-white/[0.02]"
                >
                  {step}
                </motion.div>
                <div className="w-px h-8 bg-white/5" />
              </React.Fragment>
            ))}
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="py-6 px-12 mt-2 border border-white/20 rounded-full bg-white/5 text-white font-medium tracking-widest relative"
            >
              FINAL MODEL
            </motion.div>
          </div>
        </section>

        {/* Final Model */}
        <section className="flex flex-col items-center gap-6 relative z-20 pb-32 max-w-3xl mx-auto text-center px-6">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="font-display text-3xl text-white font-medium tracking-tight"
          >
            The OceanEmbed Architecture
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-foam-dim text-lg font-light leading-relaxed"
          >
            The final model architecture emerges directly from these completed experiments. As hypotheses are tested and decisions are made (KEEP / REJECT), the winning configurations are progressively integrated into the production model.
          </motion.p>
        </section>

      </div>
    </main>
  );
}
