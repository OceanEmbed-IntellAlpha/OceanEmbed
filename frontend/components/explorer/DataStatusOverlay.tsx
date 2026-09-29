'use client';

import React from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSurfaceField, useBackendHealth } from '@/lib/api/queries';
import { AlertCircle } from 'lucide-react';

export function DataStatusOverlay() {
  const { data: health, isError: isHealthError } = useBackendHealth();
  const selectedDate = useExplorerStore((s) => s.selectedDate);
  const showSubsurfaceTemp = useExplorerStore((s) => s.showSubsurfaceTemp);
  const showSST = useExplorerStore((s) => s.showSST);
  const showSSS = useExplorerStore((s) => s.showSSS);
  
  let activeVariable: 'sst' | 'sss' | null = null;
  if (showSubsurfaceTemp || showSST) activeVariable = 'sst';
  else if (showSSS) activeVariable = 'sss';

  const queryParams = activeVariable ? { variable: activeVariable, date: selectedDate } : null;
  
  const { isError, isLoading, data } = useSurfaceField(queryParams);

  // If backend is sleeping/offline, BackendWakingUpOverlay handles it cleanly
  if (isHealthError || !health || health.status !== 'healthy') {
    return null;
  }

  if (isLoading || (!isError && data)) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[100]">
      <div className="bg-black/80 backdrop-blur-md border border-red-500/50 rounded-xl p-6 flex flex-col items-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
        <AlertCircle className="text-red-500 mb-3" size={32} />
        <h2 className="text-red-400 font-mono text-lg uppercase tracking-widest font-bold mb-1">Data Not Available</h2>
        <p className="text-foam-dim font-mono text-xs">
          No {activeVariable?.toUpperCase()} data found for <strong>{selectedDate}</strong>.
        </p>
      </div>
    </div>
  );
}
