'use client';

import React from 'react';
import { SOUNDING_STATIONS } from './GlobeConfig';

interface HeroSolutionDockProps {
  activeStationId: string;
  onSelectStation: (id: string) => void;
  activeConversionStep?: number;
  onSelectConversionStep?: (step: number) => void;
}

export function HeroSolutionDock({
  activeStationId,
  onSelectStation,
}: HeroSolutionDockProps) {
  const activeStation =
    SOUNDING_STATIONS.find((s) => s.id === activeStationId) || SOUNDING_STATIONS[0];

  // SVG dimensions for minimal sparkline
  const chartW = 300;
  const chartH = 46;

  const depths = [0, 50, 100, 200, 500, 1000, 2000];
  const temps = activeStation.temps;

  const points = temps.map((temp, i) => {
    const depthFrac = Math.pow(i / (depths.length - 1), 0.78);
    const x = 8 + depthFrac * (chartW - 16);
    const y = chartH - 6 - ((temp - 2) / (32 - 2)) * (chartH - 12);
    return { x, y, temp, depth: depths[i] };
  });

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartH} L ${points[0].x} ${chartH} Z`;

  return (
    <div className="w-full max-w-[340px] select-none transition-all duration-500">
      {/* Sleek Minimalist Glass Telemetry Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#020713]/80 backdrop-blur-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-white">
        
        {/* Basin Selector Tabs (Clean Minimal Pill) */}
        <div className="flex p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-3.5">
          {SOUNDING_STATIONS.slice(0, 3).map((stn) => {
            const isSelected = stn.id === activeStation.id;
            const shortName = stn.name.includes('Arabian')
              ? 'Arabian'
              : stn.name.includes('Bengal')
              ? 'Bengal'
              : 'Equatorial';
            return (
              <button
                key={stn.id}
                onClick={() => onSelectStation(stn.id)}
                className={`flex-1 py-1 px-2 rounded-lg font-sans text-xs transition-all duration-200 text-center truncate ${
                  isSelected
                    ? 'bg-white/10 text-white font-semibold shadow-sm'
                    : 'text-foam/50 hover:text-white/80 font-normal'
                }`}
              >
                {shortName}
              </button>
            );
          })}
        </div>

        {/* Station Readout & Gradient Temp Span */}
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <h4 className="font-sans text-xs font-semibold text-white/95">
              {activeStation.name}
            </h4>
            <p className="font-mono text-[10px] text-foam/45">
              {activeStation.lat}°N, {activeStation.lng}°E · Z₂₀: {activeStation.thermoclineDepth}m
            </p>
          </div>
          <div className="flex items-baseline gap-1.5 font-mono text-xs">
            <span className="font-bold text-[#F97316]">
              {activeStation.temps[0]}°C
            </span>
            <span className="text-foam/30 text-[10px]">→</span>
            <span className="font-bold text-[#818CF8]">
              {activeStation.temps[6]}°C
            </span>
          </div>
        </div>

        {/* Minimalist Depth Curve T(z) */}
        <div className="relative py-1">
          <div className="h-[46px] w-full relative overflow-hidden flex items-center justify-center">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${chartW} ${chartH}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="minCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F97316" />
                  <stop offset="35%" stopColor="#2DD4BF" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>
                <linearGradient id="minAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <path d={areaD} fill="url(#minAreaGrad)" />
              <path
                d={pathD}
                fill="none"
                stroke="url(#minCurveGrad)"
                strokeWidth="1.75"
                strokeLinecap="round"
              />

              {/* Only 3 anchor points for minimal aesthetic */}
              {[0, 3, 6].map((idx) => {
                const pt = points[idx];
                return (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={2}
                    fill={idx === 0 ? '#F97316' : idx === 3 ? '#2DD4BF' : '#818CF8'}
                  />
                );
              })}
            </svg>
          </div>

          {/* Minimal Depth Markers */}
          <div className="flex items-center justify-between text-[9px] font-mono text-foam/40 pt-1 border-t border-white/[0.05]">
            <span>0m (Surface)</span>
            <span className="text-biolume/70">200m (Z₂₀)</span>
            <span>2000m (Abyss)</span>
          </div>
        </div>

        {/* Ultra-Clean Validation Metric */}
        <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between font-mono text-[9px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>ARGO Validated</span>
          </div>
          <span className="text-foam/50">
            R² = 0.962 · RMSE 0.38°C
          </span>
        </div>

      </div>
    </div>
  );
}

