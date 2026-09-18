'use client';

import { useEffect, useRef } from 'react';
import { useConsoleStore } from '@/lib/store/useConsoleStore';
import { GlassPanel } from '@/components/shared/GlassPanel';
import { PlaybackControls } from './PlaybackControls';
import { MonoValue } from '@/components/shared/MonoValue';
import { Calendar } from 'lucide-react';

// Demo time range: August 2026 (30 days)
const RANGE_START = new Date('2026-08-01T00:00:00Z');
const RANGE_END = new Date('2026-08-31T23:59:59Z');
const RANGE_MS = RANGE_END.getTime() - RANGE_START.getTime();

// Advance time by this many minutes per second at 1× speed
const MINUTES_PER_SECOND = 60 * 6; // 6 hours / real second at 1×

export function TimelineScrubber() {
  const time = useConsoleStore((s) => s.time);
  const setTime = useConsoleStore((s) => s.setTime);
  const playback = useConsoleStore((s) => s.playback);
  const setPlayback = useConsoleStore((s) => s.setPlayback);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep a stable ref to time so the interval doesn't need to be recreated on every tick
  const timeRef = useRef(time);
  const speedRef = useRef(playback.speed);
  useEffect(() => { timeRef.current = time; }, [time]);
  useEffect(() => { speedRef.current = playback.speed; }, [playback.speed]);

  // Current position as fraction [0, 1]
  const currentMs = new Date(time).getTime() - RANGE_START.getTime();
  const fraction = Math.max(0, Math.min(1, currentMs / RANGE_MS));

  // Format current time for display in IST
  const displayDate = new Date(time).toLocaleDateString('en-IN', {
    month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
  const displayTime = new Date(time).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: false,
  });

  useEffect(() => {
    if (!playback.isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      const current = new Date(timeRef.current).getTime();
      const advance = MINUTES_PER_SECOND * speedRef.current * 1000; // ms
      const next = Math.min(current + advance, RANGE_END.getTime());
      if (next >= RANGE_END.getTime()) {
        setPlayback({ isPlaying: false });
        setTime(RANGE_END.toISOString());
      } else {
        setTime(new Date(next).toISOString());
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playback.isPlaying, setTime, setPlayback]);


  return (
    <GlassPanel className="h-full rounded-none border-l-0 border-r-0 border-b-0 bg-deep-panel/95 backdrop-blur-md">
      <div className="flex h-full w-full items-center px-6 gap-4">
        {/* Date display */}
        <div className="flex items-center gap-2 shrink-0">
          <Calendar size={14} className="text-foam-dim" aria-hidden="true" />
          <div className="flex flex-col leading-none gap-0.5">
            <MonoValue value={displayDate} size="xs" color="foam" />
            <MonoValue value={displayTime} unit="IST" size="xs" color="dim" />
          </div>
        </div>

        {/* Range labels */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <span className="font-mono text-[0.6rem] text-foam-dim/50 uppercase tracking-widest">
            {RANGE_START.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' })}
          </span>
        </div>

        {/* Scrubber */}
        <div className="flex-1 relative h-full flex items-center group cursor-pointer" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const f = (e.clientX - rect.left) / rect.width;
            const newTime = new Date(RANGE_START.getTime() + f * RANGE_MS);
            setTime(newTime.toISOString());
        }}>
          {/* Track background */}
          <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded bg-thermocline/20 pointer-events-none" />
          
          {/* Active window highlight */}
          <div
            className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded bg-biolume shadow-[0_0_8px_rgba(76,224,210,0.4)] pointer-events-none transition-all duration-100 ease-linear"
            style={{ width: `${fraction * 100}%` }}
            aria-hidden="true"
          />
          
          {/* Thumb */}
          <div 
            className="absolute top-1/2 w-3 h-3 -translate-y-1/2 -translate-x-1/2 bg-biolume rounded-full shadow-[0_0_10px_rgba(76,224,210,0.8)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ left: `${fraction * 100}%` }}
          />
        </div>

        {/* End date */}
        <div className="flex items-center gap-1 shrink-0 mr-2">
          <span className="font-mono text-[0.6rem] text-foam-dim/50 uppercase tracking-widest">
            {RANGE_END.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' })}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-thermocline/25 shrink-0 mx-2" />

        {/* Playback controls */}
        <PlaybackControls />

        {/* Demo badge */}
        <div className="shrink-0 hidden lg:flex flex-col items-end">
          <span className="font-mono text-[0.55rem] text-foam-dim/40 tracking-[0.2em] uppercase">
            SIMULATION
          </span>
          <span className="font-mono text-xs text-foam-dim/60 tracking-widest uppercase">
            AUG 2026
          </span>
        </div>
      </div>
    </GlassPanel>
  );
}
