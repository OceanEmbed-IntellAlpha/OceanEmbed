'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { VariableSelect } from './VariableSelect';
import { ObservationToggles } from './ObservationToggles';
import { ColormapControl } from './ColormapControl';

export function LayersPanel() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div 
      className={`
        absolute left-0 top-0 bottom-0 py-4 pl-4 pointer-events-none flex items-center z-40
        transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
        ${collapsed ? '-translate-x-[100%]' : 'translate-x-0'}
      `}
    >
      <div className="relative w-[300px] h-full flex flex-col pointer-events-auto bg-[#0A0F15]/90 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 border border-white/10 shadow-inner">
            <Layers size={14} className="text-foam" aria-hidden="true" />
          </div>
          <span className="font-ui text-sm font-semibold text-white tracking-wide">
            Layers & Data
          </span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden console-scroll px-4 py-5 flex flex-col gap-5">
          <VariableSelect />
          <ObservationToggles />
          <ColormapControl />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-[#0A0F15] shrink-0 flex items-center justify-between">
          <span className="font-ui text-[0.65rem] font-medium text-foam-dim/60 uppercase tracking-wider">
            Data Source
          </span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="font-mono text-[0.65rem] text-white">INCOIS</span>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={`
          absolute -right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-auto
          w-5 h-14 flex items-center justify-center
          bg-[#151B23]/95 backdrop-blur-md border border-white/10 border-l-0 rounded-r-lg
          text-foam-dim hover:text-white hover:bg-[#1A222C] transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-biolume/50
          shadow-[4px_0_12px_rgba(0,0,0,0.4)]
        `}
        aria-label={collapsed ? 'Expand layers panel' : 'Collapse layers panel'}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
}
