'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Satellite, Cpu, Waves, ArrowRight } from 'lucide-react';

export function PipelineSection() {
  const inputs = [
    { name: 'Sea Surface Temperature', abbr: 'SST', color: 'from-orange-500/20' },
    { name: 'Sea Surface Salinity', abbr: 'SSS', color: 'from-teal-500/20' },
    { name: 'Sea Surface Height', abbr: 'SSH', color: 'from-blue-500/20' },
    { name: 'Surface Currents', abbr: 'UV', color: 'from-cyan-500/20' },
    { name: 'Wind Stress', abbr: 'WIND', color: 'from-purple-500/20' },
  ];

  const depths = [0, 10, 50, 100, 200, 500, 1000];

  return (
    <section id="pipeline" className="relative py-32 bg-[#000205] border-t border-white/[0.02] overflow-hidden">
      
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 mb-24 text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.3em] text-cyan-400/80 uppercase mb-6 bg-cyan-950/30 px-3 py-1.5 rounded-full border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Model Architecture
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-display text-4xl sm:text-5xl md:text-6xl font-medium text-white tracking-tight mb-6"
        >
          A Modular Deep Learning <br />
          <span className="text-white/30">Pipeline.</span>
        </motion.h2>
      </div>

      {/* ── BENTO GRID (MODULAR UI) ────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-6 relative">
        
        {/* Animated Connector Lines (Hidden on mobile) */}
        <div className="hidden lg:block absolute top-[250px] left-0 right-0 h-[2px] pointer-events-none z-0">
          <div className="absolute left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent">
             <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent w-[100px] animate-[scanRight_3s_linear_infinite]" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
          
          {/* ========================================== */}
          {/* MODULE 1: INPUTS (Col Span 1)              */}
          {/* ========================================== */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="col-span-1 group relative bg-[#030812]/50 backdrop-blur-xl border border-white/[0.05] rounded-[2rem] p-8 overflow-hidden hover:bg-[#050b18]/80 transition-colors duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-inner group-hover:bg-cyan-950/30 group-hover:border-cyan-400/30 transition-all duration-500">
                <Satellite size={20} className="text-white/40 group-hover:text-cyan-400 transition-colors duration-500" />
              </div>
              <div>
                <h3 className="font-mono text-[10px] text-white/80 uppercase tracking-widest font-bold">01 / Telemetry</h3>
                <p className="text-xs text-white/40 mt-1 font-ui">Surface Observations</p>
              </div>
            </div>

            {/* List of inputs */}
            <div className="flex flex-col gap-3 relative">
              {inputs.map((input, i) => (
                <div key={i} className="relative flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/[0.03] overflow-hidden group/item hover:border-white/[0.1] hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300 cursor-default">
                  {/* Subtle animated gradient background on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${input.color} to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500`} />
                  
                  <span className="font-ui text-sm text-white/70 relative z-10 group-hover/item:text-white transition-colors">{input.name}</span>
                  <span className="font-mono text-[10px] text-white/30 tracking-[0.2em] relative z-10 group-hover/item:text-white/80 transition-colors">{input.abbr}</span>
                </div>
              ))}
            </div>
          </motion.div>


          {/* ========================================== */}
          {/* MODULE 2: ENCODER (Col Span 2 - Wider)     */}
          {/* ========================================== */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="col-span-1 lg:col-span-2 group relative bg-[#030812]/50 backdrop-blur-xl border border-white/[0.05] rounded-[2rem] p-8 lg:p-12 overflow-hidden hover:bg-[#050b18]/80 transition-colors duration-500 min-h-[450px] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            {/* Fluid Gradient Background representing Latent Space */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[2rem] opacity-80 group-hover:opacity-100 transition-opacity duration-700 mix-blend-screen">
               <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/30 rounded-full blur-[90px] animate-[pulse_6s_ease-in-out_infinite]" />
               <div className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/30 rounded-full blur-[70px] animate-[pulse_8s_ease-in-out_infinite_reverse]" />
            </div>

            {/* Top Info Bar */}
            <div className="flex items-center justify-between mb-auto relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-inner group-hover:bg-cyan-950/30 group-hover:border-cyan-400/30 transition-all duration-500">
                  <Cpu size={20} className="text-white/40 group-hover:text-cyan-400 transition-colors duration-500" />
                </div>
                <div>
                  <h3 className="font-mono text-[10px] text-white/80 uppercase tracking-widest font-bold">02 / Encoder</h3>
                  <p className="text-xs text-white/40 mt-1 font-ui">Latent Representation</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-950/40 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                 <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_cyan] animate-pulse" />
                 <span className="font-mono text-[9px] text-cyan-100 tracking-widest uppercase">Processing</span>
              </div>
            </div>

            {/* Central Graphic (The Neural Network) */}
            <div className="relative z-10 flex-1 flex items-center justify-center py-6 w-full">
               
               <div className="relative w-full max-w-[280px] h-48 flex items-center justify-between">
                  
                  {/* Background glow for the network */}
                  <div className="absolute inset-0 bg-cyan-500/10 blur-2xl rounded-full" />
                  
                  {/* SVG Neural Connections */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 192">
                     <defs>
                        <linearGradient id="net-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                           <stop offset="0%" stopColor="transparent" />
                           <stop offset="50%" stopColor="rgba(34,211,238,0.8)" />
                           <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                     </defs>

                     {/* Lines from Input (x=20) to Hidden (x=140) */}
                     {[24, 60, 96, 132, 168].map((y1, i) => 
                        [76, 96, 116].map((y2, j) => (
                           <g key={`in-${i}-${j}`}>
                              {/* Static faint connection */}
                              <line x1="20" y1={y1} x2="140" y2={y2} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                              {/* Animated active firing */}
                              {(i + j) % 3 === 0 && (
                                 <line x1="20" y1={y1} x2="140" y2={y2} stroke="url(#net-glow)" strokeWidth="1" strokeDasharray="50 150" className="animate-[scanRight_2s_linear_infinite]" style={{ animationDelay: `${(i * 0.2)}s` }} />
                              )}
                           </g>
                        ))
                     )}

                     {/* Lines from Hidden (x=140) to Output (x=260) */}
                     {[76, 96, 116].map((y1, i) => 
                        [24, 48, 72, 96, 120, 144, 168].map((y2, j) => (
                           <g key={`out-${i}-${j}`}>
                              {/* Static faint connection */}
                              <line x1="140" y1={y1} x2="260" y2={y2} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                              {/* Animated active firing */}
                              {(i + j) % 4 === 0 && (
                                 <line x1="140" y1={y1} x2="260" y2={y2} stroke="url(#net-glow)" strokeWidth="1" strokeDasharray="50 150" className="animate-[scanRight_2s_linear_infinite]" style={{ animationDelay: `${(j * 0.15) + 1}s` }} />
                              )}
                           </g>
                        ))
                     )}
                  </svg>

                  {/* DOM Nodes for glowing effects */}
                  
                  {/* Input Layer (5 variables) */}
                  <div className="flex flex-col justify-between h-full relative z-10 ml-[16px]">
                     {[1,2,3,4,5].map(i => (
                        <div key={`in-${i}`} className="w-2 h-2 rounded-full bg-[#050b18] border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)] relative group">
                           <div className="absolute inset-0 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
                        </div>
                     ))}
                  </div>

                  {/* Latent Bottleneck Layer (3 compressed features) */}
                  <div className="flex flex-col justify-center gap-3 h-full relative z-10 shadow-[0_0_40px_rgba(34,211,238,0.2)] bg-black/40 backdrop-blur-md px-4 rounded-3xl border border-cyan-400/20 py-6">
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="font-mono text-[8px] text-cyan-400 uppercase tracking-widest">Latent Space</span>
                     </div>
                     {[1,2,3].map(i => (
                        <div key={`mid-${i}`} className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_15px_cyan] animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                     ))}
                  </div>

                  {/* Output Layer (7 depth representations) */}
                  <div className="flex flex-col justify-between h-full relative z-10 mr-[16px]">
                     {[1,2,3,4,5,6,7].map(i => (
                        <div key={`out-${i}`} className="w-2 h-2 rounded-full bg-[#050b18] border border-cyan-500/30 relative">
                           <div className="absolute inset-0 rounded-full bg-cyan-400 opacity-50 blur-[2px]" />
                        </div>
                     ))}
                  </div>

               </div>
            </div>

            <div className="relative z-10 max-w-sm mx-auto text-center mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.02] group-hover:bg-white/[0.04] transition-colors">
              <p className="text-sm font-light text-white/70 leading-relaxed font-ui">
                Compresses 2D physical telemetry into a high-dimensional continuous latent space.
              </p>
            </div>
          </motion.div>


          {/* ========================================== */}
          {/* MODULE 3: OUTPUT DECODER (Col Span 1)      */}
          {/* ========================================== */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="col-span-1 group relative bg-[#030812]/50 backdrop-blur-xl border border-white/[0.05] rounded-[2rem] p-8 overflow-hidden hover:bg-[#050b18]/80 transition-colors duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            {/* Thematic Deep Water Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#010a18]/40 to-[#00050c] pointer-events-none opacity-50 z-0" />

            {/* Header */}
            <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-inner group-hover:bg-cyan-950/30 group-hover:border-cyan-400/30 transition-all duration-500">
                <Waves size={20} className="text-white/40 group-hover:text-cyan-400 transition-colors duration-500" />
              </div>
              <div>
                <h3 className="font-mono text-[10px] text-white/80 uppercase tracking-widest font-bold">03 / Decoder</h3>
                <p className="text-xs text-white/40 mt-1 font-ui">Volumetric Profile</p>
              </div>
            </div>

            {/* Depth Waterfall Graphic */}
            <div className="relative pl-6 py-4 flex-1 flex flex-col justify-between z-10">
               {/* Vertical ruler line */}
               <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-white/[0.03] overflow-hidden rounded-full">
                  <div className="w-full h-1/3 bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-80 animate-[sonarDrop_3s_linear_infinite]" />
               </div>

               <div className="flex flex-col justify-between h-[300px]">
                 {depths.map((depth, i) => (
                   <div key={i} className="flex items-center gap-5 group/depth cursor-default relative">
                      {/* Active indicator dot */}
                      <div className="w-2 h-2 rounded-full bg-[#050b18] border-2 border-white/10 z-10 transition-all duration-300 group-hover/depth:border-cyan-400 group-hover/depth:bg-cyan-400 group-hover/depth:shadow-[0_0_10px_cyan] group-hover/depth:scale-125" />
                      
                      {/* Content Row */}
                      <div className="flex items-center justify-between flex-1 border-b border-white/[0.03] pb-2 group-hover/depth:border-cyan-400/20 transition-colors">
                         <span className="font-mono text-[11px] text-white/50 group-hover/depth:text-white transition-colors">{depth}m</span>
                         <div className="flex items-center gap-2 opacity-0 group-hover/depth:opacity-100 transition-opacity duration-300 translate-x-2 group-hover/depth:translate-x-0">
                            <span className="font-mono text-[8px] text-cyan-400 uppercase tracking-widest">Reconstructed</span>
                            <ArrowRight size={10} className="text-cyan-400" />
                         </div>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </motion.div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes sonarDrop {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
        @keyframes scanRight {
          0% { transform: translateX(0%); }
          100% { transform: translateX(400%); }
        }
      `}} />
    </section>
  );
}
