'use client';

import { ArrowRight, Thermometer, Waves, Ship, Target, BookOpen } from 'lucide-react';
import { gsap, useGSAP } from '@/lib/gsap';
import { useRef } from 'react';

// ─── Shared Card Wrapper ──────────────────────────────────────────────────────
interface AppCardProps {
  title: string;
  desc: string;
  tags: string[];
  icon: React.ReactNode;
  spanClass: string;
  children: React.ReactNode;
}

function AppCard({ title, desc, tags, icon, spanClass, children }: AppCardProps) {
  return (
    <div className={`group/card relative ${spanClass} js-app-card rounded-[2rem] bg-white/5 p-2 ring-1 ring-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:ring-white/20 hover:shadow-2xl`}>
      <div className="relative h-full flex flex-col p-8 md:p-10 bg-[#050A10]/95 backdrop-blur-2xl rounded-[calc(2rem-0.5rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden">
        
        {/* Decorative Visual Background Region */}
        <div className="absolute inset-0 pointer-events-none opacity-30 group-hover/card:opacity-100 transition-opacity duration-700">
          {children}
        </div>

        {/* Content Foreground */}
        <div className="relative z-10 flex flex-col h-full justify-between gap-12 pointer-events-none">
          
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-6">
              <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-foam group-hover/card:text-biolume group-hover/card:border-biolume/30 group-hover/card:bg-biolume/10 transition-colors duration-700 shadow-lg">
                {icon}
              </div>
              <h3 className="font-display text-3xl font-medium text-white tracking-tight">
                {title}
              </h3>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-6">
            <p className="font-ui text-foam-dim text-base max-w-sm leading-relaxed">
              {desc}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <span key={tag} className="font-mono text-[9px] tracking-[0.2em] text-white/50 uppercase border border-white/10 px-3 py-1.5 rounded-full bg-white/5 group-hover/card:border-biolume/30 group-hover/card:text-biolume transition-colors duration-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}


// ─── Visual Motifs ────────────────────────────────────────────────────────────

// Motif 1: Ocean Forecasting (Animated Grid & Glow)
function MotifForecasting() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Glowing orb that expands on hover */}
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-biolume/10 blur-3xl group-hover/card:bg-biolume/30 group-hover/card:scale-150 transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)]" />
      
      {/* Animated Data Grid */}
      <div className="absolute inset-0 opacity-20 group-hover/card:opacity-50 transition-opacity duration-1000">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4CE0D2_1px,transparent_1px),linear-gradient(to_bottom,#4CE0D2_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_100%,#000_40%,transparent_100%)] group-hover/card:-translate-y-4 transition-transform duration-1000 ease-out" />
      </div>
    </div>
  );
}

// Motif 2: Disaster Management (Pulsing Hazard Vector)
function MotifDisaster() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Pulsing red hazard region */}
      <div className="absolute top-1/2 right-12 w-64 h-64 rounded-full bg-instrument-amber/5 blur-3xl group-hover/card:bg-instrument-amber/20 transition-colors duration-1000" />
      <div className="absolute top-1/2 right-32 -translate-y-1/2 w-24 h-24 rounded-full border border-instrument-amber/20 opacity-0 group-hover/card:opacity-100 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] transition-opacity duration-500" />
      
      {/* Vector Field */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover/card:opacity-80 transition-opacity duration-700">
        <svg width="200" height="200" viewBox="0 0 200 200" className="translate-x-12">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-thermocline group-hover/card:fill-instrument-amber transition-colors duration-500" />
            </marker>
          </defs>
          <path d="M 20 180 Q 80 120 140 100" fill="none" className="stroke-thermocline group-hover/card:stroke-instrument-amber transition-colors duration-500" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <path d="M 40 190 Q 90 140 160 110" fill="none" className="stroke-thermocline group-hover/card:stroke-instrument-amber transition-colors duration-500 delay-75" strokeWidth="1" markerEnd="url(#arrow)" />
          <path d="M 10 150 Q 70 100 130 80" fill="none" className="stroke-thermocline group-hover/card:stroke-instrument-amber transition-colors duration-500 delay-150" strokeWidth="1" markerEnd="url(#arrow)" />
        </svg>
      </div>
    </div>
  );
}

// Motif 3: Search & Rescue (Radar sweep)
function MotifSAR() {
  return (
    <div className="absolute inset-0 overflow-hidden flex justify-end items-end p-8">
      {/* Radar sweep */}
      <div className="absolute bottom-12 right-12 w-64 h-64 border border-white/5 rounded-full flex items-center justify-center opacity-20 group-hover/card:opacity-100 transition-opacity duration-1000 scale-90 group-hover/card:scale-100 ease-[cubic-bezier(0.32,0.72,0,1)]">
        <div className="absolute w-full h-full border border-biolume/10 rounded-full" />
        <div className="absolute w-2/3 h-2/3 border border-biolume/20 rounded-full" />
        <div className="absolute w-1/3 h-1/3 border border-biolume/30 rounded-full" />
        {/* Sweep */}
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(76,224,210,0.2)_360deg)] rounded-full animate-[spin_3s_linear_infinite]" />
      </div>
      
      {/* Search Trajectory line */}
      <svg width="200" height="200" viewBox="0 0 200 200" className="absolute opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 delay-300">
        <path d="M 10 190 L 50 150 L 80 160 L 120 100 L 180 110" fill="none" className="stroke-biolume" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="180" cy="110" r="4" className="fill-biolume animate-pulse" />
      </svg>
    </div>
  );
}

