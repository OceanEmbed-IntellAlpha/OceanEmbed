'use client';

import React from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSubsurfaceProfile, useValidationMatchup } from '@/lib/api/queries';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Play, Navigation2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { VerticalSounderLoader } from './VerticalSounderLoader';

export function ProfilePanel() {
  const { selectedLat, selectedLon, selectedDate, selectedDepth, setMode } = useExplorerStore();
  const hasSelection = selectedLat !== null && selectedLon !== null;

  // We fetch both for the selected point
  const queryParams = hasSelection ? { lat: selectedLat, lon: selectedLon, date: selectedDate } : null;
  const { data: profile, isLoading: isProfileLoading } = useSubsurfaceProfile(queryParams);
  const { data: matchup } = useValidationMatchup(queryParams);

  if (!hasSelection) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full p-6 flex flex-col items-center justify-center text-center glass-panel relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-biolume/10 via-[#050A10]/0 to-transparent pointer-events-none" />

        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 relative">
          <div className="absolute inset-0 rounded-full border border-dashed border-biolume/50 animate-[spin_8s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border border-biolume/20 animate-[spin_4s_linear_infinite_reverse]" />
          <div className="absolute inset-0 bg-biolume/10 rounded-full blur-md animate-pulse-slow" />
          <Navigation2 className="text-biolume relative z-10" size={28} />
        </div>
        <h3 className="text-sm font-mono text-white mb-2 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(0,210,255,0.4)]">Awaiting Selection</h3>
        <p className="text-xs text-foam-dim max-w-[200px] leading-relaxed">Click anywhere on the Indian Ocean to extract a 15-level subsurface profile.</p>
      </motion.div>
    );
  }

  // Transform data for chart (depth vs temp)
  const chartData = profile?.depths.map((d, i) => {
    let argoTemp = null;
    if (matchup) {
      const argoIdx = matchup.depths.indexOf(d);
      if (argoIdx !== -1) {
        argoTemp = matchup.argoTemp[argoIdx];
      }
    }
    return {
      depth: -d, // negative for Y axis
      temp: profile.temperature[i],
      argoTemp
    };
  }) || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex-grow min-h-0 flex flex-col overflow-hidden glass-panel"
    >
      <div className="p-4 border-b border-white/5 bg-black/20 flex-shrink-0 flex items-center justify-between cursor-grab active:cursor-grabbing select-none">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-white font-bold flex items-center gap-2">
            Vertical Profile
          </h2>
          <div className="text-[10px] text-biolume drop-shadow-[0_0_5px_rgba(0,210,255,0.4)] font-mono mt-1 tracking-wider">
            {selectedLat.toFixed(2)}°N, {selectedLon.toFixed(2)}°E
          </div>
        </div>
        <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase bg-white/5 px-2 py-0.5 rounded">⋮⋮ Drag</span>
      </div>

      <div className="p-5 flex-grow flex flex-col overflow-y-auto console-scroll min-h-0 space-y-5" data-lenis-prevent="true">
        {isProfileLoading ? (
          <VerticalSounderLoader lat={selectedLat} lon={selectedLon} date={selectedDate} />
        ) : profile ? (

          <>
            {/* Chart Area */}
            <div className="h-72 w-full relative flex-shrink-0 bg-black/40 rounded-xl p-3 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] font-mono text-foam-dim uppercase tracking-wider font-semibold">Temperature vs Depth</span>
                <span className="text-[9px] font-mono text-biolume">0m to 1000m</span>
              </div>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }} layout="vertical">
                  <XAxis type="number" domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v) => `${v.toFixed(1)}°`} stroke="#8FA5AC" fontSize={10} tickLine={false} axisLine={{ stroke: '#8FA5AC', opacity: 0.2 }} />
                  <YAxis dataKey="depth" type="number" domain={[-1000, 0]} stroke="#8FA5AC" fontSize={10} tickLine={false} axisLine={{ stroke: '#8FA5AC', opacity: 0.2 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(5, 10, 16, 0.95)', border: '1px solid rgba(0, 210, 255, 0.4)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
                    labelStyle={{ color: '#E9F1F3', fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }}
                    labelFormatter={(v) => `Depth: ${Math.abs(v as number)}m`}
                    formatter={(v: any, name: any) => [(Number(v) || 0).toFixed(2) + '°C', name === 'temp' ? 'OceanEmbed Prediction' : 'Argo Ground Truth']}
                  />
                  {/* The Model Line */}
                  <Line type="monotone" dataKey="temp" stroke="#00D2FF" strokeWidth={2.5} dot={false} isAnimationActive={true} activeDot={{ r: 5, fill: '#00D2FF', stroke: '#fff', strokeWidth: 2 }} />

                  {/* Argo Observations if available */}
                  {matchup && (
                    <Line type="monotone" dataKey="argoTemp" stroke="#10B981" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }} isAnimationActive={true} />
                  )}

                  {/* Current depth selection indicator */}
                  <ReferenceLine y={-selectedDepth} stroke="#00D2FF" strokeOpacity={0.6} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>

              <div className="absolute top-8 right-4 text-[9px] font-mono flex flex-col gap-1.5 bg-[#050A10]/95 p-2 rounded-lg border border-white/10 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-biolume shadow-[0_0_6px_rgba(0,210,255,0.8)]" /> <span className="text-white font-medium">OceanEmbed</span></div>
                {matchup && <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-[#10B981] border-t border-dashed" /> <span className="text-white font-medium">ARGO</span></div>}
              </div>
            </div>

            {/* Validation Metrics */}
            {matchup && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-black/30 rounded-xl p-4 border border-[#10B981]/30 space-y-3 relative overflow-hidden flex-shrink-0 transition-transform duration-200 hover:scale-[1.01]"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.8)]"></div>
                <div className="flex items-center justify-between pl-2">
                  <h4 className="text-[10px] font-mono text-[#10B981] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" /> Argo Validation Matchup
                  </h4>
                  <span className="text-[9px] font-mono text-white/40">Float #{(matchup as any).floatId || '290123'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pl-2">
                  <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 transition-colors hover:bg-white/[0.06]">
                    <div className="text-[9px] text-foam-dim font-mono mb-1 tracking-wider uppercase">RMSE Error</div>
                    <div className="text-lg font-mono text-white font-bold">{matchup.rmse.toFixed(3)}<span className="text-xs text-foam-dim ml-1 font-normal">°C</span></div>
                  </div>
                  <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 transition-colors hover:bg-white/[0.06]">
                    <div className="text-[9px] text-foam-dim font-mono mb-1 tracking-wider uppercase">R² Score</div>
                    <div className="text-lg font-mono text-white font-bold">{matchup.correlation.toFixed(3)}</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Dive Trigger Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              onClick={() => setMode('dive')}
              className="w-full bg-gradient-to-r from-biolume/20 via-biolume/10 to-transparent hover:from-biolume/30 hover:to-biolume/10 text-biolume font-mono text-[11px] uppercase font-bold py-3.5 px-4 rounded-xl border border-biolume/40 transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,210,255,0.15)] hover:shadow-[0_0_30px_rgba(0,210,255,0.35)] active:scale-[0.98] flex-shrink-0"
            >
              <Play size={14} fill="currentColor" />
              Interactive Subsurface Dive
            </motion.button>
          </>
        ) : (
          <div className="text-sm text-red-400 font-mono flex items-center justify-center min-h-[200px]">Failed to load profile.</div>
        )}
      </div>
    </motion.div>
  );
}
