'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { Navigation, Activity, Droplets, Wind, GitCompare, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';


const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

const getPointColor = (d: any) => d.color;
const getPointRadius = (d: any) => d.size;

const getHexAltitude = (d: any) => {
  const w = typeof d?.sumWeight === 'number' ? d.sumWeight : 1;
  return Math.min(0.25, Math.max(0.05, w * 0.06));
};

const getHexTopColor = () => 'rgba(76, 224, 210, 0.95)';
const getHexSideColor = () => 'rgba(76, 224, 210, 0.45)';

const getRingColor = () => (t: number) => `rgba(139, 92, 246, ${Math.max(0, 1 - t).toFixed(2)})`;

function InteractiveGlobe({ activeVariable }: { activeVariable: number }) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [globeSize, setGlobeSize] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const isModalOpen = false;

  const shouldAnimate = isVisible && !isModalOpen;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '100px', threshold: 0 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateSize = () => {
      setGlobeSize(window.innerWidth < 768 ? 280 : 400);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      try {
        const controls = globeRef.current.controls();
        if (controls) {
          controls.autoRotate = shouldAnimate;
          controls.autoRotateSpeed = activeVariable === 2 ? 2.5 : 0.8;
          controls.enableZoom = false;
        }
        if (shouldAnimate) {
          globeRef.current.resumeAnimation?.();
        } else {
          globeRef.current.pauseAnimation?.();
        }
      } catch {
        // Controls not ready yet
      }
    }
  }, [activeVariable, globeSize, shouldAnimate]);

  let color = '#4CE0D2';
  if (activeVariable === 1) color = '#8B5CF6';
  else if (activeVariable === 2) color = '#E8A33D';

  const markers = useMemo(() => [
    { lat: 14.5995, lng: 120.9842, size: 0.1, color },
    { lat: 35.6895, lng: 139.6917, size: 0.15, color },
    { lat: -33.8688, lng: 151.2093, size: 0.1, color },
    { lat: 37.7749, lng: -122.4194, size: 0.12, color },
    { lat: 51.5072, lng: 0.1276, size: 0.1, color },
    { lat: 40.7128, lng: -74.0060, size: 0.11, color },
  ], [color]);

  // Generate data once for the 3 modes
  const { tempHexData, salinityRingsData, currentsArcsData } = useMemo(() => {
    // Temp: Hex bins across the globe
    const tempHexData = [...Array(350)].map(() => ({
      lat: (Math.random() - 0.5) * 160,
      lng: (Math.random() - 0.5) * 360,
      weight: Math.random() * 0.8 + 0.2,
    }));

    // Salinity: Pulsing rings simulating Argo float measurements
    const salinityRingsData = [...Array(25)].map(() => ({
      lat: (Math.random() - 0.5) * 160,
      lng: (Math.random() - 0.5) * 360,
      maxR: Math.random() * 12 + 4,
      propagationSpeed: (Math.random() - 0.5) * 1 + 1.2,
      repeatPeriod: Math.random() * 1500 + 1000
    }));

    // Currents: Arcs simulating ocean flow
    const currentsArcsData = [...Array(50)].map(() => {
      const startLat = (Math.random() - 0.5) * 140;
      const startLng = (Math.random() - 0.5) * 360;
      return {
        startLat,
        startLng,
        endLat: startLat + (Math.random() - 0.5) * 25,
        endLng: startLng + (Math.random() - 0.5) * 45,
        color: ['#E8A33D', '#FFDF9E']
      };
    });

    return { tempHexData, salinityRingsData, currentsArcsData };
  }, []);

  if (globeSize === 0) return null;

  return (
    <div ref={containerRef} className="relative w-full h-full max-w-[420px] aspect-square rounded-full overflow-hidden flex items-center justify-center">
      <Globe
        ref={globeRef}
        width={globeSize}
        height={globeSize}
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere={true}
        atmosphereColor="#38BDF8"
        atmosphereAltitude={0.18}
        onGlobeReady={() => {
          if (globeRef.current) {
            try {
              const controls = globeRef.current.controls();
              if (controls) {
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.8;
                controls.enableZoom = false;
              }
            } catch {
              // Ignore
            }
          }
        }}
        
        // --- Markers (Always visible, colored by mode) ---
        pointsData={markers}
        pointAltitude={0.015}
        pointColor={getPointColor}
        pointRadius={getPointRadius}
        pointsMerge={false}
        
        // --- Temperature Mode: Hex Bins ---
        hexBinPointsData={activeVariable === 0 ? tempHexData : []}
        hexBinPointWeight="weight"
        hexBinResolution={4}
        hexMargin={0.2}
        hexAltitude={getHexAltitude}
        hexTopColor={getHexTopColor}
        hexSideColor={getHexSideColor}

        // --- Salinity Mode: Rings ---
        ringsData={activeVariable === 1 ? salinityRingsData : []}
        ringColor={getRingColor}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"

        // --- Currents Mode: Arcs ---
        arcsData={activeVariable === 2 ? currentsArcsData : []}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
        arcStroke={0.5}

        animateIn={false}
      />
    </div>
  );
}

