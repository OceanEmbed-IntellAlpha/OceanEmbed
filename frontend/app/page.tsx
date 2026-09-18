import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { GlobalNav } from '@/components/shared/GlobalNav';
import { ArrowRight, Waves } from 'lucide-react';

// Landing Page Components
import { TrustStrip } from '@/components/landing/TrustStrip';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { DepthColumnSection } from '@/components/landing/DepthColumnSection';
import { ProductPreview } from '@/components/landing/ProductPreview';
import { PipelineSection } from '@/components/landing/PipelineSection';
import { ValidationSpotlight } from '@/components/landing/ValidationSpotlight';
import { ApplicationsSection } from '@/components/landing/ApplicationsSection';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { FallingStars } from '@/components/landing/FallingStars';
import TechStackStrip from '@/components/landing/TechStackStrip';

const HeroGlobe = dynamic(() => import('@/components/landing/HeroGlobe'), {
  ssr: false,
  loading: () => null,
});

export default function HomePage() {
  return (
    <main className="min-h-screen bg-abyss text-foam selection:bg-biolume/30 font-ui relative overflow-x-hidden">
      <GlobalNav />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION (Section 9 & 10) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <section id="hero-section" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden border-b border-thermocline/20">
        
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#0a1628_0%,#020b14_50%,#000000_100%)]" />
          
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-thermocline/10 blur-[160px] rounded-full animate-[pulse_8s_ease-in-out_infinite] mix-blend-screen" />
          <div className="absolute top-[10%] right-[-5%] w-[40%] h-[40%] bg-[#0B2A3F]/30 blur-[120px] rounded-full animate-[pulse_10s_ease-in-out_infinite_2s] mix-blend-screen" />
          
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#020b14] to-transparent" />
          <div className="absolute inset-x-0 top-0 h-[65%] bg-gradient-to-b from-[#020b14]/90 via-[#020b14]/40 to-transparent" />
        </div>

        {/* Lightweight minimal falling stars around the globe */}
        <FallingStars />

        <div
          className="
            absolute z-[1] pointer-events-none select-none
            left-1/2 -translate-x-1/2
            w-[300vw] h-[300vw]
            md:w-[220vw] md:h-[220vw]
            lg:w-[160vw] lg:h-[160vw]
            bottom-[-170vw]
            md:bottom-[-140vw]
            lg:bottom-[-105vw]
          "
        >
          <Suspense fallback={null}>
            <HeroGlobe />
          </Suspense>
        </div>

        {/* Luminous atmospheric horizon glow and space aura */}
        <div className="absolute z-[2] left-1/2 -translate-x-1/2 bottom-0 w-[200%] h-[42%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(0,229,255,0.22)_0%,rgba(14,165,233,0.12)_35%,transparent_70%)] pointer-events-none" />
        <div className="absolute z-[0] left-1/2 -translate-x-1/2 bottom-[-10%] w-[130vw] h-[55vh] bg-[radial-gradient(ellipse_at_50%_75%,rgba(0,210,255,0.18)_0%,rgba(6,78,119,0.10)_45%,transparent_75%)] blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl lg:max-w-4xl mx-auto text-center flex flex-col items-center pt-24 sm:pt-28 md:pt-32 px-6 pb-16">
          <div className="inline-flex items-center gap-2 font-mono text-[10px] md:text-xs font-semibold tracking-[0.2em] text-biolume uppercase mb-5 px-3.5 py-1.5 rounded-full border border-biolume/30 bg-black/40 backdrop-blur-md shadow-[0_0_15px_rgba(76,224,210,0.15)]">
            SIH 2026 · Problem Statement 26066
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] font-extrabold tracking-tight text-white mb-4 leading-[1.08] drop-shadow-2xl">
            See Beneath the Surface.
            <span className="block mt-3 font-display text-[0.52em] font-normal text-foam/85 tracking-normal drop-shadow-lg max-w-2xl mx-auto leading-relaxed">
              Reconstructing subsurface ocean temperature from satellite observations with deep learning.
            </span>
          </h1>

          <p className="max-w-2xl text-xs sm:text-sm text-foam/65 leading-relaxed mb-8 drop-shadow-md font-mono">
            NORTH INDIAN OCEAN · 45°E – 105°E · 5°S – 30°N · 0.25° × 0.25° DAILY GRID · 15 DEPTH LEVELS
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link 
              href="/explorer" 
              className="
                group flex items-center justify-center gap-2.5 w-full sm:w-auto
                px-8 py-3.5 rounded-full border border-biolume/80 bg-biolume/20 text-white font-display font-bold text-sm sm:text-base
                hover:bg-biolume hover:text-black transition-all duration-300 transform hover:-translate-y-0.5
                shadow-[0_0_25px_rgba(76,224,210,0.35)] backdrop-blur-md
              "
            >
              Explore the Ocean
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#problem" 
              className="
                flex items-center justify-center w-full sm:w-auto
                px-7 py-3.5 rounded-full border border-white/20 text-white bg-black/30 backdrop-blur-md
                font-display font-semibold text-sm sm:text-base hover:bg-white/10 hover:border-white/40 transition-all duration-300
              "
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 2. TRUST / DATA PROVIDERS STRIP */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <TrustStrip />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 3. PHYSICAL PROBLEM (Section 12) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <section id="problem">
        <ProblemSection />
      </section>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 4. PIPELINE & INPUT CONVERGENCE (Section 13 & 14) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <PipelineSection />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 5. 15 DEPTH LEVELS VERTICAL COLUMN (Section 15 Signature Feature) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <DepthColumnSection />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 6. PRODUCT PREVIEW SECTION (Section 16) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <ProductPreview />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 7. ARGO VALIDATION SPOTLIGHT (Section 30 & 31) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <ValidationSpotlight />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 8. APPLICATIONS & MISSION USE CASES */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <ApplicationsSection />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 9. TECH STACK STRIP */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <TechStackStrip />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 10. FINAL CTA */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <FinalCTA />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 11. FOOTER */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <footer className="bg-[#01060a] pt-20 pb-10 px-6 border-t border-thermocline/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 mb-16">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Waves size={24} className="text-biolume" />
              <span className="font-display font-bold text-2xl text-white tracking-wide">OCEANEMBED</span>
            </div>
            <p className="text-foam-dim text-base max-w-sm leading-relaxed">
              A scientific ocean-intelligence platform reconstructing 15 depth levels of subsurface temperature from satellite observations with deep learning.
            </p>
          </div>
          <div>
            <h4 className="font-mono text-sm text-white tracking-widest uppercase mb-6">Navigation</h4>
            <ul className="space-y-4 text-base text-foam-dim flex flex-col font-ui">
              <Link href="/explorer" className="hover:text-white transition-colors w-fit">Explorer</Link>
              <Link href="/methodology" className="hover:text-white transition-colors w-fit">Methodology</Link>
              <Link href="/research" className="hover:text-white transition-colors w-fit">Research</Link>
              <Link href="/about" className="hover:text-white transition-colors w-fit">About</Link>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-sm text-white tracking-widest uppercase mb-6">Observation Data</h4>
            <ul className="space-y-4 text-sm text-foam-dim flex flex-col font-mono">
              <span className="cursor-default">Copernicus GLORYS12V1</span>
              <span className="cursor-default">ESA CCI SST &amp; SSS</span>
              <span className="cursor-default">AVISO+ Altimetry</span>
              <span className="cursor-default">Argo Global Array</span>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-thermocline/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-foam-dim/50 font-ui">
          <span>© 2026 OceanEmbed</span>
          <span>Prototype developed for Smart India Hackathon (SIH 2026) — Problem Statement 26066.</span>
        </div>
      </footer>
    </main>
  );
}
