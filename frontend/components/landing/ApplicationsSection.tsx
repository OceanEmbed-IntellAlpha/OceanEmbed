'use client';

import { Thermometer, Waves, Ship, Target, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Shared Card Wrapper ──────────────────────────────────────────────────────
interface AppCardProps {
  title: string;
  desc: string;
  tags: string[];
  icon: React.ReactNode;
  spanClass: string;
  children: React.ReactNode;
  delay?: number;
}

function AppCard({ title, desc, tags, icon, spanClass, children, delay = 0 }: AppCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={`group/card relative ${spanClass} bg-[#030812]/50 backdrop-blur-xl border border-white/[0.05] rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between overflow-hidden hover:bg-[#050b18]/80 transition-colors duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.4)]`}
    >
      {/* Decorative Visual Background Region */}
      <div className="absolute inset-0 pointer-events-none opacity-30 group-hover/card:opacity-100 transition-opacity duration-700 z-0">
        {children}
      </div>

      {/* Content Foreground */}
      <div className="relative z-10 flex flex-col h-full justify-between gap-12 pointer-events-none">
        
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/40 group-hover/card:text-cyan-400 group-hover/card:border-cyan-400/30 group-hover/card:bg-cyan-950/30 transition-all duration-500 shadow-inner">
            {icon}
          </div>
          <h3 className="font-display text-3xl md:text-4xl font-medium text-white tracking-tight">
            {title}
          </h3>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-6">
          <p className="font-ui text-white/60 text-sm md:text-base max-w-sm leading-relaxed">
            {desc}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <span key={tag} className="font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase border border-white/5 px-3 py-1.5 rounded-full bg-white/[0.02] group-hover/card:border-cyan-500/20 group-hover/card:text-cyan-400 group-hover/card:bg-cyan-950/10 transition-colors duration-500">
                {tag}
              </span>
            ))}
          </div>
        </div>
        
      </div>
    </motion.div>
  );
}


// ─── Hyper-Relevant Visual Motifs ──────────────────────────────────────────────

// 1. Defense & Naval Operations (Acoustics & Sonar Refracting at Thermocline)
function MotifDefense() {
  return (
    <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="none" className="translate-y-12">
        {/* Thermocline Layer */}
        <line x1="0" y1="150" x2="300" y2="150" stroke="rgba(34,211,238,0.3)" strokeWidth="1" strokeDasharray="4 4" className="group-hover/card:stroke-cyan-400/60 transition-colors duration-500" />
        <text x="150" y="140" fill="rgba(34,211,238,0.2)" fontSize="10" fontFamily="monospace" textAnchor="middle" letterSpacing="3" className="group-hover/card:fill-cyan-400/50 transition-colors duration-500">THERMOCLINE</text>
        
        {/* Sonar waves (curves) bending at the thermocline */}
        <path d="M 150 20 Q 180 80 220 150 L 250 250" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" className="group-hover/card:stroke-cyan-400 transition-colors duration-500" />
        <path d="M 150 20 Q 120 80 80 150 L 50 250" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" className="group-hover/card:stroke-cyan-400 transition-colors duration-500 delay-75" />
        
        {/* Ping origin */}
        <circle cx="150" cy="20" r="4" fill="rgba(34,211,238,0.5)" className="group-hover/card:fill-cyan-400 transition-colors duration-500 animate-pulse" />
      </svg>
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-32 bg-cyan-500/5 blur-[50px] group-hover/card:bg-cyan-500/10 transition-colors duration-1000" />
    </div>
  );
}

