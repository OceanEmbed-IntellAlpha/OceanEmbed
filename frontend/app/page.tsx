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

import { HeroSection } from '@/components/landing/HeroSection';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-abyss text-foam selection:bg-biolume/30 font-ui relative">
      <GlobalNav />

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <HeroSection />

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
      {/* <ProductPreview /> */}



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
