'use client';

import { motion, Variants } from 'framer-motion';
import { Activity, Navigation, GitCompare } from 'lucide-react';

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 50, rotateX: 10, filter: 'blur(10px)' },
  visible: { 
    opacity: 1, 
    y: 0, 
    rotateX: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.2, ease: "easeOut" } 
  },
};

export function ModelObservationStory() {
  return (
    <section className="relative py-32 md:py-48 px-4 md:px-8 border-t border-thermocline/10 bg-[#02060A] overflow-hidden perspective-[2000px]">
      {/* Ambient background lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(76,224,210,0.03)_0%,transparent_60%)] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-12">
        
        {/* LEFT: Massive Typography (The Editorial Split) */}
        <div className="w-full lg:w-5/12 flex flex-col items-start z-20 pl-4 lg:pl-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-foam-dim text-[10px] font-mono tracking-widest mb-8 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-biolume shadow-[0_0_8px_#4CE0D2]" />
            Analytical Workflow
          </div>
          
          <h2 className="font-display text-5xl md:text-6xl lg:text-[5rem] font-bold text-white mb-8 tracking-tighter leading-[1.05]">
            Prediction vs<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-foam to-foam-dim">Measurement</span>
          </h2>
          
          <p className="text-foam-dim text-lg md:text-xl leading-relaxed mb-12 max-w-md font-light">
            We don&apos;t just show charts side-by-side. The platform actively computes spatial anomalies between numerical models and physical observations at exact depth intervals.
          </p>
          
          <div className="flex flex-col gap-5 w-full max-w-md">
            <div className="group flex items-start gap-4 p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-colors">
              <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-biolume/10 flex items-center justify-center border border-biolume/20 group-hover:border-biolume/40 transition-colors">
                <span className="font-mono text-xs text-biolume">1</span>
              </div>
              <div>
                <div className="text-sm text-white font-medium mb-1">Extract Prediction</div>
                <div className="text-sm text-white/50 leading-relaxed">Sample the numerical model at the exact 4D coordinate.</div>
              </div>
            </div>

            <div className="group flex items-start gap-4 p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-colors">
              <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-instrument-amber/10 flex items-center justify-center border border-instrument-amber/20 group-hover:border-instrument-amber/40 transition-colors">
                <span className="font-mono text-xs text-instrument-amber">2</span>
              </div>
              <div>
                <div className="text-sm text-white font-medium mb-1">Retrieve Observation</div>
                <div className="text-sm text-white/50 leading-relaxed">Fetch the physical in-situ reading from the instrument.</div>
              </div>
            </div>

            <div className="group flex items-start gap-4 p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-colors">
              <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-coral-delta/10 flex items-center justify-center border border-coral-delta/20 group-hover:border-coral-delta/40 transition-colors">
                <span className="font-mono text-xs text-coral-delta">3</span>
              </div>
              <div>
                <div className="text-sm text-white font-medium mb-1">Compute Anomaly</div>
                <div className="text-sm text-white/50 leading-relaxed">Visualize the mathematical delta as a structural layer.</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: The Z-Axis Cascade (Interactive Analytical Stack) */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="w-full lg:w-7/12 relative flex flex-col md:block gap-8 md:min-h-[750px] transform-gpu"
        >
          {/* Card 1: Numerical Model (Background, Cyan) */}
          <motion.div 
            variants={cardVariants}
            className="md:absolute md:top-0 md:left-4 z-10 w-full md:w-[400px] p-2 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-700 hover:scale-[1.02] hover:z-40"
          >
            <div className="relative w-full bg-[#040A12]/80 backdrop-blur-2xl rounded-[calc(2.5rem-0.5rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] p-6 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-biolume to-transparent opacity-80" />
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <Activity size={18} className="text-biolume" />
                  <span className="font-mono text-xs text-biolume tracking-widest uppercase font-semibold">Numerical Model</span>
                </div>
                <span className="font-mono text-[10px] text-foam-dim tracking-[0.2em] px-2 py-1 bg-white/[0.03] border border-white/5 rounded-md">INCOIS-HOO</span>
              </div>
              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <div className="font-mono text-[10px] text-foam-dim tracking-widest uppercase mb-2">Depth</div>
                  <div className="font-mono text-lg text-white font-light">250 <span className="text-sm text-white/40">M</span></div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-foam-dim tracking-widest uppercase mb-2">Grid Cell</div>
                  <div className="font-mono text-lg text-white font-light">15.21°N <span className="text-sm text-white/40">72.41°E</span></div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex items-end justify-between">
                <div>
                  <div className="font-mono text-[10px] text-biolume tracking-widest uppercase mb-2">Predicted Temp</div>
                  <div className="font-mono text-4xl font-light text-white tracking-tight">26.8<span className="text-2xl text-white/40 ml-1">°C</span></div>
                </div>
                {/* Simulated sparkline */}
                <svg className="w-24 h-10 opacity-40 mb-1" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path d="M0,15 Q25,5 50,15 T100,10" fill="none" stroke="#4CE0D2" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Card 2: In-Situ Observation (Middle, Amber) */}
          <motion.div 
            variants={cardVariants}
            className="md:absolute md:top-[200px] md:right-8 z-20 w-full md:w-[400px] p-2 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.6)] md:rotate-2 transition-all duration-700 hover:rotate-0 hover:scale-[1.02] hover:z-40"
          >
            <div className="relative w-full bg-[#050B14]/80 backdrop-blur-2xl rounded-[calc(2.5rem-0.5rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-instrument-amber to-transparent opacity-80" />
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <Navigation size={18} className="text-instrument-amber" />
                  <span className="font-mono text-xs text-instrument-amber tracking-widest uppercase font-semibold">Physical Platform</span>
                </div>
                <span className="font-mono text-[10px] text-foam-dim tracking-[0.2em] px-2 py-1 bg-white/[0.03] border border-white/5 rounded-md">IN-SITU</span>
              </div>
              <div className="grid grid-cols-2 gap-6 mt-6">
                <div>
                  <div className="font-mono text-[10px] text-foam-dim tracking-widest uppercase mb-2">Platform ID</div>
                  <div className="font-mono text-lg text-white font-light">#2901234</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-foam-dim tracking-widest uppercase mb-2">Timestamp</div>
                  <div className="font-mono text-lg text-white font-light">12:30:00 <span className="text-sm text-white/40">UTC</span></div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex items-end justify-between">
                <div>
                  <div className="font-mono text-[10px] text-instrument-amber tracking-widest uppercase mb-2">Measured Temp</div>
                  <div className="font-mono text-4xl font-light text-white tracking-tight">27.5<span className="text-2xl text-white/40 ml-1">°C</span></div>
                </div>
                <div className="w-10 h-10 rounded-full border border-instrument-amber/20 flex items-center justify-center bg-instrument-amber/5 mb-1">
                  <div className="w-2.5 h-2.5 bg-instrument-amber rounded-full shadow-[0_0_10px_#E8A33D]" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Matchup & Anomaly (Foreground, Coral) */}
          <motion.div 
            variants={cardVariants}
            className="md:absolute md:top-[440px] md:left-16 z-30 w-full md:w-[420px] p-2 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] md:-rotate-1 transition-all duration-700 hover:rotate-0 hover:scale-[1.02] hover:z-40"
          >
            <div className="relative w-full bg-[#0A1018]/90 backdrop-blur-3xl rounded-[calc(2.5rem-0.5rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] p-8 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,107,91,0.08)_0%,transparent_70%)] pointer-events-none" />
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-coral-delta via-coral-delta/50 to-transparent" />
              
              <div className="flex items-center justify-between border-b border-white/5 pb-5 relative z-10">
                <div className="flex items-center gap-3">
                  <GitCompare size={20} className="text-coral-delta" />
                  <span className="font-mono text-sm text-coral-delta tracking-widest uppercase font-bold drop-shadow-[0_0_10px_rgba(255,107,91,0.4)]">Matchup Anomaly</span>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between relative z-10">
                <div>
                  <div className="font-mono text-[10px] text-foam-dim tracking-widest uppercase mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-coral-delta rounded-full animate-pulse shadow-[0_0_8px_#FF6B5B]"/>
                    Calculated Delta
                  </div>
                  <div className="font-mono text-[3.5rem] leading-none font-bold text-coral-delta tracking-tight drop-shadow-[0_4px_20px_rgba(255,107,91,0.2)]">
                    Δ +0.7<span className="text-3xl text-coral-delta/60 ml-2">°C</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