// 2. Marine Biology & Fisheries (Ocean Fronts & Potential Fishing Zones)
function MotifBiology() {
  return (
    <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="none">
        {/* Topo contour lines representing temperature gradients */}
        <path d="M -50 80 Q 100 150 150 100 T 350 150" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <path d="M -50 110 Q 100 180 150 130 T 350 180" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" className="group-hover/card:stroke-amber-500/50 transition-colors duration-500" />
        <path d="M -50 140 Q 100 210 150 160 T 350 210" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        
        {/* Target PFZ Hotspot */}
        <circle cx="150" cy="130" r="3" fill="rgba(245,158,11,0.5)" className="group-hover/card:fill-amber-500 group-hover/card:shadow-[0_0_15px_orange] transition-all duration-500" />
        <circle cx="150" cy="130" r="16" fill="none" stroke="rgba(245,158,11,0.5)" strokeDasharray="3 3" className="group-hover/card:stroke-amber-500 transition-colors duration-500 animate-[spin_6s_linear_infinite]" />
      </svg>
      {/* Hotspot Glow */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-amber-500/5 blur-[50px] group-hover/card:bg-amber-500/15 transition-colors duration-1000" />
    </div>
  );
}

// 3. Climate Science (Heatwaves & Ocean Heat Content)
function MotifClimate() {
  return (
    <div className="absolute inset-0 overflow-hidden flex items-end justify-center pb-8">
      <svg width="100%" height="150" viewBox="0 0 300 150" preserveAspectRatio="none">
        {/* Heatwave time-series graph */}
        <path d="M 0 150 L 30 140 L 70 145 L 120 80 L 170 90 L 220 30 L 260 40 L 300 15 L 300 150 Z" fill="url(#heatGradient)" opacity="0.3" className="group-hover/card:opacity-60 transition-opacity duration-1000" />
        <path d="M 0 150 L 30 140 L 70 145 L 120 80 L 170 90 L 220 30 L 260 40 L 300 15" fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth="2" className="group-hover/card:stroke-red-500 transition-colors duration-500" />
        
        <defs>
          <linearGradient id="heatGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      {/* Grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_20px]" />
    </div>
  );
}

// 4. Offshore Operations (Deepwater Platform & Safety Grid)
function MotifOffshore() {
  return (
    <div className="absolute inset-0 overflow-hidden flex flex-col items-center justify-end">
      <svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="none">
        {/* Sea Surface */}
        <line x1="0" y1="40" x2="200" y2="40" stroke="rgba(34,211,238,0.3)" strokeWidth="1" strokeDasharray="3 3" />
        
        {/* Platform Legs */}
        <line x1="85" y1="40" x2="65" y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" className="group-hover/card:stroke-cyan-400 transition-colors duration-500" />
        <line x1="115" y1="40" x2="135" y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" className="group-hover/card:stroke-cyan-400 transition-colors duration-500" />
        
        {/* Crossbracing */}
        <line x1="78" y1="90" x2="122" y2="90" stroke="rgba(255,255,255,0.05)" strokeWidth="1" className="group-hover/card:stroke-white/20 transition-colors duration-500" />
        <line x1="72" y1="150" x2="128" y2="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" className="group-hover/card:stroke-white/20 transition-colors duration-500" />
        <line x1="78" y1="90" x2="128" y2="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" className="group-hover/card:stroke-white/20 transition-colors duration-500" />
        <line x1="122" y1="90" x2="72" y2="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" className="group-hover/card:stroke-white/20 transition-colors duration-500" />
      </svg>
      {/* Depth markers */}
      <div className="absolute left-6 top-[60%] flex flex-col gap-6 font-mono text-[8px] text-white/20 group-hover/card:text-white/50 transition-colors duration-500">
        <span>-100m</span>
        <span>-500m</span>
        <span className="text-cyan-400/50 group-hover/card:text-cyan-400 font-bold">-1000m</span>
      </div>
      {/* Seabed glow */}
      <div className="absolute bottom-0 w-full h-24 bg-cyan-500/5 blur-[40px] group-hover/card:bg-cyan-500/10 transition-colors duration-1000" />
    </div>
  );
}

// 5. Research & Education (Neural Analysis Graph)
function MotifResearch() {
  return (
    <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="group-hover/card:scale-105 transition-transform duration-1000">
        {/* Node Connections */}
        <path d="M 80 150 L 180 110 L 280 190 L 380 130" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="1.5" className="group-hover/card:stroke-emerald-400 transition-colors duration-500" />
        <path d="M 180 110 L 230 60 L 380 130" fill="none" stroke="rgba(16,185,129,0.05)" strokeWidth="1" className="group-hover/card:stroke-emerald-400/40 transition-colors duration-500" />
        <path d="M 80 150 L 130 260 L 280 190" fill="none" stroke="rgba(16,185,129,0.05)" strokeWidth="1" className="group-hover/card:stroke-emerald-400/40 transition-colors duration-500" />
        
        {/* Nodes */}
        <circle cx="80" cy="150" r="4" fill="rgba(16,185,129,0.5)" className="group-hover/card:fill-emerald-400 transition-colors duration-500" />
        <circle cx="180" cy="110" r="6" fill="rgba(16,185,129,0.5)" className="group-hover/card:fill-emerald-400 group-hover/card:shadow-[0_0_15px_#10b981] transition-colors duration-500 animate-pulse" />
        <circle cx="230" cy="60" r="3" fill="rgba(16,185,129,0.3)" className="group-hover/card:fill-emerald-400 transition-colors duration-500" />
        <circle cx="280" cy="190" r="5" fill="rgba(16,185,129,0.5)" className="group-hover/card:fill-emerald-400 transition-colors duration-500" />
        <circle cx="130" cy="260" r="3" fill="rgba(16,185,129,0.3)" className="group-hover/card:fill-emerald-400 transition-colors duration-500" />
        <circle cx="380" cy="130" r="4" fill="rgba(16,185,129,0.5)" className="group-hover/card:fill-emerald-400 transition-colors duration-500" />
      </svg>
      {/* Background radial */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/5 blur-[80px] group-hover/card:bg-emerald-500/10 transition-colors duration-1000" />
    </div>
  );
}


// ─── Main Section ─────────────────────────────────────────────────────────────

export function ApplicationsSection() {
  return (
    <section id="applications" className="relative py-32 px-6 border-t border-white/[0.02] bg-[#000205] overflow-hidden">
      
      {/* ── Background Noise Texture ── */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.02] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        
        {/* Headline */}
        <div className="mb-24 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block rounded-full border border-indigo-500/30 bg-indigo-950/30 px-3 py-1.5 mb-6 backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.15)]"
          >
            <p className="font-mono text-[10px] tracking-[0.3em] text-indigo-400 uppercase font-bold">
              Impact & Utilization
            </p>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-5xl md:text-6xl font-medium text-white tracking-tight leading-tight max-w-4xl mx-auto"
          >
            From ocean science to <br />
            <span className="text-white/30">operational decisions.</span>
          </motion.h2>
        </div>
        
        {/* Bento Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
          
          <AppCard 
            title="Defense & Naval Operations" 
            desc="Enhance acoustic propagation modeling and sonar range prediction by accurately resolving the thermocline depth and sound speed profiles."
            tags={['ACOUSTICS', 'SONAR', 'THERMOCLINE']}
            icon={<Waves size={20} />}
            spanClass="lg:col-span-5 lg:row-span-2 min-h-[400px]"
            delay={0.1}
          >
            <MotifDefense />
          </AppCard>

          <AppCard 
            title="Marine Biology & Fisheries" 
            desc="Identify Potential Fishing Zones (PFZ) and track marine habitat shifts caused by changing subsurface temperature gradients."
            tags={['PFZ', 'HABITAT']}
            icon={<Thermometer size={20} />}
            spanClass="md:col-span-3 lg:col-span-4 min-h-[300px]"
            delay={0.2}
          >
            <MotifBiology />
          </AppCard>

          <AppCard 
            title="Climate Science" 
            desc="Monitor Ocean Heat Content (OHC) and extreme marine heatwaves to better understand long-term global thermodynamic shifts."
            tags={['OHC', 'HEATWAVES']}
            icon={<Target size={20} />}
            spanClass="md:col-span-3 lg:col-span-3 min-h-[300px]"
            delay={0.3}
          >
            <MotifClimate />
          </AppCard>

          <AppCard 
            title="Offshore Operations" 
            desc="Explore temperature, salinity, and productivity-related conditions for defining operational zones."
            tags={['HABITAT', 'SALINITY']}
            icon={<Ship size={20} />}
            spanClass="md:col-span-6 lg:col-span-7 min-h-[300px]"
            delay={0.4}
          >
            <MotifOffshore />
          </AppCard>

          <AppCard 
            title="Research & Education" 
            desc="Transform complex ocean datasets into intuitive interactive experiences for education and outreach."
            tags={['ANALYSIS', 'PROFILES']}
            icon={<BookOpen size={20} />}
            spanClass="md:col-span-6 lg:col-span-12 xl:col-span-12 min-h-[250px]"
            delay={0.5}
          >
            <MotifResearch />
          </AppCard>

        </div>

      </div>
    </section>
  );
}
