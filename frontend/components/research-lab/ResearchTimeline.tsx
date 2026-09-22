'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function ResearchTimeline() {
  const phases = [
    { id: 1, title: 'Data Verification', desc: 'Phase 01' },
    { id: 2, title: 'Baseline Models', desc: 'Phase 02' },
    { id: 3, title: 'Surface Variable Exps', desc: 'Phase 03' },
    { id: 4, title: 'Spatial Representation', desc: 'Phase 04' },
    { id: 5, title: 'Ocean Embedding', desc: 'Phase 05' },
    { id: 6, title: 'Temporal Context', desc: 'Phase 06' },
    { id: 7, title: 'Physical Constraints', desc: 'Phase 07' },
    { id: 8, title: 'Independent Validation', desc: 'Phase 08' },
  ];

  return (
    <div className="w-full relative py-12 overflow-x-auto hide-scrollbar mask-edges-horizontal">
      {/* Connecting Line (Subtle) */}
      <div className="absolute top-[48%] left-0 w-[1400px] md:w-full h-px bg-white/5 -translate-y-1/2 z-0" />
      
      <div className="relative z-10 flex items-start justify-between min-w-[1200px] px-8 gap-8">
        {phases.map((phase, i) => (
          <motion.div 
            key={phase.id} 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.32, 0.72, 0, 1] }}
            className="flex flex-col items-center group cursor-pointer flex-1"
          >
            <span className="font-mono text-[10px] text-foam-dim/50 uppercase tracking-[0.2em] mb-4 group-hover:text-biolume transition-colors duration-500">
              {phase.desc}
            </span>
            
            {/* The Node */}
            <div className="relative w-4 h-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-white/5 ring-1 ring-white/10 group-hover:ring-biolume/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-150" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-biolume transition-colors duration-500" />
            </div>
            
            <span className="font-display text-[15px] font-medium text-white/50 text-center tracking-wide mt-6 max-w-[140px] group-hover:text-white transition-colors duration-500">
              {phase.title}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
