'use client';

import React, { useState } from 'react';
import { Layers, Thermometer, Gauge, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

interface DepthPoint {
  depth: number;
  temp: number;
  zone: 'Epipelagic' | 'Mesopelagic' | 'Bathypelagic';
  light: string;
  pressureAtm: number;
  color: string;
  desc: string;
}

const DEPTH_DATA: DepthPoint[] = [
  { depth: 0, temp: 28.6, zone: 'Epipelagic', light: '100%', pressureAtm: 1.0, color: '#dc2626', desc: 'Solar-heated sea surface skin layer (SST boundary)' },
  { depth: 5, temp: 28.5, zone: 'Epipelagic', light: '85%', pressureAtm: 1.5, color: '#ea580c', desc: 'Upper wind-mixed turbulent boundary' },
  { depth: 10, temp: 28.4, zone: 'Epipelagic', light: '65%', pressureAtm: 2.0, color: '#f97316', desc: 'Well-mixed surface layer with uniform salinity' },
  { depth: 20, temp: 28.1, zone: 'Epipelagic', light: '40%', pressureAtm: 3.0, color: '#f59e0b', desc: 'Photosynthetically active radiation boundary' },
  { depth: 30, temp: 27.6, zone: 'Epipelagic', light: '25%', pressureAtm: 4.0, color: '#eab308', desc: 'Base of daily diurnal thermal warming' },
  { depth: 50, temp: 26.2, zone: 'Epipelagic', light: '12%', pressureAtm: 6.0, color: '#84cc16', desc: 'Seasonal mixed layer depth (MLD) transition' },
  { depth: 75, temp: 24.1, zone: 'Epipelagic', light: '4%', pressureAtm: 8.5, color: '#22c55e', desc: 'Upper thermocline boundary; high vertical shear' },
  { depth: 100, temp: 21.8, zone: 'Mesopelagic', light: '1%', pressureAtm: 11.0, color: '#14b8a6', desc: 'Euphotic zone limit; beginning of twilight zone' },
  { depth: 125, temp: 19.5, zone: 'Mesopelagic', light: '<0.1%', pressureAtm: 13.5, color: '#06b6d4', desc: 'Permanent thermocline; steepest temperature drop' },
  { depth: 150, temp: 17.8, zone: 'Mesopelagic', light: '0%', pressureAtm: 16.0, color: '#0ea5e9', desc: 'Deep Sound Channel (SOFAR) axis entry' },
  { depth: 200, temp: 15.2, zone: 'Mesopelagic', light: '0%', pressureAtm: 21.0, color: '#38bdf8', desc: 'Central water mass boundary in North Indian Ocean' },
  { depth: 300, temp: 12.6, zone: 'Mesopelagic', light: '0%', pressureAtm: 31.0, color: '#60a5fa', desc: 'Oxygen minimum zone (OMZ) core layer' },
  { depth: 500, temp: 9.8, zone: 'Bathypelagic', light: '0%', pressureAtm: 51.0, color: '#3b82f6', desc: 'Deep mesopelagic transition; sub-10°C water' },
  { depth: 700, temp: 8.1, zone: 'Bathypelagic', light: '0%', pressureAtm: 71.0, color: '#6366f1', desc: 'Indian Ocean Deep Water (IODW) influence' },
  { depth: 1000, temp: 6.8, zone: 'Bathypelagic', light: '0%', pressureAtm: 101.0, color: '#4338ca', desc: 'Cold abyssal boundary; near-zero seasonal variance' },
];

export function DepthColumnSection() {
  const [selectedIdx, setSelectedIdx] = useState(7); // Default to 100m
  const current = DEPTH_DATA[selectedIdx];

  return (
    <section id="depths" className="relative py-28 md:py-36 bg-[#02070D] border-t border-thermocline/15 overflow-hidden">
      {/* Dynamic ambient ocean glow following the selected depth color */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[160px] opacity-15 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: current.color }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 font-mono text-xs font-bold tracking-[0.25em] text-biolume uppercase mb-4 px-4 py-1.5 rounded-full border border-biolume/30 bg-biolume/10 backdrop-blur-md shadow-[0_0_20px_rgba(76,224,210,0.15)]">
            <Layers size={13} className="text-biolume" />
            Full Water Column Reconstruction
          </div>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.08] mb-6">
            15 Standard Depths.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-biolume via-thermocline to-surfaceSignal">
              From Surface Heat to Abyssal Cold.
            </span>
          </h2>
          <p className="text-foam-dim text-base md:text-lg leading-relaxed">
            OceanEmbed decodes satellite boundary signals into 15 standard oceanographic depth levels, capturing the sharp thermocline inversion, mixed layer depth, and deep-ocean heat content down to 1000 metres.
          </p>
        </div>

        {/* Main Interactive Stage: Left Rail, Center Column, Right Telemetry Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#050D17]/80 rounded-[2.5rem] border border-white/10 p-6 md:p-10 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
          
          {/* LEFT: 15-Depth Selector Rail (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-2">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-mono text-foam-dim">
              <span className="uppercase tracking-widest text-[11px]">Standard Depths</span>
              <span className="text-biolume font-semibold">Select level to inspect</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-3 gap-2 pt-2">
              {DEPTH_DATA.map((item, idx) => {
                const isSelected = selectedIdx === idx;
                return (
                  <button
                    key={item.depth}
                    onClick={() => setSelectedIdx(idx)}
                    className={`flex flex-col items-start p-3 rounded-xl border transition-all duration-300 text-left relative overflow-hidden group ${
                      isSelected
                        ? 'bg-white/10 border-white/30 shadow-[0_0_20px_rgba(76,224,210,0.2)] scale-[1.02]'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/15'
                    }`}
                  >
                    {/* Left color swatch */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex items-center justify-between w-full pl-1">
                      <span className="font-mono text-sm font-bold text-white tracking-tight">
                        {item.depth}m
                      </span>
                      <span 
                        className="font-mono text-xs font-semibold"
                        style={{ color: item.color }}
                      >
                        {item.temp.toFixed(1)}°
                      </span>
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-foam-dim pl-1 mt-1 truncate w-full">
                      {item.zone}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CENTER: Water Column Graphic (lg:col-span-2) */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center py-4">
            <div className="relative w-12 h-[420px] rounded-full p-1.5 border border-white/15 bg-black/60 backdrop-blur-md flex flex-col justify-between items-center shadow-inner">
              {/* Vertical scientific temperature gradient fill */}
              <div 
                className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-full"
                style={{
                  background: 'linear-gradient(to bottom, #dc2626 0%, #f97316 20%, #eab308 40%, #14b8a6 65%, #3b82f6 85%, #4338ca 100%)'
                }}
              />

              {/* Indicator Pip for selected depth */}
              <div 
                className="absolute left-0 right-0 h-4 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-all duration-500 ease-out z-20"
                style={{
                  top: `${Math.min(94, Math.max(6, (selectedIdx / (DEPTH_DATA.length - 1)) * 92 + 4))}%`
                }}
              >
                <div className="w-7 h-7 rounded-full bg-white border-2 border-[#02070D] shadow-[0_0_15px_#fff] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current.color }} />
                </div>
              </div>

              {/* Depth Markers along column */}
              <span className="relative z-10 font-mono text-[9px] font-bold text-white/90 drop-shadow">0m</span>
              <span className="relative z-10 font-mono text-[9px] font-bold text-white/90 drop-shadow">200m</span>
              <span className="relative z-10 font-mono text-[9px] font-bold text-white/90 drop-shadow">500m</span>
              <span className="relative z-10 font-mono text-[9px] font-bold text-white/90 drop-shadow">1000m</span>
            </div>
            
            <span className="font-mono text-[10px] text-foam-dim uppercase tracking-widest mt-3">
              Thermocline Gradient
            </span>
          </div>

          {/* RIGHT: Detailed Telemetry Card (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full bg-[#030A13] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            
            {/* Ambient corner aura */}
            <div 
              className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-2xl opacity-20 pointer-events-none transition-colors duration-500"
              style={{ backgroundColor: current.color }}
            />

            <div>
              {/* Zone Pill */}
              <div className="flex items-center justify-between mb-6">
                <span 
                  className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase border"
                  style={{
                    backgroundColor: `${current.color}15`,
                    borderColor: `${current.color}40`,
                    color: current.color,
                  }}
                >
                  {current.zone} Zone
                </span>
                <span className="font-mono text-xs text-white/40 tracking-widest uppercase">
                  Level #{selectedIdx + 1} of 15
                </span>
              </div>

              {/* Primary Depth & Temp Hero */}
              <div className="grid grid-cols-2 gap-6 pb-6 border-b border-white/10">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-foam-dim block mb-1">
                    Sample Depth
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight">
                      {current.depth}
                    </span>
                    <span className="font-mono text-lg text-foam-dim">m</span>
                  </div>
                </div>

                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-foam-dim block mb-1 flex items-center gap-1.5">
                    <Thermometer size={14} style={{ color: current.color }} />
                    Reconstructed Temp
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span 
                      className="font-display text-4xl md:text-5xl font-bold tracking-tight"
                      style={{ color: current.color }}
                    >
                      {current.temp.toFixed(1)}
                    </span>
                    <span className="font-mono text-lg text-foam-dim">°C</span>
                  </div>
                </div>
              </div>

              {/* Physical Environment Attributes */}
              <div className="grid grid-cols-2 gap-4 py-6 border-b border-white/10 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-biolume">
                    <Gauge size={16} />
                  </div>
                  <div>
                    <span className="text-foam-dim text-[10px] uppercase tracking-wider block">Hydrostatic Pressure</span>
                    <span className="text-white font-semibold">{current.pressureAtm.toFixed(1)} atm</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-instrument-amber">
                    {current.depth < 100 ? <Sun size={16} /> : <Moon size={16} />}
                  </div>
                  <div>
                    <span className="text-foam-dim text-[10px] uppercase tracking-wider block">Solar Penetration</span>
                    <span className="text-white font-semibold">{current.light}</span>
                  </div>
                </div>
              </div>

              {/* Physical Process Description */}
              <div className="pt-6">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foam-dim block mb-2">
                  Oceanographic Significance
                </span>
                <p className="font-ui text-sm text-foam/85 leading-relaxed">
                  {current.desc}
                </p>
              </div>
            </div>

            {/* CTA to explore in 3D */}
            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-foam-dim font-ui">
                Predict this depth anywhere in the Indian Ocean.
              </span>
              <Link
                href="/explorer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-biolume/10 border border-biolume/40 text-biolume text-xs font-mono font-semibold uppercase tracking-wider hover:bg-biolume hover:text-black transition-all"
              >
                Inspect in Explorer →
              </Link>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
