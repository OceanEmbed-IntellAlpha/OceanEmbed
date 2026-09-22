'use client';

import { Activity, Cpu, X } from 'lucide-react';
import { useConsoleStore } from '@/lib/store/useConsoleStore';
import { LoadingScan } from '@/components/shared/LoadingScan';
import { FloatSummaryCard } from './FloatSummaryCard';
import { ModelVsObservationTable } from './ModelVsObservationTable';
import { DepthProfileChart } from './DepthProfileChart';
import { useMatchup, useObservations, useProfile, useCycles } from '@/lib/api/queries';
import type { Observation } from '@/lib/api/types';

interface InspectorPanelProps {
  onDiveReplay: (lat: number, lon: number) => void;
}

/**
 * InspectorPanel — standalone floating panel for inspecting a selected
 * Argo float / glider / buoy. Slides in from the right when a float
 * is selected, independent of the on-globe water column.
 */
export function InspectorPanel({ }: InspectorPanelProps) {
  const selectedId    = useConsoleStore((s) => s.selectedFloatId);
  const time          = useConsoleStore((s) => s.time);
  const inspectorOpen = useConsoleStore((s) => s.inspectorOpen);
  const setInspectorOpen = useConsoleStore((s) => s.setInspectorOpen);
  const openDeviceViewer = useConsoleStore((s) => s.openDeviceViewer);
  const activeObservationTypes = useConsoleStore((s) => s.activeObservationTypes);

  const isVisible = inspectorOpen && !!selectedId;

  // ── Data queries — all keyed on the actual float WMO ID ─────────────────
  const { data: profile,  isLoading: profileLoading  } = useProfile(selectedId);
  const { data: matchup,  isLoading: matchupLoading  } = useMatchup(selectedId);
  const { data: cycles                               } = useCycles(selectedId);

  // Pull the clicked float's metadata from the observations list
  const { data: observations } = useObservations({
    types: Array.from(activeObservationTypes).length > 0
      ? Array.from(activeObservationTypes)
      : ['argo', 'glider', 'buoy'],
    time,
  });
  const selectedObservation: Observation | undefined =
    observations?.find((o) => o.id === selectedId);

  const latestCycle  = cycles && cycles.length > 0 ? cycles[cycles.length - 1] : null;

  return (
    <div
      className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
      style={{
        width: 400,
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform',
      }}
    >
      {/* ── Panel background ────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col overflow-hidden"
        style={{
          background: 'rgba(10, 15, 21, 0.92)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderLeft: '1px solid rgba(76, 224, 210, 0.12)',
          boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#f5a623]/10 border border-[#f5a623]/20 flex items-center justify-center">
              <Activity size={14} className="text-[#f5a623]" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[0.6rem] tracking-[0.2em] text-[#f5a623] uppercase font-semibold">
                Float Inspector
              </span>
              <span className="font-mono text-[0.55rem] text-white/40 tracking-wider">
                {selectedId ?? '—'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setInspectorOpen(false)}
            aria-label="Close inspector"
            className="group w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/15 transition-all duration-300"
          >
            <X size={14} className="text-white/50 group-hover:text-white" />
          </button>
        </div>

        {/* ── Scrollable content ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto console-scroll px-4 py-4 flex flex-col gap-5">

          {!selectedId && (
            <div className="flex-1 flex items-center justify-center font-mono text-xs text-foam-dim">
              SELECT A FLOAT ON THE GLOBE
            </div>
          )}

          {selectedId && (
            <>
              {/* Float summary card */}
              {selectedObservation ? (
                <FloatSummaryCard observation={selectedObservation} />
              ) : (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                  <p className="font-mono text-[0.55rem] tracking-widest text-foam-dim uppercase mb-1">Platform ID</p>
                  <p className="font-mono text-xs text-white">{selectedId}</p>
                </div>
              )}

              {/* ── View 3D Engineering Model button (argo / glider only) ── */}
              {selectedObservation &&
                (selectedObservation.platform === 'argo' || selectedObservation.platform === 'glider') && (
                <button
                  onClick={() => openDeviceViewer(selectedObservation.platform as 'argo' | 'glider')}
                  aria-label={`Open 3D engineering model for ${selectedObservation.platform}`}
                  className="w-full py-2.5 rounded-xl font-mono text-xs tracking-[0.15em] uppercase
                             flex items-center justify-center gap-2 transition-all duration-200
                             focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-transparent"
                  style={{
                    background:     selectedObservation.platform === 'argo'
                      ? 'rgba(245, 179, 56, 0.12)'
                      : 'rgba(76, 224, 210, 0.12)',
                    border:         `1px solid ${ selectedObservation.platform === 'argo'
                      ? 'rgba(245, 179, 56, 0.35)'
                      : 'rgba(76, 224, 210, 0.35)'}`,
                    color:          selectedObservation.platform === 'argo' ? '#f5b338' : '#4CE0D2',
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.background = selectedObservation.platform === 'argo'
                      ? 'rgba(245,179,56,0.22)' : 'rgba(76,224,210,0.22)';
                    btn.style.borderColor = selectedObservation.platform === 'argo'
                      ? 'rgba(245,179,56,0.7)' : 'rgba(76,224,210,0.7)';
                    btn.style.boxShadow = selectedObservation.platform === 'argo'
                      ? '0 0 16px rgba(245,179,56,0.2)' : '0 0 16px rgba(76,224,210,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.style.background = selectedObservation.platform === 'argo'
                      ? 'rgba(245,179,56,0.12)' : 'rgba(76,224,210,0.12)';
                    btn.style.borderColor = selectedObservation.platform === 'argo'
                      ? 'rgba(245,179,56,0.35)' : 'rgba(76,224,210,0.35)';
                    btn.style.boxShadow = 'none';
                  }}
                >
                  <Cpu size={13} aria-hidden="true" />
                  View 3D Engineering Model
                </button>
              )}

              {/* ── Cycle history strip (real NC floats only) ────────────── */}
              {latestCycle && cycles && cycles.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="font-ui text-xs font-semibold text-white/90 flex items-center gap-1.5">
                    <Activity size={12} className="text-biolume" />
                    Measurement Cycles
                  </p>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 grid grid-cols-2 gap-y-2 gap-x-3 shadow-sm">
                    {[
                      ['TOTAL CYCLES', String(cycles.length), 'text-biolume'],
                      ['LATEST CYCLE', `#${latestCycle.cycleNumber}`, 'text-foam'],
                      ['MAX DEPTH',    latestCycle.maxDepth != null ? `${latestCycle.maxDepth.toFixed(0)} m` : 'N/A', 'text-instrument-amber'],
                      ['DEPTH LEVELS', String(latestCycle.nLevels), 'text-foam'],
                    ].map(([label, val, valClass]) => (
                      <div key={label} className="flex flex-col">
                        <span className="font-mono text-[0.5rem] tracking-widest text-foam-dim uppercase">{label}</span>
                        <span className={`font-mono text-xs font-bold ${valClass}`}>{val}</span>
                      </div>
                    ))}
                    <div className="col-span-2 flex flex-col pt-1.5 border-t border-white/[0.04] mt-1.5">
                      <span className="font-mono text-[0.5rem] tracking-widest text-foam-dim uppercase">LAST OBSERVATION</span>
                      <span className="font-mono text-[0.65rem] text-foam-dim">
                        {new Date(latestCycle.time).toUTCString().slice(0, 22)} UTC
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Depth Profile Chart ────────────────────────────────────── */}
              {profileLoading ? (
                <LoadingScan label="Streaming depth profile…" compact />
              ) : profile ? (
                <DepthProfileChart profile={profile} />
              ) : (
                <div className="font-mono text-2xs text-foam-dim">
                  NO PROFILE DATA FOR THIS FLOAT
                </div>
              )}

              <div className="w-full h-px bg-white/[0.04] shrink-0" role="separator" />

              {/* ── Model vs Observation matchup table ─────────────────────── */}
              {matchupLoading ? (
                <LoadingScan label="Loading matchup…" compact />
              ) : matchup ? (
                <ModelVsObservationTable matchup={matchup} />
              ) : (
                <div className="font-mono text-2xs text-foam-dim">
                  NO MODEL COVERAGE AT THIS DEPTH
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Keep the old export name for backward compatibility during transition
export { InspectorPanel as InspectorContent };
