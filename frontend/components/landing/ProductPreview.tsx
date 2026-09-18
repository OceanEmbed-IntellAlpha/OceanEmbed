'use client';

import { useRef, Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, Crosshair, Box } from 'lucide-react';
import { gsap, useGSAP } from '@/lib/gsap';
import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import real components
import { ExplorerTopBar as TopBar } from '@/components/explorer/ExplorerTopBar';
import { LayerPanel as LayersPanel } from '@/components/explorer/LayerPanel';
import { DateDepthBar as TimelineScrubber } from '@/components/explorer/DateDepthBar';
import { DepthRail } from '@/components/depth-rail/DepthRail';
// Dummy mockup components for the landing page preview
function FloatSummaryCard({ observation }: { observation: any }) {
  return <div className="p-4 bg-white/5 rounded border border-white/10 text-xs text-foam-dim">Float {observation.id} Summary</div>;
}
function DepthProfileChart({ profile }: { profile: any }) {
  return <div className="w-full h-full bg-white/5 rounded border border-white/10 flex items-center justify-center text-xs text-foam-dim">Depth Profile Chart</div>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const HeroGlobe = dynamic(() => import('@/components/landing/HeroGlobe'), {
  ssr: false,
  loading: () => null,
});

// Mock Data for Inspector
const dummyObservation = {
  id: 'WM06990715', lat: 9.4000, lon: 68.4500,
  lastSurfaced: '2026-04-01T19:52:00Z', platform: 'argo',
  qcStatus: 'ACCEPTED', hasAnomaly: false, depth: 1968,
};

const dummyProfile = {
  floatId: 'WM06990715',
  lat: 9.4000, lon: 68.4500,
  lastSurfaced: '2026-04-01T19:52:00Z',
  qcStatus: 'ACCEPTED',
  depths: [5, 50, 100, 200, 500, 1000, 1500, 1968],
  temperature: [28.6, 27.5, 22.0, 14.5, 9.2, 5.1, 3.2, 2.1],
  salinity: [34.5, 34.6, 35.1, 35.2, 34.8, 34.7, 34.7, 34.7],
  qc: ['1', '1', '1', '1', '1', '1', '1', '1'],
};

// Mock Inspector that avoids react-query fetches
function PreviewInspector() {
  return (
    <div className="absolute right-0 top-12 bottom-0 w-[420px] bg-[#0A0F15]/95 backdrop-blur-3xl border-l border-white/10 flex flex-col z-30 pointer-events-auto overflow-y-auto hidden lg:flex shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
       <div className="p-6 pb-2 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0A0F15]/90 backdrop-blur-xl z-10">
         <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-instrument-amber/10 border border-instrument-amber/30 flex items-center justify-center">
             <Crosshair size={16} className="text-instrument-amber animate-[spin_4s_linear_infinite]" />
           </div>
           <div>
             <h3 className="font-display font-bold text-lg text-white">FLOAT INSPECTOR</h3>
             <span className="font-mono text-[10px] text-instrument-amber tracking-widest uppercase">{dummyObservation.id}</span>
           </div>
         </div>
       </div>
       <div className="p-6 flex flex-col gap-6">
         <FloatSummaryCard observation={dummyObservation} />
         
         <button className="w-full flex items-center justify-center gap-2 py-3 rounded bg-instrument-amber/5 border border-instrument-amber/20 hover:bg-instrument-amber/10 text-instrument-amber transition-colors shadow-[0_0_15px_rgba(232,163,61,0.1)]">
           <Box size={16} />
           <span className="font-mono text-xs tracking-widest uppercase">View 3D Engineering Model</span>
         </button>

         {/* Measurement Cycles Mockup */}
         <div>
            <div className="flex items-center gap-2 mb-4">
              <Crosshair size={14} className="text-biolume" />
              <h4 className="font-display font-bold text-sm text-white">Measurement Cycles</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-foam-dim tracking-widest uppercase mb-1">Total Cycles</span>
                <span className="font-mono text-sm text-biolume">1</span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-foam-dim tracking-widest uppercase mb-1">Latest Cycle</span>
                <span className="font-mono text-sm text-white">#3</span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-foam-dim tracking-widest uppercase mb-1">Max Depth</span>
                <span className="font-mono text-sm text-instrument-amber">1968 m</span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-foam-dim tracking-widest uppercase mb-1">Depth Levels</span>
                <span className="font-mono text-sm text-white">102</span>
              </div>
              <div className="col-span-2 flex flex-col mt-2">
                <span className="font-mono text-[9px] text-foam-dim tracking-widest uppercase mb-1">Last Observation</span>
                <span className="font-mono text-xs text-white">Tue, 01 Apr 2026 19:52 UTC</span>
              </div>
            </div>
         </div>

         {/* Depth Profile Chart Mockup */}
         <div className="mt-2 h-[220px]">
           <DepthProfileChart profile={dummyProfile} />
         </div>

       </div>
    </div>
  );
}

export function ProductPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current || !stageRef.current) return;

    // The scroll-reveal timeline
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=3500", // 3500px of scrolling for the sequence
        pin: true,
        scrub: 1, // Smooth scrubbing
        anticipatePin: 1
      }
    });

    // 1. Initial State (Dark Frame + Wide Camera)
    gsap.set('.preview-topbar, .preview-layers, .preview-depth, .preview-marker, .preview-inspector, .preview-timeline', {
      opacity: 0,
      pointerEvents: 'none'
    });
    
    gsap.set('.preview-globe', { opacity: 0 });

    // 2. Sequence
    // Top bar appears
    tl.to('.preview-topbar', { opacity: 1, duration: 1 })
      
      // Globe enters
      .to('.preview-globe', { opacity: 1, duration: 2 }, "+=0.5")
      
      // Layers panel appears
      .to('.preview-layers', { opacity: 1, x: 0, duration: 1.5, ease: "power2.out" }, "+=0.5")
      .fromTo('.preview-layers', { x: -50 }, { x: 0, duration: 1.5 }, "<")
      
      // Depth rail activates
      .to('.preview-depth', { opacity: 1, duration: 1 }, "+=0.5")
      .fromTo('.preview-depth', { x: 20 }, { x: 0, duration: 1 }, "<")
      
      // Observation marker appears
      .to('.preview-marker', { opacity: 1, scale: 1, duration: 1, ease: "back.out(1.7)" }, "+=0.5")
      .fromTo('.preview-marker', { scale: 0 }, { scale: 1, duration: 1 }, "<")
      
      // Inspector opens
      .to('.preview-inspector', { opacity: 1, x: 0, duration: 1.5, ease: "power3.out" }, "+=0.5")
      .fromTo('.preview-inspector', { x: 100 }, { x: 0, duration: 1.5 }, "<")
      
      // Timeline becomes visible
      .to('.preview-timeline', { opacity: 1, y: 0, duration: 1.5, ease: "power2.out" }, "+=0.5")
      .fromTo('.preview-timeline', { y: 50 }, { y: 0, duration: 1.5 }, "<");

  }, { scope: containerRef });

  return (
    <QueryClientProvider client={queryClient}>
      <section className="bg-abyss relative">
        
        {/* Clean Typography block ABOVE the scroll-pin container to avoid overlap */}
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 pt-32 pb-24 text-center lg:text-left flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-t border-thermocline/10">
          <div>
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-thermocline/30 bg-deep-panel/50 mb-6">
              <div className="w-2 h-2 rounded-full bg-biolume shadow-[0_0_8px_rgba(76,224,210,0.8)] animate-pulse" />
              <span className="font-mono text-[10px] tracking-[0.2em] text-thermocline uppercase">
                Section 06 — Product Preview
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tighter leading-tight max-w-2xl">
              A scientific workspace<br/>
              <span className="text-foam-dim/80 font-normal">built for exploration.</span>
            </h2>
          </div>
          <Link 
            href="/explore"
            className="group relative inline-flex items-center gap-4 pl-8 pr-3 py-3 rounded-full bg-deep-panel border border-thermocline/40 text-white font-mono text-xs font-bold tracking-[0.15em] uppercase overflow-hidden hover:border-biolume transition-all duration-500 w-fit shrink-0 mx-auto lg:mx-0 shadow-[0_0_30px_rgba(76,224,210,0.1)]"
          >
            <div className="absolute inset-0 bg-biolume/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10">Launch Workspace</span>
            <div className="relative z-10 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-biolume group-hover:border-biolume transition-colors duration-500">
               <ArrowRight className="w-3.5 h-3.5 text-foam group-hover:text-abyss" />
            </div>
          </Link>
        </div>

        {/* The pinned scroll-reveal container */}
        <div ref={containerRef} className="w-full h-screen flex flex-col items-center justify-center overflow-hidden bg-abyss">
          
          {/* Computer Frame Wrapper */}
          <div className="relative w-[95%] max-w-[1400px] aspect-[16/10] sm:aspect-video bg-[#0a111a] rounded-2xl border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transform-style-3d">
            
            {/* Fake OS Window Chrome */}
            <div className="h-10 w-full bg-[#0a111a] border-b border-white/5 flex items-center px-4 shrink-0 gap-2 relative z-50">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="font-mono text-[10px] text-foam-dim/50 tracking-widest">OCEAN EXPLORER</span>
              </div>
            </div>

            {/* The Interface Stage (The visual itself) */}
            <div 
              ref={stageRef}
              className="relative flex-1 w-full bg-[#020b14] overflow-hidden flex"
            >
              
              {/* 3D Ocean / Globe */}
              <div className="preview-globe absolute inset-0 pointer-events-none">
                <Suspense fallback={null}>
                  <div className="absolute left-1/2 top-1/2 w-[150%] h-[150%] -translate-x-1/2 -translate-y-1/2 opacity-95">
                    <HeroGlobe />
                  </div>
                </Suspense>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#020b14_85%)] mix-blend-multiply" />
              </div>

              {/* Observation Marker HUD element */}
              <div className="preview-marker absolute left-[45%] top-[40%] flex items-center justify-center z-20">
                <div className="absolute w-20 h-20 rounded-full border border-biolume/30 animate-ping" />
                <div className="w-4 h-4 bg-biolume rounded-full shadow-[0_0_20px_#4CE0D2]" />
                <div className="absolute top-6 bg-abyss border border-biolume/30 text-foam font-mono text-[10px] px-2 py-1 backdrop-blur-md whitespace-nowrap">
                    {dummyObservation.id}
                </div>
              </div>

              {/* Top Bar */}
              <div className="preview-topbar absolute top-0 left-0 right-0 z-40 pointer-events-none">
                <TopBar />
              </div>

              {/* Layers Panel */}
              <div className="preview-layers absolute left-0 top-0 bottom-0 pointer-events-none z-30">
                <LayersPanel />
              </div>

              {/* Depth Rail */}
              <div className="preview-depth absolute right-6 top-24 bottom-24 pointer-events-none z-30 hidden lg:block">
                <DepthRail />
              </div>

              {/* Inspector */}
              <div className="preview-inspector absolute right-0 top-0 bottom-0 pointer-events-none z-40">
                <PreviewInspector />
              </div>

              {/* Timeline */}
              <div className="preview-timeline absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-40">
                <TimelineScrubber />
              </div>
              
            </div>
          </div>
        </div>
      </section>
    </QueryClientProvider>
  );
}
