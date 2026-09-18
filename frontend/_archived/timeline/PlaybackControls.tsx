'use client';

import { useConsoleStore } from '@/lib/store/useConsoleStore';
import { Play, Pause } from 'lucide-react';

const SPEEDS = [0.5, 1, 2];

export function PlaybackControls() {
  const playback = useConsoleStore((s) => s.playback);
  const setPlayback = useConsoleStore((s) => s.setPlayback);

  const togglePlay = () => setPlayback({ isPlaying: !playback.isPlaying });
  const setSpeed = (speed: number) => setPlayback({ speed });

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Playback controls">
      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        className="
          w-8 h-8 flex items-center justify-center rounded
          border border-thermocline/35 text-foam-dim
          hover:text-biolume hover:border-biolume/40
          focus:outline-none focus:ring-2 focus:ring-biolume/40
          transition-colors
        "
        aria-label={playback.isPlaying ? 'Pause playback' : 'Play timeline'}
        aria-pressed={playback.isPlaying}
      >
        {playback.isPlaying
          ? <Pause size={14} aria-hidden="true" />
          : <Play size={14} aria-hidden="true" />
        }
      </button>

      {/* Speed selector */}
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={playback.speed === s}
            onClick={() => setSpeed(s)}
            className={`
              px-1.5 py-0.5 rounded font-mono text-2xs border transition-colors
              focus:outline-none focus:ring-2 focus:ring-biolume/40
              ${playback.speed === s
                ? 'bg-biolume/15 border-biolume/40 text-biolume'
                : 'border-thermocline/25 text-foam-dim hover:text-foam hover:border-thermocline/50'
              }
            `}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
