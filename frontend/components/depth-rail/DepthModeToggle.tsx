'use client';

import { useExplorerStore } from '@/lib/store/useExplorerStore';
import type { ExplorerMode } from '@/lib/api/types';

const MODES: { id: ExplorerMode; label: string; depth: string; desc: string }[] = [
  { id: 'surface', label: 'SFC', depth: '0 m', desc: 'Surface — SST, surface field, flat markers' },
  { id: 'profile', label: 'PRF', depth: '~500 m', desc: 'Profile — vertical depth slice' },
  { id: 'dive', label: 'DIV', depth: '>1000 m', desc: 'Dive — below-surface camera with fog' },
];

interface DepthModeToggleProps {
  onModeChange?: (mode: ExplorerMode) => void;
}

export function DepthModeToggle({ onModeChange }: DepthModeToggleProps) {
  const mode = useExplorerStore((s) => s.mode);
  const setMode = useExplorerStore((s) => s.setMode);

  const handleChange = (m: ExplorerMode) => {
    setMode(m);
    onModeChange?.(m);
  };

  return (
    <div
      className="flex flex-col gap-1"
      role="radiogroup"
      aria-label="Depth visualization mode"
    >
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            role="radio"
            aria-checked={active}
            onClick={() => handleChange(m.id)}
            title={m.desc}
            aria-label={m.desc}
            className={`
              relative flex flex-col items-center justify-center
              w-12 h-7 rounded text-center
              border transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-biolume/50
              ${active
                ? 'bg-deep-panel border-biolume/50 text-biolume shadow-[inset_2px_0_0_var(--biolume),0_0_8px_rgba(76,224,210,0.2)]'
                : 'bg-transparent border-thermocline/25 text-foam-dim hover:text-foam hover:border-thermocline/50 hover:bg-thermocline/10'
              }
            `}
          >
            <span className="font-mono text-[0.6rem] tracking-widest font-medium">
              {m.label}
            </span>
            {active && (
              <span
                className="absolute right-1 top-1 w-1 h-1 rounded-full bg-biolume animate-pulse-slow"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
