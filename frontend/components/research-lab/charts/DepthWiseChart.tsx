'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DepthWiseChartProps {
  data: any[];
  metric: 'rmse' | 'correlation' | 'bias';
  baselineName?: string;
  variantName?: string;
}

export function DepthWiseChart({ data, metric, baselineName = 'Baseline', variantName = 'Variant' }: DepthWiseChartProps) {
  
  const yAxisLabel = metric === 'rmse' ? 'RMSE (°C)' : metric === 'correlation' ? 'Correlation (r)' : 'Bias (°C)';

  return (
    <div className="w-full h-80 bg-black/20 rounded-xl border border-white/5 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="depth" 
            stroke="rgba(255,255,255,0.3)" 
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'monospace' }}
            tickFormatter={(val) => `${val}m`}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)" 
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'monospace' }}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(10,15,25,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
            itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '10px', marginBottom: '8px' }}
            labelFormatter={(val) => `Depth: ${val}m`}
          />
          <Legend 
            wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }}
            iconType="circle"
          />
          <Line 
            type="monotone" 
            dataKey="baseline" 
            name={baselineName}
            stroke="rgba(255,255,255,0.4)" 
            strokeWidth={2}
            dot={{ r: 3, fill: 'rgba(255,255,255,0.4)' }}
            activeDot={{ r: 5 }}
          />
          <Line 
            type="monotone" 
            dataKey="variant" 
            name={variantName}
            stroke="#4ce0d2" 
            strokeWidth={2}
            dot={{ r: 3, fill: '#4ce0d2' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
