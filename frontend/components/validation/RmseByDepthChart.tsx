'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import type { RegionalValidation } from '@/lib/api/types';

interface Props {
  data: RegionalValidation[];
}

export function RmseByDepthChart({ data }: Props) {
  // Use North Indian Ocean as primary for the depth chart
  const primaryRegion = data.find(d => d.region === 'north_indian_ocean') || data[0];
  
  if (!primaryRegion) return null;

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-semibold text-lg text-white">RMSE by Depth Level</h3>
          <p className="font-mono text-[10px] text-foam-dim uppercase tracking-widest mt-1">
            North Indian Ocean Basin
          </p>
        </div>
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-foam-dim uppercase">
          Target: &lt; 1.0°C
        </div>
      </div>

      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={primaryRegion.rmseByDepth}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#243447" horizontal={true} vertical={true} />
            
            <YAxis 
              type="number" 
              dataKey="depth" 
              reversed={true} 
              axisLine={{ stroke: '#243447' }}
              tickLine={false}
              tick={{ fill: '#647E99', fontSize: 10, fontFamily: 'monospace' }}
              label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', fill: '#647E99', fontSize: 10, fontFamily: 'monospace' }}
              domain={[0, 'dataMax']}
            />
            
            <XAxis 
              type="number" 
              axisLine={{ stroke: '#243447' }}
              tickLine={false}
              tick={{ fill: '#647E99', fontSize: 10, fontFamily: 'monospace' }}
              label={{ value: 'RMSE (°C)', position: 'insideBottom', offset: -10, fill: '#647E99', fontSize: 10, fontFamily: 'monospace' }}
              domain={[0, 2.0]}
            />
            
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: '#4CE0D2', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }}
            />

            {/* 1.0°C Target Line */}
            <ReferenceLine x={1.0} stroke="#F59E0B" strokeDasharray="3 3" opacity={0.5} />
            
            <Line 
              type="monotone" 
              dataKey="rmse" 
              stroke="#4CE0D2" 
              strokeWidth={2}
              dot={{ r: 4, fill: '#06111C', stroke: '#4CE0D2', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#4CE0D2', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const rmse = payload[0].value;
    return (
      <div className="bg-deep-panel/95 backdrop-blur-md border border-thermocline/30 p-3 shadow-xl rounded-sm">
        <div className="font-mono text-[10px] text-foam-dim uppercase tracking-widest mb-2 border-b border-white/10 pb-2">
          Depth: {label} m
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="font-mono text-xs text-foam">RMSE</span>
          <span className={`font-mono text-sm font-bold ${rmse < 1.0 ? 'text-validation-good' : 'text-validation-warn'}`}>
            {rmse.toFixed(2)} °C
          </span>
        </div>
      </div>
    );
  }
  return null;
};
