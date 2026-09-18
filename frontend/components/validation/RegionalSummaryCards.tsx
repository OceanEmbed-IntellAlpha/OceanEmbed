'use client';

import React from 'react';
import type { RegionalValidation } from '@/lib/api/types';
import { Activity, Thermometer, TrendingUp } from 'lucide-react';

interface Props {
  data: RegionalValidation[];
}

const REGION_LABELS = {
  'north_indian_ocean': 'N. Indian Ocean',
  'bay_of_bengal': 'Bay of Bengal',
  'arabian_sea': 'Arabian Sea'
};

export function RegionalSummaryCards({ data }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      {data.map((regionData) => (
        <div key={regionData.region} className="bg-deep-panel/50 border border-thermocline/20 rounded-lg p-6 relative overflow-hidden group hover:border-biolume/40 transition-colors">
          {/* Subtle glow effect */}
          <div className="absolute -inset-20 bg-gradient-to-br from-biolume/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-start mb-6">
            <div>
              <h3 className="font-display font-semibold text-lg text-white mb-1">
                {REGION_LABELS[regionData.region] || regionData.region}
              </h3>
              <p className="font-mono text-[10px] text-foam-dim uppercase tracking-widest">
                {regionData.nProfiles.toLocaleString()} Profiles
              </p>
            </div>
            <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Activity size={16} className="text-biolume" />
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-4">
            <MetricRow 
              label="RMSE" 
              value={regionData.rmse.toFixed(2)} 
              unit="°C" 
              icon={Activity} 
              status={regionData.rmse < 0.9 ? 'good' : regionData.rmse < 1.0 ? 'warn' : 'bad'}
            />
            <div className="w-full h-px bg-thermocline/10" />
            <MetricRow 
              label="BIAS" 
              value={(regionData.bias > 0 ? '+' : '') + regionData.bias.toFixed(2)} 
              unit="°C" 
              icon={Thermometer} 
              status={Math.abs(regionData.bias) < 0.1 ? 'good' : Math.abs(regionData.bias) < 0.2 ? 'warn' : 'bad'}
            />
            <div className="w-full h-px bg-thermocline/10" />
            <MetricRow 
              label="CORR" 
              value={regionData.correlation.toFixed(2)} 
              unit="" 
              icon={TrendingUp} 
              status={regionData.correlation > 0.95 ? 'good' : regionData.correlation > 0.9 ? 'warn' : 'bad'}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricRow({ label, value, unit, icon: Icon, status }: { label: string, value: string, unit: string, icon: any, status: 'good' | 'warn' | 'bad' }) {
  const statusColor = 
    status === 'good' ? 'text-validation-good' : 
    status === 'warn' ? 'text-validation-warn' : 
    'text-validation-bad';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-foam-dim" />
        <span className="font-mono text-xs text-foam-dim uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-base font-medium ${statusColor}`}>
          {value}
        </span>
        {unit && <span className="font-mono text-[10px] text-foam-dim">{unit}</span>}
      </div>
    </div>
  );
}
