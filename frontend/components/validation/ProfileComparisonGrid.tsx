'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ValidationMatchup } from '@/lib/api/types';

interface Props {
  matchup: ValidationMatchup;
}

export function ProfileComparisonGrid({ matchup }: Props) {
  // Transform data for chart (depth vs temp)
  const chartData = matchup.depths.map((d, i) => ({
    depth: -d, // negative for Y axis
    modelTemp: matchup.modelTemp[i],
    argoTemp: matchup.argoTemp[i]
  }));

  return (
    <div className="w-full h-full min-h-[350px] flex flex-col bg-deep-panel/30 border border-thermocline/20 rounded-lg p-6">
      
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-display font-semibold text-lg text-white">Profile Comparison</h3>
          <p className="font-mono text-[10px] text-foam-dim uppercase tracking-widest mt-1">
            Model vs ARGO In-Situ
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 font-mono text-[10px] text-foam uppercase">
            <div className="w-3 h-1 bg-reconstruction" /> Model (GLORYS trained)
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-foam uppercase">
            <div className="w-3 h-0 border-t-2 border-dashed border-argo-obs" /> ARGO Observation
          </div>
        </div>
      </div>

      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <XAxis 
              type="number" 
              domain={['dataMin - 1', 'dataMax + 1']} 
              tickFormatter={(v) => `${v.toFixed(1)}°C`}
              stroke="#243447"
              tick={{ fill: '#647E99', fontSize: 10, fontFamily: 'monospace' }}
            />
            <YAxis 
              dataKey="depth" 
              type="number" 
              domain={[-1000, 0]} 
              stroke="#243447"
              tick={{ fill: '#647E99', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(v) => `${Math.abs(v)}m`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(6,17,28,0.95)', border: '1px solid rgba(76,224,210,0.3)', borderRadius: '4px' }}
              labelFormatter={(v) => `Depth: ${Math.abs(v as number)}m`}
              formatter={(v: any, name: any) => [
                <span key={name} className="font-mono">{Number(v ?? 0).toFixed(2)}°C</span>, 
                <span key={name + "-label"} className="font-mono uppercase text-[10px]">{name === 'modelTemp' ? 'Model' : 'ARGO'}</span>
              ]}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
            />
            
            <Line 
              type="monotone" 
              dataKey="modelTemp" 
              stroke="#F59E0B" 
              strokeWidth={3} 
              dot={{ r: 3, fill: '#F59E0B', stroke: 'none' }} 
              isAnimationActive={true} 
            />
            
            <Line 
              type="monotone" 
              dataKey="argoTemp" 
              stroke="#34D399" 
              strokeWidth={2} 
              strokeDasharray="4 4" 
              dot={{ r: 4, fill: '#06111C', stroke: '#34D399', strokeWidth: 2 }} 
              isAnimationActive={true} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-thermocline/20 pt-4">
        <div className="flex flex-col">
          <span className="font-mono text-[9px] text-foam-dim uppercase tracking-widest">Sample Location</span>
          <span className="font-mono text-sm text-white">
            {matchup.lat.toFixed(2)}°N, {matchup.lon.toFixed(2)}°E
          </span>
        </div>
        <div className="flex flex-col text-right">
          <span className="font-mono text-[9px] text-foam-dim uppercase tracking-widest">Sample Date</span>
          <span className="font-mono text-sm text-white">
            {new Date(matchup.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
}
