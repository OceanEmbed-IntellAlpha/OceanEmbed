'use client';

import { useState, useEffect, useRef } from 'react';
import { Layers, Waves, GitCompare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CAPABILITIES = [
  {
    id: 'depth',
    title: 'Volumetric Depth Navigation',
    description: 'Navigate from the surface of the Indian Ocean down to the abyss. Reveal how thermoclines and haloclines shift throughout the water column in real-time.',
    icon: Layers,
    color: 'text-biolume',
    bg: 'bg-biolume/10',
    border: 'border-biolume/30',
  },
  {
    id: 'currents',
    title: 'Dynamic Vector Fields',
    description: 'Visualize high-resolution INCOIS current models. Watch direction and velocity come alive through fluid particle simulations overlaid on scalar fields.',
    icon: Waves,
    color: 'text-thermocline',
    bg: 'bg-thermocline/10',
    border: 'border-thermocline/30',
  },
  {
    id: 'models',
    title: 'Instant Model Validation',
    description: 'Overlay live Argo float and glider data to inspect model predictions against ground-truth measurements at the exact same coordinate and depth.',
    icon: GitCompare,
    color: 'text-instrument-amber',
    bg: 'bg-instrument-amber/10',
    border: 'border-instrument-amber/30',
  }
];

export function CapabilitiesSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="relative bg-[#02060A] py-24 md:py-32 overflow-hidden border-t border-thermocline/10">
       {/* Ambient background glow */}
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(28,92,107,0.1)_0%,transparent_50%)] pointer-events-none" />
       
       <div className="max-w-7xl mx-auto w-full px-6 relative z-10">
          
          <div className="text-center mb-16 md:mb-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-foam-dim text-xs font-mono tracking-widest mb-6 uppercase">
               INCOIS Ocean Digital Twin
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tighter">
              Google Maps for the ocean. <br className="hidden md:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-biolume to-thermocline">From surface to abyss.</span>
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-8 items-center">
             
             {/* LEFT: Interactive Menu */}
             <div className="w-full lg:w-5/12 flex flex-col gap-4">
                {CAPABILITIES.map((cap, i) => {
                  const isActive = activeIndex === i;
                  const Icon = cap.icon;
                  return (
                    <button 
                      key={cap.id}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => setActiveIndex(i)}
                      className={`group text-left p-6 rounded-[2rem] border transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        isActive 
                          ? 'bg-[#050B14] border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] scale-[1.02]' 
                          : 'bg-transparent border-transparent hover:bg-white/5 active:scale-95'
                      }`}
                    >
                      <div className="flex items-start gap-5">
                         <div className={`mt-1 w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                           isActive 
                             ? `${cap.bg} ${cap.border} border shadow-[inset_0_1px_10px_rgba(255,255,255,0.1)] scale-110` 
                             : 'bg-white/5 border border-white/10 text-foam-dim group-hover:bg-white/10'
                         }`}>
                            <Icon size={20} className={isActive ? cap.color : ''} />
                         </div>
                         <div>
                            <h3 className={`font-display text-2xl font-bold tracking-tight transition-colors duration-500 ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`}>
                              {cap.title}
                            </h3>
                            <div className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isActive ? 'max-h-32 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                              <p className="text-sm leading-relaxed text-foam-dim">
                                {cap.description}
                              </p>
                            </div>
                         </div>
                      </div>
                    </button>
                  );
                })}
             </div>

             {/* RIGHT: Product Viewport (Double-Bezel) */}
             <div className="w-full lg:w-7/12 aspect-[4/3] lg:aspect-square max-h-[600px] rounded-[2.5rem] bg-black/40 backdrop-blur-2xl border border-white/10 p-2 shadow-[0_40px_80px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.1)] relative overflow-hidden">
                <div className="relative w-full h-full rounded-[calc(2.5rem-0.5rem)] bg-[#02060A] border border-white/5 overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                   <AnimatePresence mode="wait">
                      {activeIndex === 0 && <DepthVisual key="depth" />}
                      {activeIndex === 1 && <CurrentsVisual key="currents" />}
                      {activeIndex === 2 && <ModelsVisual key="models" />}
                   </AnimatePresence>
                </div>
             </div>

          </div>
       </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// VISUAL COMPONENTS (Abstract Product Previews)
// ----------------------------------------------------------------------