export function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-cycling state for the Globe Demo (Step 1)
  const [activeVariable, setActiveVariable] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveVariable(prev => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: '+=300%', // 3 steps = 3 screen heights of scrolling
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      }
    });

    // We have 3 steps. Each transition takes 1 unit of time, with 0.5 units of pause.
    
    // -- STEP 1 to STEP 2 --
    tl.addLabel('step2', 1)
      // Left Text
      .to('.step-1-text', { opacity: 0, y: -20, duration: 0.5 }, 'step2')
      .to('.step-2-text', { opacity: 1, y: 0, duration: 0.5 }, 'step2')
      // Right Visual: Globe fades out, Depth Rail activates & descends
      .to('.demo-globe', { opacity: 0, scale: 0.9, filter: 'blur(10px)', duration: 0.5 }, 'step2')
      .to('.demo-depth-container', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5 }, 'step2')
      // Depth Rail descending animation (simulating camera moving down)
      .to('.depth-rail-indicator', { y: 150, duration: 1, ease: 'power2.inOut' }, 'step2')
      .to('.depth-grid-lines', { y: -100, duration: 1, ease: 'none' }, 'step2');

    // -- STEP 2 to STEP 3 --
    tl.addLabel('step3', 2.5)
      // Left Text
      .to('.step-2-text', { opacity: 0, y: -20, duration: 0.5 }, 'step3')
      .to('.step-3-text', { opacity: 1, y: 0, duration: 0.5 }, 'step3')
      // Right Visual: Depth fades out, Inspect Comparison activates
      .to('.demo-depth-container', { opacity: 0, scale: 1.1, filter: 'blur(10px)', duration: 0.5 }, 'step3')
      .to('.demo-inspect-container', { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.5 }, 'step3')
      // Inspect animation sequence
      .fromTo('.inspect-argo-line', { height: 0 }, { height: 80, duration: 0.5, ease: 'power2.out' }, 'step3+=0.2')
      .fromTo('.inspect-model-box', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }, 'step3+=0.5')
      .fromTo('.inspect-obs-box', { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.4 }, 'step3+=0.7')
      .fromTo('.inspect-delta', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.5)' }, 'step3+=1.1');

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="hidden relative h-screen w-full bg-[#02060A] overflow-hidden border-t border-thermocline/10 items-center">
      {/* Ambient BG */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(28,92,107,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto w-full px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10">
        
        {/* LEFT COLUMN: Narrative Text (Sticky cross-fading content) */}
        <div className="w-full lg:w-5/12 relative h-[300px] flex items-center">
          
          {/* STEP 1 TEXT */}
          <div className="step-1-text absolute inset-0 flex flex-col justify-center">
            <div className="font-mono text-xs tracking-widest text-foam-dim uppercase mb-4 flex items-center gap-2">
              <span className="w-6 h-[1px] bg-white/20" /> 01 / SELECT
            </div>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tighter leading-tight">
              Choose what you <br/>want to see.
            </h2>
            <p className="text-foam-dim text-lg leading-relaxed max-w-md font-light">
              Start with a variable — temperature, salinity, or currents — and explore it across the ocean. The entire 3D field responds instantly.
            </p>
          </div>

          {/* STEP 2 TEXT */}
          <div className="step-2-text absolute inset-0 flex flex-col justify-center opacity-0 translate-y-10">
            <div className="font-mono text-xs tracking-widest text-thermocline uppercase mb-4 flex items-center gap-2">
              <span className="w-6 h-[1px] bg-thermocline/50" /> 02 / DIVE
            </div>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tighter leading-tight">
              Go beneath the <br/>surface.
            </h2>
            <p className="text-foam-dim text-lg leading-relaxed max-w-md font-light">
              Use the Depth Rail to move from surface conditions into the water column and reveal vertical structure, thermoclines, and currents at any depth.
            </p>
          </div>

          {/* STEP 3 TEXT */}
          <div className="step-3-text absolute inset-0 flex flex-col justify-center opacity-0 translate-y-10">
            <div className="font-mono text-xs tracking-widest text-instrument-amber uppercase mb-4 flex items-center gap-2">
              <span className="w-6 h-[1px] bg-instrument-amber/50" /> 03 / INSPECT
            </div>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tighter leading-tight">
              Measure reality against prediction.
            </h2>
            <p className="text-foam-dim text-lg leading-relaxed max-w-md font-light">
              Select an Argo float or glider, inspect its profile, and mathematically compare what the model predicted with what the instrument actually measured.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: The Miniature Product Demo Window */}
        <div className="w-full lg:w-6/12 relative aspect-square lg:aspect-[4/3] rounded-[2rem] bg-[#030911]/80 backdrop-blur-3xl border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden">
          
          {/* Subtle grid background for the demo window */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

          {/* === STEP 1 VISUAL: SELECT === */}
          <div className="demo-globe absolute inset-0 flex items-center justify-center p-4 md:p-8">
            {/* High-End Sidebar Mock (Auto-cycling) */}
            <div className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-56 md:w-64 rounded-[2rem] bg-[#02060A]/80 backdrop-blur-3xl border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] p-5 flex flex-col gap-3 z-20">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2 px-1">
                <span className="font-mono text-[10px] tracking-widest text-foam-dim uppercase">Active Layer</span>
                <motion.span 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-white/40" 
                />
              </div>
              
              {[
                { name: 'Temperature', unit: '°C', color: '#4CE0D2', bg: 'bg-biolume', border: 'border-biolume/30', text: 'text-biolume', icon: Activity },
                { name: 'Salinity', unit: 'PSU', color: '#8B5CF6', bg: 'bg-purple-500', border: 'border-purple-500/30', text: 'text-purple-400', icon: Droplets },
                { name: 'Currents', unit: 'M/S', color: '#E8A33D', bg: 'bg-instrument-amber', border: 'border-instrument-amber/30', text: 'text-instrument-amber', icon: Wind }
              ].map((item, idx) => {
                const isActive = activeVariable === idx;
                const Icon = item.icon;
                return (
                  <motion.div 
                    key={item.name}
                    layout
                    onClick={() => setActiveVariable(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-500 cursor-pointer select-none ${
                      isActive 
                        ? `bg-[#050B14] ${item.border} ${item.text} shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] scale-105` 
                        : 'border-transparent text-foam-dim/50 scale-100 hover:bg-white/5 hover:text-foam-dim'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center w-5 h-5">
                         {isActive && (
                            <motion.div 
                              layoutId="activeGlow"
                              className="absolute inset-0 rounded-full blur-md opacity-50"
                              style={{ backgroundColor: item.color }}
                            />
                         )}
                         <Icon size={14} className="relative z-10" />
                      </div>
                      <span className={`font-mono text-[11px] tracking-widest uppercase ${isActive ? 'font-bold' : ''}`}>{item.name}</span>
                    </div>
                    <span className="font-mono text-[9px] opacity-60">{item.unit}</span>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Cinematic WebGL Globe */}
            <div className="ml-16 md:ml-32 w-72 h-72 md:w-[420px] md:h-[420px] rounded-full relative flex items-center justify-center">
              
              {/* Dynamic Glow Behind Globe */}
              <motion.div 
                 className="absolute inset-0 blur-[80px] rounded-full opacity-40 mix-blend-screen"
                 animate={{ 
                   backgroundColor: activeVariable === 0 ? '#4CE0D2' : activeVariable === 1 ? '#8B5CF6' : '#E8A33D',
                   scale: [1, 1.1, 1]
                 }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* The WebGL Canvas Wrapper */}
              <div className="absolute inset-0 flex items-center justify-center">
                 <InteractiveGlobe activeVariable={activeVariable} />
              </div>
            </div>
          </div>

          {/* === STEP 2 VISUAL: DIVE === */}
          <div className="demo-depth-container absolute inset-0 opacity-0 translate-y-10 filter blur-[10px] flex items-center justify-center p-4 lg:p-8 overflow-hidden pointer-events-none">
             {/* Background Scanner Grid - 3D Perspective */}
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(28,92,107,0.15)_0%,transparent_70%)]" />
             <div className="absolute inset-0 border-y border-thermocline/10 h-[300%] bg-[linear-gradient(rgba(28,92,107,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(28,92,107,0.15)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 [transform:perspective(1000px)_rotateX(60deg)_translateY(-100px)]" />

             {/* HUD Interface Wrapper */}
             <div className="relative w-full max-w-4xl h-[500px] flex items-center justify-center pointer-events-auto">
                 {/* Left Panel: Depth Scale */}
                 <div className="hidden md:flex absolute left-0 lg:left-8 h-full items-center">
                    <div className="relative h-full w-24 flex items-center justify-end border-r border-white/10 pr-6">
                        {/* Segmented Line */}
                        <div className="absolute right-[-1px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-white/20 via-thermocline to-white/5" />
                        
                        {/* Ticks */}
                        {Array.from({ length: 11 }).map((_, i) => (
                           <div key={i} className="absolute right-0 flex items-center justify-end w-full" style={{ top: `${i * 10}%` }}>
                              <span className="text-[10px] font-mono text-foam-dim/50 mr-4">{i * 500}m</span>
                              <div className={`h-[1px] bg-white/${i % 5 === 0 ? '30' : '10'} ${i % 5 === 0 ? 'w-4' : 'w-2'}`} />
                           </div>
                        ))}
                    </div>
                 </div>

                 {/* Center/Main Element: The Active Depth Node */}
                 <div className="relative z-10 flex flex-col items-center">
                    <div className="depth-rail-indicator flex flex-col md:flex-row items-center gap-6 translate-y-10">
                       {/* The Node */}
                       <div className="relative flex items-center justify-center mb-4 md:mb-0">
                          <div className="absolute w-32 h-32 rounded-full border border-thermocline/10 animate-ping opacity-50 [animation-duration:3s]" />
                          <div className="absolute w-20 h-20 rounded-full border border-thermocline/30 shadow-[0_0_40px_rgba(28,92,107,0.4)]" />
                          <div className="absolute w-12 h-12 rounded-full bg-thermocline/10 border border-thermocline/50 backdrop-blur-md flex items-center justify-center animate-pulse" />
                          <div className="w-4 h-4 rounded-full bg-[#02060A] border-2 border-thermocline flex items-center justify-center z-10 shadow-[0_0_20px_rgba(28,92,107,1)] relative">
                             <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]" />
                             {/* Connector Line to Card */}
                             <div className="hidden md:block absolute left-full top-1/2 w-6 h-[1px] bg-thermocline/50" />
                          </div>
                       </div>
                       
                       {/* Telemetry Card */}
                       <div className="bg-[#02050A]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] w-72 md:w-80 relative overflow-hidden group">
                           {/* Scanline effect */}
                           <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(44,212,191,0.03)_50%,transparent_100%)] bg-[length:100%_4px] opacity-50" />
                           
                           {/* Glow Effect */}
                           <div className="absolute -top-20 -right-20 w-40 h-40 bg-thermocline/10 rounded-full blur-[50px] pointer-events-none" />

                           <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-5 relative z-10">
                              <div className="flex flex-col">
                                 <span className="font-mono text-[10px] text-thermocline tracking-widest uppercase mb-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-thermocline animate-pulse" />
                                    Telemetry Active
                                 </span>
                                 <div className="flex items-baseline gap-2 mt-1">
                                    <span className="font-mono text-5xl font-light text-white tracking-tight">2,500</span>
                                    <span className="font-mono text-sm text-foam-dim">M</span>
                                 </div>
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                                 <Layers className="w-5 h-5 text-thermocline" />
                              </div>
                           </div>

                           <div className="space-y-4 relative z-10">
                               <div className="flex justify-between items-center group/item hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                                  <span className="font-mono text-[10px] text-foam-dim tracking-widest">TEMPERATURE</span>
                                  <div className="flex items-center gap-3">
                                      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                          <div className="h-full bg-thermocline w-[30%]" />
                                      </div>
                                      <span className="font-mono text-sm text-thermocline font-medium w-12 text-right">3.2 °C</span>
                                  </div>
                               </div>
                               <div className="flex justify-between items-center group/item hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                                  <span className="font-mono text-[10px] text-foam-dim tracking-widest">SALINITY</span>
                                  <div className="flex items-center gap-3">
                                      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                          <div className="h-full bg-salinity w-[80%]" />
                                      </div>
                                      <span className="font-mono text-sm text-salinity font-medium w-12 text-right">34.8 PSU</span>
                                  </div>
                               </div>
                               <div className="flex justify-between items-center group/item hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                                  <span className="font-mono text-[10px] text-foam-dim tracking-widest">PRESSURE</span>
                                  <div className="flex items-center gap-3">
                                      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                          <div className="h-full bg-white/80 w-[25%]" />
                                      </div>
                                      <span className="font-mono text-sm text-white/80 font-medium w-12 text-right">251 ATM</span>
                                  </div>
                               </div>
                           </div>

                           {/* Decorative Tech Corners */}
                           <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-thermocline/40 rounded-tl-[2rem]" />
                           <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-thermocline/40 rounded-tr-[2rem]" />
                           <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-thermocline/40 rounded-bl-[2rem]" />
                           <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-thermocline/40 rounded-br-[2rem]" />
                       </div>
                    </div>
                 </div>

                 {/* Right Panel: Strata markers */}
                 <div className="hidden md:flex absolute right-0 lg:right-8 h-full flex-col justify-center gap-20 opacity-70">
                    <div className="flex items-center gap-4 group">
                       <div className="h-[1px] w-8 bg-white/20 transition-all group-hover:w-12 group-hover:bg-white/40" />
                       <div className="flex flex-col">
                         <span className="font-mono text-[10px] text-foam tracking-widest uppercase">Epipelagic</span>
                         <span className="font-mono text-[8px] text-foam-dim/50 uppercase">0 - 200m</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                       <div className="h-[1px] w-12 bg-thermocline/80 shadow-[0_0_10px_rgba(28,92,107,1)] relative">
                           <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                       </div>
                       <div className="flex flex-col">
                         <span className="font-mono text-[10px] text-thermocline tracking-widest uppercase font-bold">Mesopelagic</span>
                         <span className="font-mono text-[8px] text-thermocline/50 uppercase">200m - 1000m</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 group">
                       <div className="h-[1px] w-8 bg-white/20 transition-all group-hover:w-12 group-hover:bg-white/40" />
                       <div className="flex flex-col">
                         <span className="font-mono text-[10px] text-foam-dim tracking-widest uppercase">Bathypelagic</span>
                         <span className="font-mono text-[8px] text-foam-dim/30 uppercase">1000m - 4000m</span>
                       </div>
                    </div>
                 </div>
             </div>
          </div>

          {/* === STEP 3 VISUAL: INSPECT === */}
          <div className="demo-inspect-container absolute inset-0 opacity-0 scale-95 filter blur-[10px] flex items-center justify-center p-4 lg:p-8 overflow-hidden pointer-events-none">
             
             {/* Deep Space Background / Grid */}
             <div className="absolute inset-0 bg-[#010308]" />
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,163,61,0.08)_0%,transparent_60%)]" />
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />

             {/* Main Interface Wrapper - Perfectly Centered */}
             <div className="relative z-10 w-full max-w-2xl flex flex-col items-center pointer-events-auto">
                
                {/* 1. Argo Float Header */}
                <div className="relative flex flex-col items-center z-20">
                   <div className="relative w-16 h-16 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border border-instrument-amber/20 animate-[ping_3s_ease-out_infinite]" />
                      <div className="absolute inset-2 rounded-full border border-instrument-amber/40" />
                      <div className="w-12 h-12 rounded-full bg-[#02060A]/80 backdrop-blur-xl border border-instrument-amber/60 flex items-center justify-center shadow-[0_0_30px_rgba(232,163,61,0.3)]">
                        <Navigation size={18} className="text-instrument-amber fill-instrument-amber/20" />
                      </div>
                   </div>
                   <div className="mt-4 font-mono text-[11px] text-instrument-amber tracking-[0.2em] uppercase font-bold text-shadow-glow">
                     Argo Float Profile
                   </div>
                </div>

                {/* Main Vertical Axis (Spine) */}
                <div className="relative w-[2px] h-20 my-2 z-10">
                   <div className="absolute inset-0 bg-gradient-to-b from-instrument-amber/60 via-instrument-amber/20 to-transparent" />
                   <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-instrument-amber to-transparent animate-[pulse_2s_ease-in-out_infinite]" />
                </div>

                {/* 2. Middle Section (Cards + Center Node) */}
                <div className="relative w-full flex items-center justify-center gap-12 z-20 -mt-8">
                   
                   {/* Model Card (Left) */}
                   <div className="inspect-model-box relative w-56 bg-[#03080F]/80 backdrop-blur-3xl border border-biolume/30 rounded-2xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden">
                      <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(76,224,210,0.03)_50%,transparent_100%)] bg-[length:100%_4px]" />
                      <div className="flex justify-between items-start mb-3 relative z-10">
                         <span className="font-mono text-[10px] text-biolume tracking-widest uppercase">Model</span>
                      </div>
                      <div className="flex items-end justify-start relative z-10">
                         <span className="font-mono text-[2.5rem] leading-none text-white font-light tracking-tight">26.8</span>
                         <span className="font-mono text-lg text-white/50 ml-1 mb-1">°C</span>
                      </div>
                   </div>
                   
                   {/* Center Compare Icon */}
                   <div className="relative w-10 h-10 rounded-full border border-white/10 bg-[#02060A]/80 backdrop-blur-md flex items-center justify-center shadow-lg z-30 shrink-0">
                      <GitCompare size={16} className="text-white/30" />
                   </div>

                   {/* Observation Card (Right) */}
                   <div className="inspect-obs-box relative w-56 bg-[#03080F]/80 backdrop-blur-3xl border border-instrument-amber/30 rounded-2xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden">
                      <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(232,163,61,0.03)_50%,transparent_100%)] bg-[length:100%_4px]" />
                      <div className="flex justify-between items-start mb-3 relative z-10">
                         <span className="font-mono text-[10px] text-instrument-amber tracking-widest uppercase">Observation</span>
                      </div>
                      <div className="flex items-end justify-start relative z-10">
                         <span className="font-mono text-[2.5rem] leading-none text-white font-light tracking-tight">27.5</span>
                         <span className="font-mono text-lg text-white/50 ml-1 mb-1">°C</span>
                      </div>
                   </div>
                   
                   {/* Horizontal subtle connection lines */}
                   <div className="absolute top-1/2 left-[calc(50%-140px)] w-[110px] h-[1px] bg-gradient-to-r from-biolume/0 via-biolume/20 to-biolume/50 -translate-y-1/2 -z-10" />
                   <div className="absolute top-1/2 right-[calc(50%-140px)] w-[110px] h-[1px] bg-gradient-to-l from-instrument-amber/0 via-instrument-amber/20 to-instrument-amber/50 -translate-y-1/2 -z-10" />
                </div>

                {/* 3. Deviation Box (Bottom) */}
                <div className="inspect-delta mt-10 relative w-full max-w-sm z-30">
                   <div className="relative px-6 py-5 bg-[#050A0F]/90 backdrop-blur-2xl border border-coral-delta/40 rounded-[1.25rem] flex items-center justify-center gap-6 shadow-[0_0_50px_rgba(255,107,91,0.1),inset_0_0_20px_rgba(255,107,91,0.05)]">
                      <div className="absolute inset-0 rounded-[1.25rem] bg-[radial-gradient(circle_at_20%_50%,rgba(255,107,91,0.1)_0%,transparent_50%)]" />
                      
                      <div className="relative flex items-center justify-center shrink-0 ml-2">
                        <div className="absolute w-12 h-12 rounded-full border border-coral-delta/20 animate-ping" />
                        <div className="w-8 h-8 rounded-full border border-coral-delta/50 flex items-center justify-center bg-[#02060A]">
                          <div className="w-2.5 h-2.5 bg-coral-delta rounded-full shadow-[0_0_12px_#FF6B5B] animate-pulse" />
                        </div>
                      </div>
                      
                      <div className="flex flex-col relative z-10 w-full text-left">
                        <span className="font-mono text-[9px] text-coral-delta tracking-[0.15em] uppercase mb-1 font-bold">
                           Calculated Anomaly
                        </span>
                        <div className="font-mono text-[2.25rem] leading-none font-bold text-coral-delta tracking-tighter">
                          Δ +0.7<span className="text-xl text-coral-delta/70 ml-1">°C</span>
                        </div>
                      </div>
                   </div>
                </div>

             </div>
          </div>

        </div>
      </div>
    </section>
  );
}
