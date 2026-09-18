'use client';

import { Anchor } from 'lucide-react';
import { useConsoleStore } from '@/lib/store/useConsoleStore';

interface DiveReplayButtonProps {
  onReplay: () => void;
}

export function DiveReplayButton({ onReplay }: DiveReplayButtonProps) {
  const mode = useConsoleStore((s) => s.mode);
  const isDiving = mode === 'dive';

  return (
    <button
      onClick={onReplay}
      disabled={isDiving}
      className={`
        w-full flex items-center justify-center gap-2
        px-3 py-2 rounded border
        font-mono text-xs tracking-widest uppercase
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-biolume/40
        ${isDiving
          ? 'bg-coral-delta/10 border-coral-delta/40 text-coral-delta cursor-not-allowed animate-pulse'
          : 'bg-biolume/10 border-biolume/35 text-biolume hover:bg-biolume/20 hover:border-biolume/60 hover:biolume-glow'
        }
      `}
      aria-label={isDiving ? 'Dive replay in progress' : 'Replay float dive profile'}
      aria-busy={isDiving}
    >
      <Anchor size={13} aria-hidden="true" />
      <span>{isDiving ? 'DEPTH VIEW ACTIVE' : 'DEPTH VIEW'}</span>
    </button>
  );
}