function DepthVisual() {
  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 flex items-center justify-center perspective-[1000px] bg-[radial-gradient(ellipse_at_center,rgba(76,224,210,0.1)_0%,transparent_70%)]"
    >
      <div className="relative w-64 h-64" style={{ transform: 'rotateX(60deg) rotateZ(-45deg)', transformStyle: 'preserve-3d' }}>
         
         {/* Mathematically precise central core (exactly spans the 120px Z-gap) */}
         <div className="absolute top-1/2 left-1/2 w-16 h-[120px] rounded-full bg-gradient-to-b from-biolume/20 to-transparent blur-xl pointer-events-none" style={{ transform: 'translate(-50%, -50%) rotateX(90deg)' }} />
         <div className="absolute top-1/2 left-1/2 w-[1px] h-[120px] bg-gradient-to-b from-biolume via-thermocline to-blue-900 shadow-[0_0_10px_#4CE0D2] pointer-events-none" style={{ transform: 'translate(-50%, -50%) rotateX(90deg)' }} />

         {/* Surface */}
         <div className="absolute inset-0 border border-biolume/30 bg-biolume/10 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_rgba(76,224,210,0.1),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center overflow-hidden" style={{ transform: 'translateZ(60px)' }}>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-biolume/20 to-transparent mix-blend-screen" />
         </div>
         <div className="absolute -top-12 -left-12 font-mono text-[10px] text-biolume tracking-[0.2em] drop-shadow-md whitespace-nowrap" style={{ transform: 'translateZ(60px) rotateZ(45deg) rotateX(-60deg)' }}>0M SURFACE</div>

         {/* Mid */}
         <div className="absolute inset-0 border border-thermocline/20 bg-thermocline/10 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_rgba(28,92,107,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden" style={{ transform: 'translateZ(0px)' }}>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-thermocline/10 to-transparent mix-blend-screen" />
         </div>
         <div className="absolute -top-12 -left-12 font-mono text-[10px] text-thermocline tracking-[0.2em] drop-shadow-md whitespace-nowrap" style={{ transform: 'translateZ(0px) rotateZ(45deg) rotateX(-60deg)' }}>250M THERMOCLINE</div>

         {/* Deep */}
         <div className="absolute inset-0 border border-blue-900/30 bg-[#0B1D2E]/40 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center justify-center" style={{ transform: 'translateZ(-60px)' }}>
         </div>
         <div className="absolute -top-12 -left-12 font-mono text-[10px] text-blue-400 tracking-[0.2em] drop-shadow-md whitespace-nowrap" style={{ transform: 'translateZ(-60px) rotateZ(45deg) rotateX(-60deg)' }}>1000M DEEP</div>
         
      </div>
    </motion.div>
  );
}

function CurrentsVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number, y: number, vx: number, vy: number, speed: number, life: number, maxLife: number, color: string, history: {x: number, y: number}[] }[] = [];
    
    // Ensure canvas is perfectly crisp on high DPI displays
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      // Ensure we only resize if the dimensions are valid
      if (rect.width === 0 || rect.height === 0) return;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    
    window.addEventListener('resize', resize);
    setTimeout(resize, 0);

    // Initialize particles based on screen size
    const initParticles = () => {
      particles = [];
      const width = canvas.clientWidth || 800;
      const height = canvas.clientHeight || 800;
      // Responsive density: ~1 particle per 2000px sq, capped at 600
      const count = Math.min(600, Math.floor((width * height) / 2000));
      
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          speed: 0.5 + Math.random() * 1.5,
          life: Math.random() * 100,
          maxLife: 60 + Math.random() * 100,
          history: [],
          color: Math.random() > 0.8 ? '76,224,210' : '28,92,107' // RGB strings for alpha
        });
      }
    };
    
    setTimeout(initParticles, 50);

    const render = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 15) p.history.shift();

        // Mathematical flow field (Simplex Noise approximation)
        const xFreq = p.x * 0.002;
        const yFreq = p.y * 0.002;
        const t = time * 0.0001;

        // Complex trigonometric layers to simulate eddies and currents
        const angle = 
          Math.sin(xFreq + t) * 2.5 + 
          Math.cos(yFreq + t) * 2.5 + 
          Math.sin(xFreq * 2 - t) * 1;

        // Apply flow force
        p.vx += Math.cos(angle) * 0.15;
        p.vy += Math.sin(angle) * 0.15;

        // Add a dominant global current (e.g. Gulf stream)
        p.vx += 0.05;
        p.vy -= 0.02;

        // Apply friction
        p.vx *= 0.94;
        p.vy *= 0.94;

        // Move
        p.x += p.vx * p.speed;
        p.y += p.vy * p.speed;

        // Draw Trail
        if (p.history.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (let i = 1; i < p.history.length; i++) {
            ctx.lineTo(p.history[i].x, p.history[i].y);
          }
          
          // Smooth fade in/out based on lifecycle
          const lifeRatio = p.life / p.maxLife;
          const opacity = Math.sin(lifeRatio * Math.PI) * 0.8; 
          
          ctx.strokeStyle = `rgba(${p.color}, ${opacity})`;
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Lifecycle management
        p.life++;
        if (p.life > p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
          p.vx = 0;
          p.vy = 0;
          p.life = 0;
          p.history = [];
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 flex flex-col p-8 bg-[radial-gradient(ellipse_at_center,rgba(28,92,107,0.1)_0%,transparent_70%)] overflow-hidden"
    >
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="font-mono text-[10px] tracking-widest text-white/50 px-2 py-1 uppercase">
           Live Vector Physics
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-2 font-mono text-[9px] text-white/50 tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4CE0D2] shadow-[0_0_8px_#4CE0D2]" /> HIGH VELOCITY
           </div>
           <div className="flex items-center gap-2 font-mono text-[9px] text-white/50 tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1C5C6B]" /> LOW VELOCITY
           </div>
        </div>
      </div>
      
      {/* Delicate Technical Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(28,92,107,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(28,92,107,0.1)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Physics Canvas Engine */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full mix-blend-screen pointer-events-none"
      />
      
      {/* Central Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(76,224,210,0.05)_0%,transparent_60%)] pointer-events-none" />
    </motion.div>
  );
}

function ModelsVisual() {
  const argoPoints = [
    { x: 5, y: 70 },
    { x: 15, y: 45 },
    { x: 25, y: 22.5 },
    { x: 35, y: 50 },
    { x: 45, y: 80 },
    { x: 55, y: 75 },
    { x: 65, y: 55 },
    { x: 75, y: 30 },
    { x: 85, y: 40 },
    { x: 95, y: 50 }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      className="absolute inset-0 flex flex-col p-8 bg-[radial-gradient(ellipse_at_bottom_left,rgba(232,163,61,0.05)_0%,transparent_70%)]"
    >
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="font-mono text-[10px] tracking-widest text-white/50 px-2 py-1 uppercase">
           Model vs Observation
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-2 font-mono text-[9px] text-white/50 tracking-widest"><span className="w-2.5 h-[1.5px] bg-[#4CE0D2]" /> PREDICTION</div>
           <div className="flex items-center gap-2 font-mono text-[9px] text-white/50 tracking-widest"><span className="w-1.5 h-1.5 rounded-full bg-[#E8A33D]" /> ARGO 2901</div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="relative flex-1 w-full border-l border-b border-white/10 mt-4">
         {/* Subtle Technical Grid */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
         
         {/* Chart Lines (SVG) */}
         <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
           <defs>
             <linearGradient id="predictionFill" x1="0" y1="0" x2="0" y2="1">
               <stop offset="0%" stopColor="#4CE0D2" stopOpacity="0.08" />
               <stop offset="100%" stopColor="#4CE0D2" stopOpacity="0.0" />
             </linearGradient>
           </defs>
           
           {/* Prediction Area Fill */}
           <path d="M 0 75 C 25 25, 45 95, 75 35 S 100 60, 100 60 L 100 100 L 0 100 Z" fill="url(#predictionFill)" />
           
           {/* Prediction Line */}
           <path d="M 0 75 C 25 25, 45 95, 75 35 S 100 60, 100 60" fill="none" stroke="#4CE0D2" strokeWidth="2" vectorEffect="non-scaling-stroke" opacity="0.85" />

           {/* Argo connecting line (solid and brighter) */}
           <path d="M 5 70 L 15 45 L 25 22.5 L 35 50 L 45 80 L 55 75 L 65 55 L 75 30 L 85 40 L 95 50" fill="none" stroke="#E8A33D" strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.4" />
         </svg>

         {/* Argo Observation Points (HTML divs to prevent oval distortion) */}
         {argoPoints.map((pt, i) => (
           <div 
             key={i} 
             className="absolute w-2 h-2 rounded-full bg-[#E8A33D] opacity-90 -translate-x-1/2 -translate-y-1/2"
             style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
           />
         ))}

         {/* Active Point Highlight at X=75% */}
         <div className="absolute w-2 h-2 rounded-full border border-[#02060A] bg-[#E8A33D] ring-1 ring-[#E8A33D] -translate-x-1/2 -translate-y-1/2" style={{ left: '75%', top: '30%' }} />
         <div className="absolute w-2 h-2 rounded-full border border-[#02060A] bg-[#4CE0D2] ring-1 ring-[#4CE0D2] -translate-x-1/2 -translate-y-1/2" style={{ left: '75%', top: '35%' }} />

         {/* Clean Vertical Scanner Line */}
         <div className="absolute top-0 bottom-0 left-[75%] w-[1px] bg-white/10" />
         
         {/* Sleek Tooltip Readout */}
         <div className="absolute left-[75%] top-[25%] -translate-x-1/2 -translate-y-full flex flex-col gap-1.5 items-start pl-3 pb-2 border-l border-white/20 ml-[1px]">
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-[#E8A33D]" />
               <span className="font-mono text-[10px] text-white/80 tracking-widest">14.2°C <span className="text-white/30 ml-1 font-sans text-[8px]">OBS</span></span>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-[#4CE0D2]" />
               <span className="font-mono text-[10px] text-white/80 tracking-widest">13.8°C <span className="text-white/30 ml-1 font-sans text-[8px]">MOD</span></span>
            </div>
         </div>

         {/* Minimal Axis Labels */}
         <div className="absolute bottom-3 right-4 font-mono text-[9px] text-white/20 tracking-widest">TIME ➔</div>
         <div className="absolute top-4 -left-6 -rotate-90 font-mono text-[9px] text-white/20 tracking-widest origin-bottom-right">TEMP ➔</div>
      </div>
    </motion.div>
  );
}
