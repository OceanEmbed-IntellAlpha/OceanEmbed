'use client';

import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { MonoValue } from '@/components/shared/MonoValue';

export function DepthReadout() {
  const depth = useExplorerStore((s) => s.selectedDepth);
  const variable = 'temperature';
  
  const isLoading = false;
  
  // Get a representative value from the field center (mocked for preview)
  const centerValue = depth === 0 ? 28.6 : 28.6 - (depth / 100);

  const unit = variable === 'temperature' ? '°C' : variable === 'salinity' ? 'PSU' : 'm/s';
  const varLabel = variable === 'temperature' ? 'T' : variable === 'salinity' ? 'S' : 'U';

  return (
    <div className="w-full flex flex-col items-center mt-auto">
      <div className="w-full relative overflow-hidden bg-abyss/80 border border-biolume/20 rounded-[3px] shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] p-1.5 flex flex-col gap-1.5">
        
        {/* Subtle scanline overlay for the readout screen */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(76,224,210,0.2) 1px, rgba(76,224,210,0.2) 2px)' }} />

        {/* Depth value */}
        <div className="relative flex flex-col items-center">
          <span className="font-mono text-[0.4rem] text-biolume/60 mb-0.5 tracking-[0.2em]">DEPTH</span>
          <MonoValue
            value={depth === 0 ? '0' : depth.toFixed(0)}
            unit="m"
            size="sm"
            color={depth === 0 ? 'biolume' : depth < 500 ? 'amber' : 'coral'}
            aria-label={`Depth: ${depth} meters`}
          />
        </div>

        {/* Field value at depth */}
        {centerValue !== null && (
          <>
            <div className="w-full h-px bg-biolume/10" />
            <div className="relative flex flex-col items-center">
              <span className="font-mono text-[0.4rem] text-biolume/60 mb-0.5 tracking-[0.2em] uppercase">{varLabel} FIELD</span>
              <MonoValue
                value={centerValue.toFixed(1)}
                unit={unit}
                size="xs"
                color="foam"
                loading={isLoading}
                aria-label={`${variable} at depth: ${centerValue?.toFixed(1)} ${unit}`}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
