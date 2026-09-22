'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Gauge, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

interface DepthPoint {
  depth: number;
  temp: number;
  zone: 'Epipelagic' | 'Mesopelagic' | 'Bathypelagic';
  light: string;
  pressureAtm: number;
  color: string;
  desc: string;
}

const DEPTH_DATA: DepthPoint[] = [
  { depth: 0, temp: 28.6, zone: 'Epipelagic', light: '100%', pressureAtm: 1.0, color: '#dc2626', desc: 'Solar-heated sea surface skin layer (SST boundary)' },
  { depth: 5, temp: 28.5, zone: 'Epipelagic', light: '85%', pressureAtm: 1.5, color: '#ea580c', desc: 'Upper wind-mixed turbulent boundary' },
  { depth: 10, temp: 28.4, zone: 'Epipelagic', light: '65%', pressureAtm: 2.0, color: '#f97316', desc: 'Well-mixed surface layer with uniform salinity' },
  { depth: 20, temp: 28.1, zone: 'Epipelagic', light: '40%', pressureAtm: 3.0, color: '#f59e0b', desc: 'Photosynthetically active radiation boundary' },
  { depth: 30, temp: 27.6, zone: 'Epipelagic', light: '25%', pressureAtm: 4.0, color: '#eab308', desc: 'Base of daily diurnal thermal warming' },
  { depth: 50, temp: 26.2, zone: 'Epipelagic', light: '12%', pressureAtm: 6.0, color: '#84cc16', desc: 'Seasonal mixed layer depth (MLD) transition' },
  { depth: 75, temp: 24.1, zone: 'Epipelagic', light: '4%', pressureAtm: 8.5, color: '#22c55e', desc: 'Upper thermocline boundary; high vertical shear' },
  { depth: 100, temp: 21.8, zone: 'Mesopelagic', light: '1%', pressureAtm: 11.0, color: '#14b8a6', desc: 'Euphotic zone limit; beginning of twilight zone' },
  { depth: 125, temp: 19.5, zone: 'Mesopelagic', light: '<0.1%', pressureAtm: 13.5, color: '#06b6d4', desc: 'Permanent thermocline; steepest temperature drop' },
  { depth: 150, temp: 17.8, zone: 'Mesopelagic', light: '0%', pressureAtm: 16.0, color: '#0ea5e9', desc: 'Deep Sound Channel (SOFAR) axis entry' },
  { depth: 200, temp: 15.2, zone: 'Mesopelagic', light: '0%', pressureAtm: 21.0, color: '#38bdf8', desc: 'Central water mass boundary in North Indian Ocean' },
  { depth: 300, temp: 12.6, zone: 'Mesopelagic', light: '0%', pressureAtm: 31.0, color: '#60a5fa', desc: 'Oxygen minimum zone (OMZ) core layer' },
  { depth: 500, temp: 9.8, zone: 'Bathypelagic', light: '0%', pressureAtm: 51.0, color: '#3b82f6', desc: 'Deep mesopelagic transition; sub-10°C water' },
  { depth: 700, temp: 8.1, zone: 'Bathypelagic', light: '0%', pressureAtm: 71.0, color: '#6366f1', desc: 'Indian Ocean Deep Water (IODW) influence' },
  { depth: 1000, temp: 6.8, zone: 'Bathypelagic', light: '0%', pressureAtm: 101.0, color: '#4338ca', desc: 'Cold abyssal boundary; near-zero seasonal variance' },
];

