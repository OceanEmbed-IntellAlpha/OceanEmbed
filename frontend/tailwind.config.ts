import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // OceanRoot design tokens (mapped to clean dashboard aesthetic)
        abyss: '#09090b', // zinc-950
        'deep-panel': '#18181b', // zinc-900
        thermocline: '#10b981', // emerald-500
        biolume: '#818cf8', // indigo-400
        'instrument-amber': '#f59e0b', // amber-500
        'coral-delta': '#f43f5e', // rose-500
        foam: '#f4f4f5', // zinc-100
        'foam-dim': '#a1a1aa', // zinc-400
        reconstruction: '#f59e0b',
        argoObs: '#10b981',
        surfaceSignal: '#6366f1',
        embeddingPurple: '#818cf8',
        validationGood: '#10b981',
        validationWarn: '#f59e0b',
        validationBad: '#ef4444',
      },
      fontFamily: {
        display: ['Outfit', 'Space Grotesk', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        syne: ['Syne', 'sans-serif'],
        ui: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'scan-line': 'scan 2s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.22,1,0.36,1)',
        'slide-out-right': 'slideOutRight 0.25s ease-in',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
      },
      borderColor: {
        DEFAULT: '#1C5C6B33',
      },
    },
  },
  plugins: [],
};

export default config;
