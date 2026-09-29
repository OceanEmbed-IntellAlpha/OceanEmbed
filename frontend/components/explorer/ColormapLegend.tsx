'use client';

import React from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSurfaceField } from '@/lib/api/queries';
import { COLORMAPS, ColormapName } from '@/lib/cesium/colormaps';

export function ColormapLegend() {
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
  const { data: field } = useSurfaceField(queryParams);

  if (!field || !activeVariable) return null;

  const [min, max] = field.colorRange && field.colorRange.length === 2 && field.colorRange[1] > field.colorRange[0]
    ? field.colorRange
    : [0.0, 1.0];
  const mid = (min + max) / 2;
  const unit = field.unit;

  const formatVal = (val: number) => {
    if (Math.abs(val) < 0.05) return val.toFixed(3);
    if (Math.abs(val) < 1.0) return val.toFixed(2);
    return val.toFixed(1);
  };
  
  let cmName: ColormapName = 'thermal';
  if (activeVariable === 'sss') cmName = 'haline';
  else if (activeVariable === 'ssh') cmName = 'viridis';
  else if (activeVariable === 'currents') cmName = 'deep';
  else if (activeVariable === 'winds') cmName = 'cividis';
  else if (activeVariable === 'subsurface_temp') cmName = 'thermal';
  else if (activeVariable === 'embedding') cmName = 'viridis';
  else if (activeVariable === 'thermal_anomaly') cmName = 'thermal_anomaly';

  const stops = COLORMAPS[cmName];
  const gradient = `linear-gradient(to right, ${stops.map(c => `rgb(${c.r},${c.g},${c.b})`).join(', ')})`;

  const labels = {
    sst: 'Sea Surface Temp',
    sss: 'Sea Surface Salinity',
    ssh: 'Sea Level Anomaly',
    currents: 'Surface Currents',
    winds: 'Surface Winds',
    subsurface_temp: 'Subsurface Temp',
    embedding: 'Deep Embedding Space',
    thermal_anomaly: 'Thermal Anomaly'
  };

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 glass-panel p-3 rounded-xl border border-white/10 shadow-lg min-w-[200px] bg-black/60 backdrop-blur-md z-30">
      <div className="text-[10px] font-mono uppercase text-foam mb-2 opacity-80">
        {labels[activeVariable as keyof typeof labels] || activeVariable} ({unit})
        {depthParam > 0 ? ` • ${depthParam}m` : ''}
      </div>
      <div className="h-2 w-full rounded-full" style={{ background: gradient }} />
      <div className="flex justify-between mt-1 text-[10px] font-mono text-white/60">
        <span>{formatVal(min)}</span>
        <span>{formatVal(mid)}</span>
        <span>{formatVal(max)}</span>
      </div>
    </div>
  );
}
