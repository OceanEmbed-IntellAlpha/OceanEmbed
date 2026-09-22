'use client';

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { motion, useScroll, useTransform, Variants } from 'framer-motion';
import { GlobalNav } from '@/components/shared/GlobalNav';
import { DecisionBadge } from '@/components/research-lab/DecisionBadge';
import { DepthWiseChart } from '@/components/research-lab/charts/DepthWiseChart';
import experimentsData from '@/lib/fixtures/experiments.json';
import { Experiment } from '@/lib/api/research-types';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const ALL_EXPERIMENTS = experimentsData as Experiment[];

const generateDummyData = () => {
  const depths = [0, 10, 20, 50, 100, 200, 500, 1000];
  return depths.map(depth => ({
    depth,
    baseline: (Math.random() * 0.5 + 1.2) - (depth / 1000) * 0.8,
    variant: (Math.random() * 0.4 + 1.0) - (depth / 1000) * 0.9,
  }));
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 80, filter: 'blur(12px)' },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: { duration: 1.2, ease: [0.32, 0.72, 0, 1] } 
  }
};

export default function ExperimentDetailPage({ params }: { params: { id: string } }) {
  const experimentId = params.id.toUpperCase();
  const exp = ALL_EXPERIMENTS.find(e => e.id === experimentId);

  if (!exp) notFound();

  const nextExp = exp.nextExperiment ? ALL_EXPERIMENTS.find(e => e.id === exp.nextExperiment) : null;
  const dummyData = generateDummyData();

  return (
    <main className="min-h-[100dvh] bg-[#030303] flex flex-col relative overflow-x-hidden text-foam">
      <GlobalNav />
      
      {/* High-End Cinematic Background (Ethereal Glass) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] bg-biolume/5 rounded-full blur-[180px]" />
        <div className="absolute bottom-[20%] left-[-10%] w-[40vw] h-[40vw] bg-white/[0.02] rounded-full blur-[150px]" />
        
        {/* Massive Watermark Typography */}
        <div className="absolute top-[20%] left-[-5%] text-[30vw] font-display font-black text-white/[0.015] tracking-tighter select-none rotate-[-4deg] whitespace-nowrap">
          {exp.id}
        </div>
      </div>
      
      <div className="relative pt-32 px-6 md:px-12 max-w-[1600px] mx-auto w-full flex-1 z-10 pb-40">
        
        {/* Editorial Split Layout */}
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-32 min-h-screen">
          
          {/* Left Column (Sticky Desktop) - Thesis & Brand */}
          <div className="lg:w-5/12 shrink-0">
            <div className="lg:sticky lg:top-40 flex flex-col gap-12 lg:h-[calc(100vh-10rem)] lg:pb-16 lg:justify-between">
              
              <div className="flex flex-col gap-12">
                <motion.div initial="hidden" animate="visible" variants={fadeUp}>
                  <Link href="/research-lab" className="inline-flex items-center gap-4 text-[11px] text-foam-dim hover:text-white transition-colors duration-500 font-mono tracking-[0.2em] uppercase group">
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 group-hover:-translate-x-2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
                      <ArrowLeft size={16} strokeWidth={1.5} />
                    </div>
                    Back to Lab
                  </Link>
                </motion.div>

                <div className="flex flex-col gap-6">
                  <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-wrap items-center gap-4">
                    <span className="font-mono text-[10px] bg-white/5 border border-white/10 px-4 py-2 rounded-full tracking-[0.2em] uppercase text-white/80">
                      {exp.id}
                    </span>
                    <span className="font-mono text-[10px] text-biolume uppercase tracking-[0.2em]">
                      {exp.category}
                    </span>
                  </motion.div>
                  
                  <motion.h1 
                    initial={{ opacity: 0, y: 60, filter: 'blur(16px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 1.4, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
                    className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-medium text-white tracking-tighter leading-[1.05]"
                  >
                    {exp.title}
                  </motion.h1>
                </div>

                <motion.div 
                  initial="hidden" animate="visible" variants={fadeUp}
                  className="pl-8 border-l border-biolume/30 py-2 mt-4"
                >
                  <p className="text-[clamp(1.125rem,1.5vw,1.5rem)] text-foam/80 font-serif italic leading-relaxed">
                    &quot;{exp.question}&quot;
                  </p>
                </motion.div>
              </div>

              {/* Status locked to bottom of sticky pane on large screens */}
              <motion.div initial="hidden" animate="visible" variants={fadeUp} className="hidden lg:block">
                 <DecisionBadge status={exp.decision} />
              </motion.div>
            </div>
          </div>

          {/* Right Column (Scrolling Narrative) */}
          <div className="lg:w-7/12 flex flex-col gap-40 lg:pt-40">
            
            {/* Mobile Decision Badge */}
            <div className="lg:hidden">
              <DecisionBadge status={exp.decision} />
            </div>

            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
              <h2 className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em] mb-8">Motivation</h2>
              <p className="text-xl md:text-2xl text-foam/90 leading-relaxed font-light">
                {exp.purpose || "The purpose of this experiment is to evaluate the impact of this configuration on the overall model performance and its ability to accurately reconstruct subsurface thermal dynamics."}
              </p>
            </motion.section>

            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
              <h2 className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em] mb-8">Experiment Design</h2>
              
              <div className="flex flex-col gap-6">
                
                {/* Experiment Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="flex flex-col gap-2 p-4 bg-white/[0.02] rounded-2xl ring-1 ring-white/5">
                    <span className="font-mono text-[9px] text-foam-dim/50 uppercase tracking-[0.2em]">Dataset</span>
                    <span className="text-sm text-white/80">North Indian Ocean</span>
                  </div>
                  <div className="flex flex-col gap-2 p-4 bg-white/[0.02] rounded-2xl ring-1 ring-white/5">
                    <span className="font-mono text-[9px] text-foam-dim/50 uppercase tracking-[0.2em]">Resolution</span>
                    <span className="text-sm text-white/80">0.25° daily</span>
                  </div>
                  <div className="flex flex-col gap-2 p-4 bg-white/[0.02] rounded-2xl ring-1 ring-white/5">
                    <span className="font-mono text-[9px] text-foam-dim/50 uppercase tracking-[0.2em]">Target</span>
                    <span className="text-sm text-white/80">15 depth levels</span>
                  </div>
                  <div className="flex flex-col gap-2 p-4 bg-white/[0.02] rounded-2xl ring-1 ring-white/5">
                    <span className="font-mono text-[9px] text-foam-dim/50 uppercase tracking-[0.2em]">Evaluation</span>
                    <span className="text-sm text-white/80">RMSE, Correlation</span>
                  </div>
                </div>

                {/* Double-Bezel Architecture */}
                <div className="p-2 rounded-[2rem] bg-white/[0.02] ring-1 ring-white/10">
                  <div className="bg-[#0A0A0A] rounded-[calc(2rem-0.5rem)] p-8 md:p-12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                    <span className="block font-mono text-[10px] text-foam-dim/60 uppercase tracking-[0.2em] mb-4">Baseline</span>
                    <span className="font-display text-3xl md:text-4xl text-white font-medium tracking-tight">{exp.baseline}</span>
                  </div>
                </div>

                <div className="flex justify-center my-2">
                  <div className="w-px h-12 bg-gradient-to-b from-white/20 to-biolume/50" />
                </div>

                <div className="p-2 rounded-[2rem] bg-biolume/[0.02] ring-1 ring-biolume/20">
                  <div className="bg-[#0A0A0A] rounded-[calc(2rem-0.5rem)] p-8 md:p-12 shadow-[inset_0_1px_1px_rgba(76,224,210,0.15)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-biolume/10 rounded-full blur-[60px] pointer-events-none" />
                    <span className="block font-mono text-[10px] text-biolume/60 uppercase tracking-[0.2em] mb-4 relative z-10">Variant</span>
                    <span className="font-display text-3xl md:text-4xl text-biolume font-medium tracking-tight relative z-10">{exp.variant}</span>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
              <h2 className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em] mb-8">Quantitative Results</h2>
              
              <div className="p-2 rounded-[2rem] bg-white/[0.02] ring-1 ring-white/10">
                <div className="bg-[#0A0A0A] rounded-[calc(2rem-0.5rem)] p-8 md:p-12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                  <h3 className="font-display text-2xl text-white/90 mb-12 font-medium tracking-tight">Depth-wise RMSE Comparison</h3>
                  <div className="h-[400px]">
                    <DepthWiseChart 
                      data={dummyData} 
                      metric="rmse" 
                      baselineName={exp.baseline} 
                      variantName={exp.variant} 
                    />
                  </div>
                  <div className="mt-12 flex justify-between items-center border-t border-white/5 pt-8">
                    <p className="font-mono text-[10px] text-foam-dim/50 uppercase tracking-[0.2em]">
                      * Synthesized placeholders
                    </p>
                    <span className="font-mono text-[10px] text-white/30 uppercase tracking-[0.2em]">Fig 1.0</span>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
              <h2 className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em] mb-8">Learnings</h2>
              
              <div className="border-l border-white/10 pl-8 md:pl-12">
                <p className="text-[clamp(1.25rem,1.5vw,1.5rem)] text-foam/90 leading-relaxed font-light">
                  {exp.finding || "This configuration yielded measurable shifts in subsurface prediction accuracy. The findings strongly influenced the direction of subsequent model iterations."}
                </p>
              </div>
            </motion.section>

            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
              <h2 className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em] mb-8">Decision</h2>
              <div className="flex flex-col gap-6">
                <div className="w-fit">
                  <DecisionBadge status={exp.decision} />
                </div>
                {exp.decisionReason && (
                  <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                    <span className="block font-mono text-[10px] text-white/40 uppercase tracking-[0.2em] mb-3">Reason</span>
                    <p className="text-lg text-foam/80 leading-relaxed font-light">
                      {exp.decisionReason}
                    </p>
                  </div>
                )}
              </div>
            </motion.section>

            {/* What Came Next (Massive Immersive Block) */}
            {nextExp && (
              <motion.section 
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
                className="mt-20 pt-20 border-t border-white/5"
              >
                <h2 className="font-mono text-[10px] text-biolume uppercase tracking-[0.2em] mb-12 flex items-center gap-4">
                  <span className="w-12 h-px bg-biolume/30" />
                  What came next
                </h2>
                
                <Link 
                  href={`/research-lab/${nextExp.id.toLowerCase()}`}
                  className="block group"
                >
                  <div className="p-2 rounded-[3rem] bg-white/[0.02] ring-1 ring-white/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-active:scale-[0.98]">
                    <div className="bg-[#0A0A0A] rounded-[calc(3rem-0.5rem)] p-12 md:p-20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-12">
                      
                      {/* Ethereal Glow */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-biolume/5 rounded-full blur-[120px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

                      <div className="relative z-10 max-w-xl">
                        <span className="font-mono text-[11px] text-biolume/70 uppercase tracking-[0.2em] mb-6 block">
                          {nextExp.id} — {nextExp.category}
                        </span>
                        <h3 className="font-display text-4xl md:text-5xl font-medium text-white group-hover:text-biolume transition-colors duration-700 leading-[1.1] tracking-tight">
                          {nextExp.title}
                        </h3>
                      </div>

                      {/* Nested Island CTA */}
                      <div className="relative z-10 shrink-0 flex items-center gap-5 bg-white/5 rounded-full pl-8 pr-2 py-2 ring-1 ring-white/10 group-hover:bg-white/10 group-hover:ring-white/20 transition-all duration-700">
                        <span className="font-mono text-[11px] text-white uppercase tracking-[0.2em]">
                          Continue
                        </span>
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-2 group-hover:bg-biolume group-hover:text-black">
                          <ArrowRight size={20} strokeWidth={1.5} />
                        </div>
                      </div>

                    </div>
                  </div>
                </Link>
              </motion.section>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
