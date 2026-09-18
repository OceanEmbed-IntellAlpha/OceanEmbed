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
        // OceanRoot design tokens
        abyss: '#050B14',
        'deep-panel': '#0B1D2E',
        thermocline: '#1C5C6B',
        biolume: '#00D2FF',
        'instrument-amber': '#E8A33D',
        'coral-delta': '#FF6B5B',
        foam: '#E9F1F3',
        'foam-dim': '#8FA5AC',
        reconstruction: '#F59E0B',
        argoObs: '#34D399',
        surfaceSignal: '#38BDF8',
        embeddingPurple: '#00D2FF',
        validationGood: '#10B981',
        validationWarn: '#F59E0B',
        validationBad: '#EF4444',
      },
      fontFamily: {
        display: ['Syne', 'Space Grotesk', 'sans-serif'],
        ui: ['Syne', 'Inter', 'sans-serif'],
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
