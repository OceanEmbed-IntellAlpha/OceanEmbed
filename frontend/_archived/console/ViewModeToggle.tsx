'use client';

import { useConsoleStore } from '@/lib/store/useConsoleStore';
import { GlassPanel } from '@/components/shared/GlassPanel';
import { Globe, Layers, Waves } from 'lucide-react';
import type { Mode } from '@/lib/api/types';

interface ViewModeToggleProps {
  onModeChange?: (mode: Mode) => void;
}

export function ViewModeToggle({ onModeChange }: ViewModeToggleProps) {
  const mode = useConsoleStore((s) => s.mode);
  const setMode = useConsoleStore((s) => s.setMode);

  const handleToggle = (newMode: Mode) => {
    setMode(newMode);
    onModeChange?.(newMode);
  };

  return (
    <GlassPanel className="p-2 flex flex-col gap-2 pointer-events-auto w-48">
      <button
        onClick={() => handleToggle('surface')}
        className={`
          flex items-center justify-start gap-3 px-4 py-3 rounded text-xs font-mono tracking-widest uppercase transition-all
          ${mode === 'surface' 
            ? 'bg-biolume/10 text-biolume border border-biolume/30 shadow-[inset_2px_0_0_var(--biolume)]' 
            : 'text-foam-dim hover:text-foam hover:bg-thermocline/10 border border-transparent'}
        `}
      >
        <Globe size={16} className={mode === 'surface' ? 'text-biolume' : 'text-foam-dim'} />
        Globe
      </button>

      <button
        onClick={() => handleToggle('cutaway')}
        className={`
          flex items-center justify-start gap-3 px-4 py-3 rounded text-xs font-mono tracking-widest uppercase transition-all
          ${mode === 'cutaway'
            ? 'bg-biolume/10 text-biolume border border-biolume/30 shadow-[inset_2px_0_0_var(--biolume)]' 
            : 'text-foam-dim hover:text-foam hover:bg-thermocline/10 border border-transparent'}
        `}
      >
        <Layers size={16} className={mode === 'cutaway' ? 'text-biolume' : 'text-foam-dim'} />
        Cutaway
      </button>

      <button
        onClick={() => handleToggle('dive')}
        className={`
          flex items-center justify-start gap-3 px-4 py-3 rounded text-xs font-mono tracking-widest uppercase transition-all
          ${mode === 'dive'
            ? 'bg-biolume/10 text-biolume border border-biolume/30 shadow-[inset_2px_0_0_var(--biolume)]' 
            : 'text-foam-dim hover:text-foam hover:bg-thermocline/10 border border-transparent'}
        `}
      >
        <Waves size={16} className={mode === 'dive' ? 'text-biolume' : 'text-foam-dim'} />
        Dive View
      </button>
    </GlassPanel>
  );
}