export function DepthColumnSection() {
  const [selectedIdx, setSelectedIdx] = useState(7); // Default to 100m
  const current = DEPTH_DATA[selectedIdx];

  return (
    <section id="depths" className="relative py-32 bg-[#000205] border-t border-white/[0.02] overflow-hidden">
      
      {/* Immersive Background Glow - Shifts based on selected depth */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden transition-colors duration-1000">
         <div 
           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[180px] opacity-20 transition-colors duration-1000 mix-blend-screen"
           style={{ backgroundColor: current.color }}
         />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.3em] text-white/60 uppercase mb-6 bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/[0.05]"
          >
            <Layers size={12} className="text-white/60" />
            Full Water Column
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl font-medium text-white tracking-tight leading-[1.1] mb-6"
          >
            15 Standard Depths.<br />
            <span className="text-white/30">
              From Surface Heat to Abyssal Cold.
            </span>
          </motion.h2>
        </div>

        {/* ── THE MASSIVE INTERACTIVE BENTO BOX ─────────────────── */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative bg-[#030812]/60 backdrop-blur-2xl border border-white/[0.05] rounded-[3rem] p-8 md:p-12 lg:p-16 shadow-[0_20px_80px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Internal ambient aura */}
          <div 
             className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000"
             style={{ backgroundColor: current.color }}
          />

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
             
             {/* LEFT: Interactive Depth Track (The Scrubber) */}
             <div className="relative w-24 h-[400px] lg:h-[500px] flex-shrink-0 flex items-center justify-center group/track">
                
                {/* The vertical glass pill holding the track */}
                <div className="absolute inset-y-0 w-16 bg-black/40 rounded-full border border-white/[0.03] shadow-inner" />
                
                {/* The gradient spectrum line representing the physical ocean */}
                <div 
                   className="absolute inset-y-8 w-1 rounded-full opacity-30"
                   style={{ background: 'linear-gradient(to bottom, #dc2626 0%, #f97316 20%, #eab308 40%, #14b8a6 65%, #3b82f6 85%, #4338ca 100%)' }}
                />

                {/* The 15 interactive hitboxes layered on top */}
                <div className="absolute inset-y-8 inset-x-0 flex flex-col justify-between z-20">
                   {DEPTH_DATA.map((item, idx) => (
                      <div 
                         key={item.depth}
                         onMouseEnter={() => setSelectedIdx(idx)}
                         onClick={() => setSelectedIdx(idx)}
                         className="flex-1 w-full cursor-pointer flex items-center justify-center group"
                      >
                         {/* Subtle dot for each depth level */}
                         <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-white/40 transition-colors" />
                         
                         {/* The Active Glowing Scrubber */}
                         {selectedIdx === idx && (
                            <motion.div 
                               layoutId="activeScrubber"
                               transition={{ type: "spring", stiffness: 300, damping: 30 }}
                               className="absolute w-12 h-12 rounded-full border-2 border-white/20 bg-black shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center pointer-events-none"
                            >
                               <div 
                                 className="w-4 h-4 rounded-full shadow-[0_0_15px_currentColor]" 
                                 style={{ backgroundColor: item.color, color: item.color }} 
                               />
                            </motion.div>
                         )}
                      </div>
                   ))}
                </div>

                {/* Depth Labels outside the pill */}
                <span className="absolute -top-6 font-mono text-[9px] text-white/40 uppercase tracking-widest font-bold">Surface</span>
                <span className="absolute -bottom-6 font-mono text-[9px] text-white/40 uppercase tracking-widest font-bold">Abyss</span>
             </div>


             {/* RIGHT: Massive Dynamic Telemetry Panel */}
             <div className="flex-1 w-full relative z-10 flex flex-col">
                
                {/* Zone Badge */}
                <div className="flex items-center gap-4 mb-10">
                   <span 
                     className="px-4 py-2 rounded-full text-xs font-mono font-bold tracking-widest uppercase border transition-colors duration-500"
                     style={{ color: current.color, borderColor: `${current.color}40`, backgroundColor: `${current.color}10` }}
                   >
                      {current.zone} Zone
                   </span>
                   <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
                      Layer {selectedIdx + 1} of 15
                   </span>
                </div>

                {/* Massive Typography for Depth & Temp */}
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-12 sm:gap-24 mb-12 border-b border-white/[0.05] pb-10">
                   
                   {/* Depth */}
                   <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 block mb-3 font-bold">
                         Depth
                      </span>
                      <AnimatePresence mode="wait">
                         <motion.div 
                           key={`depth-${current.depth}`}
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -10 }}
                           transition={{ duration: 0.2 }}
                           className="font-display text-7xl md:text-8xl lg:text-9xl font-medium text-white tracking-tighter tabular-nums leading-none"
                         >
                            {current.depth}<span className="text-4xl md:text-5xl text-white/20 ml-2">m</span>
                         </motion.div>
                      </AnimatePresence>
                   </div>

                   {/* Temperature */}
                   <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 block mb-3 font-bold">
                         Predicted Temp
                      </span>
                      <AnimatePresence mode="wait">
                         <motion.div 
                           key={`temp-${current.temp}`}
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -10 }}
                           transition={{ duration: 0.2 }}
                           className="font-display text-7xl md:text-8xl lg:text-9xl font-medium tracking-tighter tabular-nums leading-none transition-colors duration-500"
                           style={{ color: current.color, textShadow: `0 0 40px ${current.color}40` }}
                         >
                            {current.temp.toFixed(1)}<span className="text-4xl md:text-5xl opacity-30 ml-2">°</span>
                         </motion.div>
                      </AnimatePresence>
                   </div>
                </div>

                {/* Lower Environment Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
                   <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/50 group-hover:bg-white/[0.05] transition-colors">
                         <Gauge size={20} />
                      </div>
                      <div>
                         <span className="text-white/40 text-[9px] uppercase tracking-widest block font-bold mb-1">Hydrostatic Pressure</span>
                         <span className="text-white text-xl font-medium font-ui">{current.pressureAtm.toFixed(1)} atm</span>
                      </div>
                   </div>

                   <div className="flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/50 group-hover:bg-white/[0.05] transition-colors">
                         {current.depth < 100 ? <Sun size={20} /> : <Moon size={20} />}
                      </div>
                      <div>
                         <span className="text-white/40 text-[9px] uppercase tracking-widest block font-bold mb-1">Solar Penetration</span>
                         <span className="text-white text-xl font-medium font-ui">{current.light}</span>
                      </div>
                   </div>
                </div>

                {/* Description */}
                <div>
                   <p className="font-ui text-base text-white/60 leading-relaxed max-w-2xl">
                      {current.desc}
                   </p>
                </div>
                
                {/* CTA */}
                <div className="mt-auto pt-10">
                  <Link
                    href="/explorer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-xs font-mono font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                  >
                    View in Explorer →
                  </Link>
                </div>

             </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
}
