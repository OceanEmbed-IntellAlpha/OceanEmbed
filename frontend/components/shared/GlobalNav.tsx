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
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-[#050505]/95 backdrop-blur-2xl border-b border-white/10 py-3' 
          : 'bg-transparent border-b border-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/" className="flex items-center group">
          <span className="font-display font-bold tracking-widest text-white group-hover:text-biolume transition-colors leading-none text-lg">
            OCEANEMBED
          </span>
        </Link>

        {/* Links & CTA */}
        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-xs font-mono tracking-widest text-foam-dim hover:text-white uppercase transition-colors">
              Home
            </Link>
            <Link href="/explorer" className="text-xs font-mono tracking-widest text-foam-dim hover:text-white uppercase transition-colors">
              Explore
            </Link>
            <Link href="/research-lab" className="text-xs font-mono tracking-widest text-foam-dim hover:text-white uppercase transition-colors">
              Research Lab
            </Link>
            <Link href="/about" className="text-xs font-mono tracking-widest text-foam-dim hover:text-white uppercase transition-colors">
              About
            </Link>
          </div>
          
          <Link 
            href="/explorer" 
            className={`
              group flex items-center gap-2
              font-ui text-xs font-medium tracking-wide px-6 py-2.5 rounded-full transition-all duration-500
              bg-white/5 text-white/90 border border-white/10 backdrop-blur-md
              hover:bg-white/10 hover:text-white hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]
            `}
          >
            Launch <span className="hidden sm:inline">Explorer</span>
            <ArrowRight size={14} className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-500" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
