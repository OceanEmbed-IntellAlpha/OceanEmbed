'use client';

import { useCallback } from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import * as Slider from '@radix-ui/react-slider';
import { GlassPanel } from '@/components/shared/GlassPanel';
import { DepthReadout } from './DepthReadout';
import type { ExplorerMode, DepthLevel } from '@/lib/api/types';
import { DEPTH_LEVELS } from '@/lib/api/types';

const MAX_DEPTH = 2000;
const DEPTH_MARKS = [0, 100, 200, 500, 1000, 1500, 2000];

interface DepthRailProps {
  onModeChange?: (mode: ExplorerMode) => void;
}

/**
 * DepthRail — the signature element.
 * Persistent vertical control combining:
 * - A vertical depth slider using Radix UI for premium feel
 * - Surface/Cutaway/Dive mode detents
 * - Live depth and variable readout
 */
export function DepthRail({ onModeChange }: DepthRailProps) {
  const depth = useExplorerStore((s) => s.selectedDepth);
  const setDepth = useExplorerStore((s) => s.setDepth);
  const setMode = useExplorerStore((s) => s.setMode);

  const handleSliderChange = useCallback(
    (values: number[]) => {
      const newDepth = values[0];
      const closest = DEPTH_LEVELS.reduce((prev, curr) => 
        Math.abs(curr - newDepth) < Math.abs(prev - newDepth) ? curr : prev
      );
      setDepth(closest);

      // Auto-update mode based on depth
      if (closest === 0) {
        setMode('surface');
        onModeChange?.('surface');
      } else if (closest <= 500) {
        setMode('profile');
        onModeChange?.('profile');
      } else {
        setMode('dive');
        onModeChange?.('dive');
      }
    },
    [setDepth, setMode, onModeChange]
  );

  // Depth gradient color at current depth
  const depthPercent = depth / MAX_DEPTH;
  const thumbColor =
    depthPercent === 0
      ? 'var(--biolume)'
      : depthPercent < 0.25
      ? 'var(--instrument-amber)'
      : 'var(--coral-delta)';

  return (
    <GlassPanel className="flex flex-col items-center py-3 px-2 gap-3 h-full w-16">
      {/* Rail label */}
      <div className="flex flex-col items-center">
        <span className="label-ui text-[0.55rem] tracking-[0.15em]">DEPTH</span>
        <span className="label-ui text-[0.55rem] tracking-[0.15em]">RAIL</span>
      </div>

      {/* Mode toggle (Surface / Cutaway / Dive) removed for a cleaner HUD */}

      {/* Depth gradient + slider */}
      <div className="flex-1 relative w-full min-h-[120px] my-2">
        
        {/* Mode Zone Brackets */}
        <div className="absolute inset-y-2 right-1 w-2 flex flex-col pointer-events-none">
          {/* Surface Zone (0-50) */}
          <div className={`h-[5%] border-r-2 border-y-2 rounded-r-[2px] transition-colors duration-300 ${depthPercent === 0 ? 'border-biolume shadow-[2px_0_8px_rgba(76,224,210,0.4)]' : 'border-thermocline/30'}`} />
          {/* Cutaway Zone (50-500) */}
          <div className={`h-[20%] border-r-2 border-b-2 rounded-br-[2px] transition-colors duration-300 ${depthPercent > 0 && depthPercent <= 0.25 ? 'border-biolume shadow-[2px_0_8px_rgba(76,224,210,0.4)]' : 'border-thermocline/30'}`} />
          {/* Dive Zone (500-2000) */}
          <div className={`flex-1 border-r-2 border-b-2 rounded-br-[2px] transition-colors duration-300 ${depthPercent > 0.25 ? 'border-coral-delta shadow-[2px_0_8px_rgba(255,107,91,0.4)]' : 'border-thermocline/30'}`} />
        </div>

        {/* Depth gradient line */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[2px] rounded-full depth-gradient opacity-60 inset-y-2 pointer-events-none"
          aria-hidden="true"
        />

        {/* Depth marks - correctly positioned by percentages */}
        <div className="absolute left-3 right-0 inset-y-2 pointer-events-none">
          {DEPTH_MARKS.map((mark) => {
            const percent = (mark / MAX_DEPTH) * 100;
            const isMajor = mark === 0 || mark === 500 || mark === 2000;
            return (
              <div 
                key={mark} 
                className="absolute left-0 flex items-center justify-start gap-1 w-full -translate-y-1/2"
                style={{ top: `${percent}%` }}
              >
                <div className={`${isMajor ? 'w-2 bg-thermocline/80' : 'w-1 bg-thermocline/30'} h-px`} />
                {isMajor && (
                  <span className="font-mono text-[0.5rem] text-foam-dim/60 leading-none">
                    {mark === 0 ? 'SFC' : mark}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Vertical range slider using Radix */}
        <Slider.Root
          className="absolute inset-y-2 left-0 right-0 flex justify-center touch-none select-none group z-10"
          orientation="vertical"
          dir="ltr"
          value={[depth]}
          max={MAX_DEPTH}
          step={10}
          onValueChange={handleSliderChange}
          inverted={true}
          aria-label={`Depth: ${depth === 0 ? 'surface' : depth + ' meters'}`}
        >
          <Slider.Track className="relative w-full h-full bg-transparent">
            {/* We don't need a visible fill range for an altimeter */}
          </Slider.Track>
          <Slider.Thumb 
            className="block w-full h-0.5 cursor-grab active:cursor-grabbing focus:outline-none relative"
          >
            {/* Precision Reticle Thumb */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-3 border border-biolume/50 bg-deep-panel/80 flex items-center justify-center transition-all group-active:border-biolume group-active:shadow-[0_0_12px_rgba(76,224,210,0.5)]"
              style={{ borderColor: thumbColor }}
            >
              <div className="w-full h-px" style={{ backgroundColor: thumbColor, boxShadow: `0 0 5px ${thumbColor}` }} />
            </div>
          </Slider.Thumb>
        </Slider.Root>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-thermocline/25" />

      {/* Depth + variable readout */}
      <DepthReadout />
    </GlassPanel>
  );
}
