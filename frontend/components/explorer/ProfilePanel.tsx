'use client';

import React from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSubsurfaceProfile, useValidationMatchup } from '@/lib/api/queries';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Play, Navigation2 } from 'lucide-react';

export function ProfilePanel() {
  const { selectedLat, selectedLon, selectedDate, selectedDepth, setMode } = useExplorerStore();
  const hasSelection = selectedLat !== null && selectedLon !== null;

  // We fetch both for the selected point
  const queryParams = hasSelection ? { lat: selectedLat, lon: selectedLon, date: selectedDate } : null;
  const { data: profile, isLoading: isProfileLoading } = useSubsurfaceProfile(queryParams);
  const { data: matchup } = useValidationMatchup(queryParams);

  if (!hasSelection) {
    return (
      <div className="w-full h-full rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-[#050A10]/60 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-biolume/5 via-[#050A10]/0 to-transparent pointer-events-none" />
        
        <div className="w-16 h-16 rounded-full border border-dashed border-biolume/30 flex items-center justify-center mb-6 relative">
          <div className="absolute inset-0 rounded-full border border-biolume/10 animate-[spin_4s_linear_infinite]" />
          <Navigation2 className="text-biolume/50 animate-pulse" size={24} />
        </div>
        <h3 className="text-sm font-mono text-white mb-2 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(0,210,255,0.4)]">Awaiting Selection</h3>
        <p className="text-xs text-foam-dim max-w-[200px] leading-relaxed">Click anywhere on the Indian Ocean to extract a 15-level subsurface profile.</p>
      </div>
    );
  }

  // Transform data for chart (depth vs temp)
  const chartData = profile?.depths.map((d, i) => ({
    depth: -d, // negative for Y axis
    temp: profile.temperature[i],
    argoTemp: matchup ? matchup.argoTemp[i] : null
  })) || [];

  return (
    <div className="w-full flex-grow min-h-0 rounded-2xl flex flex-col overflow-hidden bg-[#050A10]/60 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="p-5 border-b border-white/10 bg-black/40">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white font-bold flex items-center gap-2">
          Vertical Profile
        </h2>
        <div className="text-[10px] text-biolume drop-shadow-[0_0_5px_rgba(0,210,255,0.4)] font-mono mt-1.5 tracking-wider">
          {selectedLat.toFixed(2)}°N, {selectedLon.toFixed(2)}°E
        </div>
      </div>

      <div className="p-5 flex-grow flex flex-col overflow-y-auto console-scroll min-h-0" data-lenis-prevent="true">
        {isProfileLoading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div className="absolute inset-0 rounded-full border-2 border-biolume border-t-transparent animate-spin drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]" />
            </div>
          </div>
        ) : profile ? (
          <>
            {/* Chart Area */}
            <div className="h-64 w-full relative mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} layout="vertical">
                  <XAxis type="number" domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v) => `${v.toFixed(1)}°`} stroke="#8FA5AC" fontSize={10} tickLine={false} axisLine={{ stroke: '#8FA5AC', opacity: 0.2 }} />
                  <YAxis dataKey="depth" type="number" domain={[-1000, 0]} stroke="#8FA5AC" fontSize={10} tickLine={false} axisLine={{ stroke: '#8FA5AC', opacity: 0.2 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(5, 10, 16, 0.9)', border: '1px solid rgba(0, 210, 255, 0.2)', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    labelStyle={{ color: '#E9F1F3', fontFamily: 'monospace', fontSize: '12px' }}
                    itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
                    labelFormatter={(v) => `Depth: ${Math.abs(v as number)}m`}
                    formatter={(v: any, name: any) => [(Number(v) || 0).toFixed(2) + '°C', name === 'temp' ? 'Model' : 'Argo']}
                  />
                  {/* The Model Line */}
                  <Line type="monotone" dataKey="temp" stroke="#00D2FF" strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: '#00D2FF', stroke: '#fff', strokeWidth: 2 }} />
                  
                  {/* Argo Observations if available */}
                  {matchup && (
                    <Line type="monotone" dataKey="argoTemp" stroke="#10B981" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }} isAnimationActive={false} />
                  )}
                  
                  {/* Current depth selection indicator */}
                  <ReferenceLine y={-selectedDepth} stroke="#00D2FF" strokeOpacity={0.4} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
              
              <div className="absolute top-2 right-2 text-[10px] font-mono flex flex-col gap-1.5 bg-[#050A10]/80 p-2.5 rounded-lg border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-biolume shadow-[0_0_5px_rgba(0,210,255,0.8)]" /> <span className="text-white">OceanEmbed</span></div>
                {matchup && <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-[#10B981] border-t border-dashed" /> <span className="text-white">ARGO</span></div>}
              </div>
            </div>

            {/* Validation Metrics */}
            {matchup && (
              <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-3 mt-auto relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10B981]/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <h4 className="text-[10px] font-mono text-[#10B981] uppercase tracking-widest pl-2">Argo Matchup Validation</h4>
                <div className="grid grid-cols-2 gap-3 pl-2">
                  <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    <div className="text-[9px] text-foam-dim font-mono mb-1 tracking-wider">RMSE</div>
                    <div className="text-lg font-mono text-white font-bold">{matchup.rmse.toFixed(3)}<span className="text-xs text-foam-dim ml-1">°C</span></div>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    <div className="text-[9px] text-foam-dim font-mono mb-1 tracking-wider">CORRELATION</div>
                    <div className="text-lg font-mono text-white font-bold">{matchup.correlation.toFixed(3)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Dive Trigger Button */}
            <button 
              onClick={() => setMode('dive')}
              className="mt-5 w-full bg-biolume/10 hover:bg-biolume/20 text-biolume font-mono text-[11px] uppercase font-bold py-3.5 px-4 rounded-xl border border-biolume/30 transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,210,255,0.15)] hover:shadow-[0_0_25px_rgba(0,210,255,0.3)] hover:-translate-y-0.5"
            >
              <Play size={14} fill="currentColor" />
              Dive Below Surface
            </button>
          </>
        ) : (
          <div className="text-sm text-red-400 font-mono flex items-center justify-center h-full">Failed to load profile.</div>
        )}
      </div>
    </div>
  );
}
