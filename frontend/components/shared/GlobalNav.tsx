'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function GlobalNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-4 sm:px-6 pt-3 sm:pt-4 transition-all duration-300">
      <nav 
        className={`max-w-7xl mx-auto flex items-center justify-between pointer-events-auto px-5 sm:px-7 py-2.5 sm:py-3 rounded-full transition-all duration-300 ${
          scrolled 
            ? 'bg-[#020713]/95 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.85)]' 
            : 'bg-[#020713]/88 backdrop-blur-2xl border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.7)]'
        }`}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center group">
          <span className="font-display font-bold tracking-widest text-white group-hover:text-biolume transition-colors leading-none text-base sm:text-lg">
            OCEANEMBED
          </span>
        </Link>

        {/* Links & CTA */}
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-xs font-mono tracking-widest text-slate-200 hover:text-white uppercase font-semibold transition-colors">
              Home
            </Link>
            <Link href="/research-lab" className="text-xs font-mono tracking-widest text-slate-200 hover:text-white uppercase font-semibold transition-colors">
              Research Lab
            </Link>
          </div>
          
          <Link 
            href="/explorer" 
            className="
              group flex items-center gap-2
              font-ui text-xs font-semibold tracking-wide px-5 py-2 rounded-full transition-all duration-300
              bg-white/10 text-white border border-white/20 backdrop-blur-md shadow-sm
              hover:bg-biolume hover:text-black hover:border-biolume hover:shadow-[0_0_20px_rgba(76,224,210,0.4)]
            "
          >
            <span>Launch Explorer</span>
            <ArrowRight size={13} className="text-white/70 group-hover:text-black group-hover:translate-x-0.5 transition-all duration-300" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
