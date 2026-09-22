'use client';

import { useConsoleStore } from '@/lib/store/useConsoleStore';
import type { ObservationType } from '@/lib/api/types';
import { Switch } from '@/components/shared/Switch';
import { Anchor, Navigation } from 'lucide-react';

const OBSERVATION_TYPES: { id: ObservationType; label: string; icon: React.ReactNode; activeClass: string }[] = [
  { id: 'argo', label: 'Argo Floats', icon: <Anchor size={13} />, activeClass: 'text-biolume bg-biolume/10 border-biolume/30' },
  { id: 'glider', label: 'Gliders', icon: <Navigation size={13} />, activeClass: 'text-instrument-amber bg-instrument-amber/10 border-instrument-amber/30' },
];

export function ObservationToggles() {
  const activeTypes = useConsoleStore((s) => s.activeObservationTypes);
  const toggleType = useConsoleStore((s) => s.toggleObservationType);

  return null;
  
  return (
    <section 
      role="group" 
      aria-label="Observation type filters"
      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col shadow-sm"
    >
      <h3 className="font-ui text-xs font-semibold text-white/90 mb-3">
        Observations
      </h3>
      
      <div className="flex flex-col">
        {OBSERVATION_TYPES.map((type, index) => {
          const active = activeTypes.has(type.id);
          const isLast = index === OBSERVATION_TYPES.length - 1;
          
          return (
            <div key={type.id} className="flex flex-col">
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleType(type.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleType(type.id)}
                className="w-full flex items-center justify-between py-2.5 group focus:outline-none cursor-pointer"
                aria-pressed={active}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    flex items-center justify-center w-7 h-7 rounded-lg transition-colors border
                    ${active ? type.activeClass : 'bg-black/20 border-white/5 text-foam-dim group-hover:bg-white/5 group-hover:text-white'}
                  `}>
                    {type.icon}
                  </div>
                  <span className={`font-ui text-sm transition-colors ${active ? 'text-white font-medium' : 'text-foam-dim group-hover:text-white'}`}>
                    {type.label}
                  </span>
                </div>
                
                <Switch 
                  checked={active} 
                  onChange={() => toggleType(type.id)} 
                  activeColor={type.id === 'glider' ? 'bg-instrument-amber' : 'bg-biolume'}
                />
              </div>
              
              {!isLast && (
                <div className="w-full h-px bg-white/[0.04] my-0.5 ml-10" role="separator" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
