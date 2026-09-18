'use client';

import { useConsoleStore } from '@/lib/store/useConsoleStore';
import { Eye, EyeOff, Thermometer, Droplets, Wind } from 'lucide-react';
import { Switch } from '@/components/shared/Switch';

export function VariableSelect() {
  const variable = useConsoleStore((s) => s.variable);
  const setVariable = useConsoleStore((s) => s.setVariable);
  const isModelFieldVisible = useConsoleStore((s) => s.isModelFieldVisible);
  const toggleModelFieldVisibility = useConsoleStore((s) => s.toggleModelFieldVisibility);
  const showCurrents = useConsoleStore((s) => s.showCurrents);
  const toggleCurrents = useConsoleStore((s) => s.toggleCurrents);
  const applyMLCorrection = useConsoleStore((s) => s.applyMLCorrection);
  const toggleMLCorrection = useConsoleStore((s) => s.toggleMLCorrection);

  return (
    <div className="flex flex-col gap-4">
      {/* ── BASE FIELD CARD ─────────────────────────────────────────────────── */}
      <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-ui text-xs font-semibold text-white/90">
            Base Field
          </h3>
          <button
            onClick={toggleModelFieldVisibility}
            className={`
              flex items-center justify-center p-1.5 rounded-md transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-biolume/50
              ${isModelFieldVisible 
                ? 'bg-biolume/10 text-biolume hover:bg-biolume/20' 
                : 'bg-black/30 text-foam-dim/50 hover:text-white'}
            `}
            aria-label={isModelFieldVisible ? 'Hide Base Field' : 'Show Base Field'}
            title={isModelFieldVisible ? 'Hide Base Field' : 'Show Base Field'}
          >
            {isModelFieldVisible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>

        {/* macOS-style Segmented Control */}
        <div 
          role="radiogroup" 
          aria-label="Select base scalar field"
          className={`
            relative flex p-1 bg-black/40 rounded-lg border border-white/[0.04] transition-opacity duration-300 shadow-inner
            ${isModelFieldVisible ? 'opacity-100' : 'opacity-40 pointer-events-none'}
          `}
        >
          {/* Active Pill Background */}
          <div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-md shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] border border-white/10"
            style={{ 
              left: variable === 'temperature' ? '4px' : 'calc(50%)',
            }}
          />
          
          <button
            role="radio"
            aria-checked={variable === 'temperature'}
            onClick={() => setVariable('temperature')}
            className={`
              relative z-10 flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors duration-200 focus:outline-none
              ${variable === 'temperature' ? 'text-white' : 'text-foam-dim hover:text-white/80'}
            `}
          >
            <Thermometer size={14} className={variable === 'temperature' ? 'text-[#f8943c]' : 'opacity-60'} />
            <span className="font-ui text-xs font-medium">Temperature</span>
          </button>
          
          <button
            role="radio"
            aria-checked={variable === 'salinity'}
            onClick={() => setVariable('salinity')}
            className={`
              relative z-10 flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors duration-200 focus:outline-none
              ${variable === 'salinity' ? 'text-white' : 'text-foam-dim hover:text-white/80'}
            `}
          >
            <Droplets size={14} className={variable === 'salinity' ? 'text-[#a87ee0]' : 'opacity-60'} />
            <span className="font-ui text-xs font-medium">Salinity</span>
          </button>
        </div>

        {/* ML Correction Toggle (Only for Temperature) */}
        {variable === 'temperature' && (
          <div
            role="button"
            tabIndex={0}
            onClick={toggleMLCorrection}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleMLCorrection()}
            className={`
              w-full flex items-center justify-between group focus:outline-none cursor-pointer 
              mt-2 p-2.5 rounded-lg border transition-all duration-300
              ${isModelFieldVisible ? 'opacity-100' : 'opacity-40 pointer-events-none'}
              ${applyMLCorrection 
                ? 'bg-gradient-to-r from-[#f8943c]/10 to-transparent border-[#f8943c]/30 shadow-[inset_0_0_12px_rgba(248,148,60,0.1)]' 
                : 'bg-black/20 border-white/[0.04] hover:bg-white/[0.08]'
              }
            `}
            aria-pressed={applyMLCorrection}
          >
            <div className="flex items-center gap-2">
              <span className={`
                font-ui text-xs transition-all duration-300 flex items-center gap-1.5
                ${applyMLCorrection 
                  ? 'bg-gradient-to-r from-[#f8943c] to-[#ffb370] bg-clip-text text-transparent font-bold tracking-wide drop-shadow-[0_0_8px_rgba(248,148,60,0.4)]' 
                  : 'text-foam-dim group-hover:text-white'
                }
              `}>
                <span className={applyMLCorrection ? 'text-[#f8943c] drop-shadow-[0_0_4px_rgba(248,148,60,0.8)]' : 'opacity-50'}>✨</span> ML Enhanced
              </span>
            </div>
            <Switch checked={applyMLCorrection} onChange={toggleMLCorrection} />
          </div>
        )}
      </section>

      {/* ── OVERLAYS CARD ───────────────────────────────────────────────────── */}
      <section className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3 shadow-sm">
        <h3 className="font-ui text-xs font-semibold text-white/90">
          Overlays
        </h3>
        
        <div
          role="button"
          tabIndex={0}
          onClick={toggleCurrents}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleCurrents()}
          className="w-full flex items-center justify-between group focus:outline-none cursor-pointer"
          aria-pressed={showCurrents}
        >
          <div className="flex items-center gap-3">
            <div className={`
              flex items-center justify-center w-7 h-7 rounded-lg transition-colors border
              ${showCurrents ? 'bg-biolume/10 border-biolume/30 text-biolume' : 'bg-black/20 border-white/5 text-foam-dim group-hover:bg-white/5 group-hover:text-white'}
            `}>
              <Wind size={14} />
            </div>
            <span className={`font-ui text-sm transition-colors ${showCurrents ? 'text-white font-medium' : 'text-foam-dim group-hover:text-white'}`}>
              Currents
            </span>
          </div>
          
          <Switch checked={showCurrents} onChange={toggleCurrents} />
        </div>
      </section>
    </div>
  );
}
