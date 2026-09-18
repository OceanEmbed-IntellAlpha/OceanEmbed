'use client';

import React from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { DEPTH_LEVELS } from '@/lib/api/types';
import * as Slider from '@radix-ui/react-slider';
import { Play, Pause } from 'lucide-react';

export function DateDepthBar() {
  const { selectedDepth, setDepth, selectedDate, setDate, isPlaying, setPlayback, playSpeed } = useExplorerStore();

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        setDate(d.toISOString().split('T')[0]);
      }, 1000 / playSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, selectedDate, playSpeed, setDate]);

  const handleDepthChange = (val: number[]) => {
    // Find closest valid depth
    const target = val[0];
    const closest = DEPTH_LEVELS.reduce((prev, curr) => 
      Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
    );
    setDepth(closest);
  };

  return (
    <div className="h-16 bg-[#050A10]/80 backdrop-blur-2xl border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] flex items-center px-6 gap-8 relative z-50">
      
      {/* Time Controls */}
      <div className="flex items-center gap-4 border-r border-white/10 pr-8">
        <button 
          className="w-8 h-8 rounded-full bg-biolume/10 hover:bg-biolume/20 text-biolume flex items-center justify-center transition-colors border border-biolume/30 shadow-[0_0_15px_rgba(0,210,255,0.15)]"
          onClick={() => setPlayback(!isPlaying)}
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-1" />}
        </button>
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-foam-dim uppercase tracking-[0.1em]">Selected Date</span>
          <span className="text-sm font-mono text-white font-bold tracking-wider">{selectedDate}</span>
        </div>
      </div>

      {/* Depth Slider */}
      <div className="flex-grow flex items-center gap-6">
        <div className="flex flex-col w-20">
          <span className="text-[10px] font-mono text-foam-dim uppercase tracking-[0.1em]">Depth Level</span>
          <span className="text-sm font-mono text-instrument-amber font-bold tracking-wider">{selectedDepth}m</span>
        </div>

        <div className="flex-grow flex flex-col relative h-8 justify-center group">
          <Slider.Root 
            className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
            value={[selectedDepth]} 
            max={1000} 
            step={1}
            onValueChange={handleDepthChange}
          >
            <Slider.Track className="bg-black/50 border border-white/10 relative grow rounded-full h-2 overflow-hidden shadow-inner">
              <Slider.Range className="absolute bg-biolume h-full drop-shadow-[0_0_5px_rgba(0,210,255,0.8)]" />
            </Slider.Track>
            <Slider.Thumb 
              className="block w-4 h-4 bg-white border-2 border-biolume shadow-[0_0_12px_rgba(0,210,255,0.8)] rounded-full focus:outline-none focus-visible:ring focus-visible:ring-biolume/50 transition-transform hover:scale-125 cursor-grab active:cursor-grabbing" 
              aria-label="Depth" 
            />
          </Slider.Root>
          
          {/* Tick marks */}
          <div className="absolute top-6 left-0 right-0 flex justify-between pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
            {[0, 200, 500, 1000].map(d => (
              <span key={d} className="absolute text-[9px] font-mono text-foam-dim transform -translate-x-1/2" style={{ left: `${(d/1000)*100}%` }}>
                {d}m
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
