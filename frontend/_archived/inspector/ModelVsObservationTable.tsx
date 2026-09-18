'use client';

import { useState } from 'react';
import { MonoValue } from '@/components/shared/MonoValue';
import type { MatchupResponse } from '@/lib/api/types';
import { Switch } from '@/components/shared/Switch';

interface ModelVsObservationTableProps {
  matchup: MatchupResponse;
}

const DELTA_THRESHOLD_NOTABLE = 0.3;   // amber
const DELTA_THRESHOLD_CRITICAL = 0.5;  // coral

function getDeltaColor(delta: number): 'amber' | 'coral' | 'dim' {
  const abs = Math.abs(delta);
  if (abs >= DELTA_THRESHOLD_CRITICAL) return 'coral';
  if (abs >= DELTA_THRESHOLD_NOTABLE) return 'amber';
  return 'dim';
}

// Show only a representative subset for readability
const DISPLAY_DEPTHS = [0, 50, 100, 200, 300, 500, 700, 1000];

export function ModelVsObservationTable({ matchup }: ModelVsObservationTableProps) {
  const { depths, observed, model, delta, mlCorrected, mlDelta, unit } = matchup;
  const [showMl, setShowMl] = useState(false);

  const hasMl = !!mlCorrected && mlCorrected.length > 0;
  const activeModel = showMl && hasMl ? mlCorrected! : model;
  const activeDelta = showMl && hasMl ? mlDelta! : delta;

  const rows = DISPLAY_DEPTHS
    .map((targetDepth) => {
      const idx = depths.reduce((best, d, i) =>
        Math.abs(d - targetDepth) < Math.abs(depths[best] - targetDepth) ? i : best,
        0
      );
      return {
        depth: depths[idx],
        obs: observed[idx],
        mod: activeModel[idx],
        dlt: activeDelta[idx],
      };
    })
    .filter((r, i, arr) => r.depth != null && arr.findIndex((x) => x.depth === r.depth) === i); // deduplicate and filter nulls

  const maxAbsDelta = rows.length > 0 ? Math.max(...rows.map((r) => Math.abs(r.dlt || 0))) : 0;

  return (
    <div role="region" aria-label="Model vs observation comparison table">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-ui text-xs font-semibold text-white/90">
          Model — Observation Matchup
        </h3>
        
        {hasMl && (
          <div 
            className="flex items-center gap-2 cursor-pointer bg-white/[0.03] px-2 py-1 rounded-md border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
            onClick={() => setShowMl(!showMl)}
          >
            <span className={`font-ui text-[0.65rem] transition-all duration-300 ${showMl ? 'text-[#f8943c] font-bold tracking-wide drop-shadow-[0_0_4px_rgba(248,148,60,0.5)]' : 'font-medium text-foam-dim tracking-wide'}`}>
              ✨ ML Corrected
            </span>
            <Switch checked={showMl} onChange={() => setShowMl(!showMl)} />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-4 gap-0 bg-white/[0.04] border-b border-white/[0.06] shadow-sm">
          {['DEPTH', 'OBS', 'MODEL', 'Δ'].map((h) => (
            <div key={h} className="px-2 py-2 text-center">
              <span className="font-mono text-[0.6rem] text-foam tracking-widest">{h}</span>
            </div>
          ))}
        </div>

        {/* Table rows */}
        <div className="divide-y divide-white/[0.04]">
          {rows.map((row) => {
            const deltaColor = getDeltaColor(row.dlt);
            const isSignificant = Math.abs(row.dlt) >= DELTA_THRESHOLD_NOTABLE;

            return (
              <div
                key={row.depth}
                className={`grid grid-cols-4 gap-0 transition-colors ${
                  isSignificant ? 'bg-instrument-amber/5' : 'hover:bg-white/[0.04]'
                }`}
              >
                {/* Depth */}
                <div className="px-2 py-2 text-center border-r border-white/[0.04]">
                  <MonoValue
                    value={row.depth === 0 ? 'SFC' : row.depth != null ? row.depth.toFixed(0) : 'N/A'}
                    unit={row.depth === 0 ? '' : 'm'}
                    size="xs"
                    color="dim"
                  />
                </div>

                {/* Observed */}
                <div className="px-2 py-2 text-center tabular-nums">
                  <MonoValue
                    value={row.obs != null ? row.obs.toFixed(2) : 'N/A'}
                    size="xs"
                    color="foam"
                    aria-label={`Observed: ${row.obs != null ? row.obs.toFixed(2) : 'N/A'} ${unit}`}
                  />
                </div>

                {/* Model */}
                <div className="px-2 py-2 text-center tabular-nums transition-colors duration-300">
                  <MonoValue
                    value={row.mod != null ? row.mod.toFixed(2) : 'N/A'}
                    size="xs"
                    color={showMl ? 'amber' : 'dim'}
                    aria-label={`Model: ${row.mod != null ? row.mod.toFixed(2) : 'N/A'} ${unit}`}
                  />
                </div>

                {/* Delta */}
                <div className="px-2 py-2 flex items-center justify-center tabular-nums">
                  <div className={`px-2 py-0.5 rounded font-mono text-xs transition-colors duration-300 ${
                    deltaColor === 'coral' ? 'bg-coral-delta/20 text-coral-delta shadow-[0_0_8px_rgba(240,128,128,0.2)]' :
                    deltaColor === 'amber' ? 'bg-instrument-amber/20 text-instrument-amber shadow-[0_0_8px_rgba(232,163,61,0.2)]' :
                    showMl ? 'text-instrument-amber drop-shadow-[0_0_4px_rgba(232,163,61,0.4)]' : 'text-foam-dim'
                  }`}>
                    {row.dlt != null ? `${row.dlt >= 0 ? '+' : ''}${row.dlt.toFixed(2)}` : 'N/A'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: unit + max delta */}
        <div className="px-2 py-1.5 border-t border-white/[0.06] bg-white/[0.02] flex justify-between">
          <span className="font-mono text-2xs text-foam-dim/50">unit: {unit}</span>
          <span className={`font-mono text-2xs ${getDeltaColor(maxAbsDelta) === 'coral' ? 'text-coral-delta' : 'text-instrument-amber'}`}>
            MAX Δ: {maxAbsDelta >= 0 ? '+' : ''}{maxAbsDelta.toFixed(2)} {unit}
          </span>
        </div>
      </div>

      {/* Status copy */}
      <p className="font-mono text-2xs text-foam-dim/60 mt-2 tracking-wide">
        {maxAbsDelta >= DELTA_THRESHOLD_CRITICAL
          ? '⚠ MODEL–OBSERVATION DELTA EXCEEDS THRESHOLD'
          : `MODEL–OBSERVATION DELTA: +${matchup.delta.slice(0, 5).map(d => d.toFixed(2)).join(', ')} ${unit}`
        }
      </p>
    </div>
  );
}