// Motif 4: Offshore Operations (Depth layers)
function MotifOffshore() {
  return (
    <div className="absolute inset-x-0 bottom-0 top-1/4 flex flex-col justify-end opacity-20 group-hover/card:opacity-80 transition-opacity duration-1000 translate-y-8 group-hover/card:translate-y-0 ease-[cubic-bezier(0.32,0.72,0,1)]">
      <div className="h-16 w-full bg-gradient-to-t from-white/5 to-transparent border-t border-white/10" />
      <div className="h-24 w-full bg-gradient-to-t from-biolume/10 to-transparent border-t border-biolume/20" />
      <div className="h-32 w-full bg-gradient-to-t from-instrument-amber/10 to-transparent border-t border-instrument-amber/20" />
      <div className="absolute bottom-16 right-12 font-mono text-[9px] text-biolume uppercase tracking-widest bg-[#050A10]/80 px-2 py-1 rounded backdrop-blur-md border border-biolume/30">
        Platform Anchored
      </div>
    </div>
  );
}

// Motif 5: Education & Research (Data Visualization)
function MotifResearch() {
  return (
    <div className="absolute inset-0 flex items-end justify-end p-8 opacity-20 group-hover/card:opacity-100 transition-opacity duration-700">
      <div className="flex items-end gap-1.5 h-32 w-48">
        {[40, 60, 45, 80, 55, 90, 65, 30, 20, 10].map((h, i) => (
          <div 
            key={i} 
            className="w-full bg-white/10 group-hover/card:bg-biolume/40 transition-all duration-700 rounded-t-sm"
            style={{ 
              height: `${h}%`, 
              transitionDelay: `${i * 30}ms` 
            }}
          />
        ))}
      </div>
      <div className="absolute bottom-8 right-8 font-mono text-[9px] text-foam-dim tracking-widest uppercase border-l border-b border-white/20 w-48 h-32" />
    </div>
  );
}


// ─── Main Section ─────────────────────────────────────────────────────────────

export function ApplicationsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!sectionRef.current) return;
    
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    gsap.fromTo(
      sectionRef.current.querySelectorAll('.js-app-card'),
      { opacity: 0, y: 40 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        stagger: 0.1, 
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
        }
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} id="applications" className="relative py-40 px-6 border-t border-white/5 bg-[#02050A]">
      {/* ── Background Noise Texture ── */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Headline */}
        <div className="mb-24 text-center">
          <div className="inline-block rounded-full border border-thermocline/30 bg-thermocline/5 px-4 py-1.5 mb-8 backdrop-blur-md">
            <p className="font-mono text-[10px] tracking-[0.2em] text-thermocline uppercase font-medium">
              Impact & Utilization
            </p>
          </div>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold text-foam tracking-tight leading-[1.05] max-w-4xl mx-auto">
            From ocean science to <br />
            <span className="text-foam/40 font-normal">operational decisions.</span>
          </h2>
        </div>
        
        {/* Bento Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
          
          <AppCard 
            title="Defense & Naval Operations" 
            desc="Enhance acoustic propagation modeling and sonar range prediction by accurately resolving the thermocline depth and sound speed profiles."
            tags={['ACOUSTICS', 'SONAR', 'THERMOCLINE']}
            icon={<Waves size={20} />}
            spanClass="lg:col-span-5 lg:row-span-2 min-h-[400px]"
          >
            <MotifForecasting />
          </AppCard>

          <AppCard 
            title="Marine Biology & Fisheries" 
            desc="Identify Potential Fishing Zones (PFZ) and track marine habitat shifts caused by changing subsurface temperature gradients."
            tags={['PFZ', 'HABITAT']}
            icon={<Thermometer size={20} />}
            spanClass="md:col-span-3 lg:col-span-4 min-h-[300px]"
          >
            <MotifDisaster />
          </AppCard>

          <AppCard 
            title="Climate Science" 
            desc="Monitor Ocean Heat Content (OHC) and extreme marine heatwaves to better understand long-term global thermodynamic shifts."
            tags={['OHC', 'HEATWAVES']}
            icon={<Target size={20} />}
            spanClass="md:col-span-3 lg:col-span-3 min-h-[300px]"
          >
            <MotifSAR />
          </AppCard>

          <AppCard 
            title="Offshore Operations" 
            desc="Explore temperature, salinity, and productivity-related conditions for defining operational zones."
            tags={['HABITAT', 'SALINITY']}
            icon={<Ship size={20} />}
            spanClass="md:col-span-6 lg:col-span-7 min-h-[300px]"
          >
            <MotifOffshore />
          </AppCard>

          <AppCard 
            title="Research & Education" 
            desc="Transform complex ocean datasets into intuitive interactive experiences for education and outreach."
            tags={['ANALYSIS', 'PROFILES']}
            icon={<BookOpen size={20} />}
            spanClass="md:col-span-6 lg:col-span-12 xl:col-span-12 min-h-[250px]"
          >
            <MotifResearch />
          </AppCard>

        </div>

      </div>
    </section>
  );
}
