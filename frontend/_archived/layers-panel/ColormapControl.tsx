'use client';

import { useConsoleStore } from '@/lib/store/useConsoleStore';
import { colormapToGradient } from '@/lib/cesium/colormaps';
import type { ColormapName } from '@/lib/cesium/colormaps';

export function ColormapControl() {
  const colormap = useConsoleStore((s) => s.colormap);
  const setColormap = useConsoleStore((s) => s.setColormap);

  const currentGradient = colormapToGradient(colormap.name as ColormapName);

  return (
    <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-5 shadow-sm">
      <h3 className="font-ui text-xs font-semibold text-white/90">
        Appearance
      </h3>

      {/* Range display */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-ui text-[0.7rem] font-medium text-foam-dim/80">Color Scale</span>
          <span className="font-mono text-[0.6rem] text-white/90 uppercase bg-black/40 px-1.5 py-0.5 rounded border border-white/10 shadow-inner">
            {colormap.name}
          </span>
        </div>
        
        {/* Gradient Track */}
        <div className="relative h-2 w-full rounded-full overflow-hidden shadow-inner border border-white/[0.08] mt-1">
          <div
            className="absolute inset-0"
            style={{ background: currentGradient }}
            aria-hidden="true"
          />
        </div>
        
        <div className="flex justify-between">
          <span className="font-mono text-[0.65rem] text-foam-dim/60 font-medium">{colormap.min.toFixed(1)}</span>
          <span className="font-mono text-[0.65rem] text-foam-dim/60 font-medium">{colormap.max.toFixed(1)}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-white/[0.04]" role="separator" />

      {/* Opacity */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-ui text-[0.7rem] font-medium text-foam-dim/80">Opacity</span>
          <span className="font-mono text-[0.65rem] text-white/90">{Math.round(colormap.opacity * 100)}%</span>
        </div>
        
        <div className="relative flex items-center h-4 group">
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={colormap.opacity}
            onChange={(e) => setColormap({ opacity: parseFloat(e.target.value) })}
            className="absolute z-10 w-full h-full opacity-0 cursor-pointer"
            aria-label={`Field opacity: ${Math.round(colormap.opacity * 100)}%`}
          />
          {/* Track */}
          <div className="w-full h-1.5 bg-black/40 border border-white/5 rounded-full overflow-hidden shadow-inner relative">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-white/70 transition-all duration-75" 
              style={{ width: `${colormap.opacity * 100}%` }}
            />
          </div>
          {/* Thumb */}
          <div 
            className="absolute h-4 w-4 bg-white rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.5)] border border-black/10 pointer-events-none transition-transform duration-75 scale-90 group-hover:scale-110 flex items-center justify-center"
            style={{ left: `calc(${colormap.opacity * 100}% - 8px)` }}
          >
            <div className="w-1.5 h-1.5 bg-black/20 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
