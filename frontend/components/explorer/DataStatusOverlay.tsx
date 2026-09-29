'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSurfaceField, useBackendHealth } from '@/lib/api/queries';
import { AlertCircle } from 'lucide-react';

const HEATMAP_NAMES: Record<string, string> = {
  sst: 'Sea Surface Temp (SST)',
  sss: 'Sea Surface Salinity (SSS)',
  ssh: 'Sea Level Anomaly (SSH)',
  currents: 'Surface Currents',
  winds: 'Surface Winds',
  subsurface_temp: 'Subsurface Temp',
  embedding: 'Deep Embedding Space',
  thermal_anomaly: 'Thermal Anomaly',
};

export function DataStatusOverlay() {
  const { data: health, isError: isHealthError } = useBackendHealth();
  const {
    showSST, showSSS, showSSH, showCurrents, showWinds,
    showSubsurfaceTemp, showEmbedding, showThermalAnomaly,
    selectedDate, selectedDepth
  } = useExplorerStore();
  
  // Resolve any active heatmap
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
  
  const { isError, isLoading, data } = useSurfaceField(queryParams);

  // If backend is sleeping/offline, BackendWakingUpOverlay handles it cleanly
  if (isHealthError || !health || health.status !== 'healthy') {
    return null;
  }

  // Hide if no layer active, or currently loading, or data is valid
  if (!activeVariable || isLoading || (!isError && data && data.grid && data.grid.length > 0)) {
    return null;
  }

  const layerName = HEATMAP_NAMES[activeVariable] || activeVariable.toUpperCase();

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto bg-[#050A10]/95 border border-amber-400/40 rounded-full px-4 py-1.5 backdrop-blur-md flex items-center gap-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.6),0_0_15px_rgba(245,158,11,0.2)] text-foam font-mono text-[11px]"
        >
          <AlertCircle size={13} className="text-amber-400 shrink-0" />
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-amber-300 font-semibold">{layerName}</span>
            <span className="text-white/40">•</span>
            <span className="text-white/80">No data found for <strong>{selectedDate}</strong></span>
            {depthParam > 0 && (
              <span className="text-white/40">(@ {depthParam}m)</span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
