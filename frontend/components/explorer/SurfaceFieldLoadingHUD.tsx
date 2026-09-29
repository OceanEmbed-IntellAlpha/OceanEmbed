'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSurfaceField } from '@/lib/api/queries';
import { Cloud } from 'lucide-react';

const HEATMAP_SHORT_NAMES: Record<string, string> = {
  sst: 'SST',
  sss: 'SSS',
  ssh: 'SSH',
  currents: 'CURRENTS',
  winds: 'WINDS',
  subsurface_temp: 'TEMP',
  embedding: 'EMBEDDING',
  thermal_anomaly: 'ANOMALY',
};

export function SurfaceFieldLoadingHUD() {
  const {
    showSST, showSSS, showSSH, showCurrents, showWinds,
    showSubsurfaceTemp, showEmbedding, showThermalAnomaly,
    selectedDate, selectedDepth
  } = useExplorerStore();

  let activeVariable: string | null = null;
  if (showSST) activeVariable = 'sst';
  else if (showSSS) activeVariable = 'sss';
  else if (showSSH) activeVariable = 'ssh';
  else if (showCurrents) activeVariable = 'currents';
  else if (showWinds) activeVariable = 'winds';
  else if (showSubsurfaceTemp) activeVariable = 'subsurface_temp';
  else if (showEmbedding) activeVariable = 'embedding';
  else if (showThermalAnomaly) activeVariable = 'thermal_anomaly';

  const depthParam = (activeVariable === 'subsurface_temp' || activeVariable === 'thermal_anomaly') ? selectedDepth : 0;
  const queryParams = activeVariable ? { variable: activeVariable as any, date: selectedDate, depth: depthParam } : null;
  const { isFetching } = useSurfaceField(queryParams);

  if (!activeVariable) return null;

  const shortName = HEATMAP_SHORT_NAMES[activeVariable] || activeVariable.toUpperCase();

  return (
    <AnimatePresence>
      {isFetching && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] pointer-events-none"
        >
          <div className="bg-[#050A10]/90 border border-cyan-400/40 rounded-full px-4 py-1.5 backdrop-blur-md flex items-center gap-2.5 shadow-[0_0_20px_rgba(0,210,255,0.3)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
            </span>

            <div className="flex items-center gap-1.5 font-mono text-[11px] text-white tracking-wider uppercase">
              <Cloud size={13} className="text-cyan-400" />
              <span>Streaming R2</span>
              <span className="text-cyan-300 font-bold">[{shortName} • {selectedDate}{depthParam > 0 ? ` @ ${depthParam}m` : ''}]</span>
            </div>

            <div className="h-3 w-px bg-white/20" />

            <span className="text-[10px] font-mono text-zinc-400">
              HTTP Range
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
