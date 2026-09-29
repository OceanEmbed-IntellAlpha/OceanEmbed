'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

import { Search, RefreshCw, Waves, MapPin, ArrowLeft, Lightbulb } from 'lucide-react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useBackendHealth } from '@/lib/api/queries';
import { LiveReadout } from './LiveReadout';

interface ExplorerTopBarProps {
  onSearchLocation?: (lat: number, lon: number, altitudeM?: number) => void;
  onReset?: () => void;
}

// ── Indian ocean/sea region pins ──────────────────────────────────────────────
const QUICK_PINS = [
  { label: 'Bay of Bengal',          lat: 14,  lon: 85,  alt: 2_500_000 },
  { label: 'Arabian Sea',            lat: 15,  lon: 65,  alt: 2_500_000 },
  { label: 'Andaman Sea',            lat: 10,  lon: 96,  alt: 1_500_000 },
  { label: 'Lakshadweep Sea',        lat: 12,  lon: 72,  alt: 1_200_000 },
  { label: 'Gulf of Mannar',         lat: 9,   lon: 79,  alt:   900_000 },
  { label: 'Palk Strait',            lat: 9.5, lon: 79.5,alt:   500_000 },
  { label: 'Gulf of Khambhat',       lat: 21,  lon: 72,  alt:   700_000 },
  { label: 'Gulf of Kutch',          lat: 22.5,lon: 69.5,alt:   600_000 },
];

export function ExplorerTopBar({ onSearchLocation, onReset }: ExplorerTopBarProps) {
  const { data: health } = useBackendHealth();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  
  // Replace useConsoleStore with useExplorerStore where appropriate
  // ExplorerStore currently uses resetView but doesn't have setSearchPin
  const resetView = useExplorerStore((s) => s.resetView);
  // We can just keep local state or ignore searchPin for now since it's just flying to location
  
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? QUICK_PINS.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_PINS;

  const selectPin = (lat: number, lon: number, label: string, alt: number) => {
    setQuery(label);
    setSelectedLabel(label);
    setOpen(false);
    onSearchLocation?.(lat, lon, alt);
  };

  const handleReset = () => {
    resetView();
    onReset?.();
    setQuery('');
    setSelectedLabel(null);
  };

  const showDropdown = open && filtered.length > 0;

  return (
    <header
      className="absolute top-0 left-0 right-0 z-50 h-12 flex items-center px-4 gap-4
                 bg-abyss/85 backdrop-blur-md border-b border-thermocline/25"
      role="banner"
    >
      {/* Home Button & Wordmark */}
      <div className="flex items-center gap-4 shrink-0" aria-label="OceanEmbed">
        <Link 
          href="/"
          className="flex items-center gap-1.5 text-foam-dim hover:text-white transition-colors"
          title="Return to Home"
        >
          <ArrowLeft size={14} />
          <span className="font-mono text-xs uppercase tracking-widest hidden sm:inline-block">Back</span>
        </Link>
        
        <div className="w-px h-5 bg-thermocline/25" />

        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="OceanEmbed Logo" className="w-5 h-5" />
          <span className="font-display font-semibold text-sm text-foam tracking-wide">
            OCEANEMBED
          </span>
          <span className="hidden lg:block text-2xs text-foam-dim tracking-widest uppercase font-mono ml-1">
            INCOIS
          </span>

          {/* Live Backend Connection Indicator */}
          {health?.status === 'healthy' ? (
            <div 
              className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-300 ml-1"
              title="OceanEmbed FastAPI v2 backend connected"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>API Online</span>
            </div>
          ) : (
            <div 
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-[9px] font-mono text-amber-300 ml-1 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
              title="OceanEmbed backend is spinning up or offline"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              </span>
              <span>Waking Up...</span>
            </div>
          )}
        </div>
      </div>

      {/* Live readout — center */}
      <div className="flex-1 flex items-center justify-center">
        <LiveReadout />
      </div>

      {/* Region search */}
      <div className="relative shrink-0" role="search">
        <label htmlFor="region-search" className="sr-only">Search ocean region or location</label>

        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-foam-dim pointer-events-none" aria-hidden="true" />
          <input
            ref={inputRef}
            id="region-search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { 
                setOpen(false); 
                inputRef.current?.blur(); 
              } else if (e.key === 'Enter') {
                // Try parsing as coordinates (e.g., "15.09, 48.59" or "15.09 48.59")
                const parts = query.trim().split(/[\s,]+/);
                if (parts.length === 2) {
                  const lat = parseFloat(parts[0]);
                  const lon = parseFloat(parts[1]);
                  if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                    // Zoom relatively close (800,000 meters altitude)
                    selectPin(lat, lon, `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`, 800_000);
                    inputRef.current?.blur();
                    return;
                  }
                }
                
                // Fallback to first text match
                if (filtered.length > 0) {
                  selectPin(filtered[0].lat, filtered[0].lon, filtered[0].label, filtered[0].alt);
                  inputRef.current?.blur();
                }
              }
            }}
            placeholder="Search region…"
            className="
              w-44 h-7 pl-7 pr-2 rounded text-xs font-mono
              bg-deep-panel/70 border border-thermocline/30
              text-foam placeholder:text-foam-dim/50
              focus:outline-none focus:border-biolume/50 focus:ring-1 focus:ring-biolume/25
              transition-all duration-200
            "
            aria-label="Search ocean region"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls="search-suggestions"
          />
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <ul
            id="search-suggestions"
            className="
              absolute top-full right-0 mt-1 w-56
              bg-[#07111f] border border-[#1a3050]
              rounded-lg overflow-y-auto z-50
              shadow-[0_8px_32px_rgba(0,0,0,0.7)]
              max-h-64
            "
            role="listbox"
            aria-label="Ocean region suggestions"
          >
            <li className="px-3 py-2 text-[10px] font-mono tracking-widest uppercase text-[#4a7090] border-b border-[#1a3050] select-none">
              Ocean Regions
            </li>
            {filtered.map((pin) => (
              <li key={pin.label} role="option" aria-selected={selectedLabel === pin.label}>
                <button
                  className="
                    w-full text-left px-3 py-2.5 text-xs font-ui
                    text-[#8ab4cc] hover:text-white hover:bg-[#0f2035]
                    focus:outline-none focus:bg-[#0f2035] focus:text-white
                    transition-colors duration-100
                    border-b border-[#0e1e30] last:border-0
                    flex items-center gap-2.5
                  "
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectPin(pin.lat, pin.lon, pin.label, pin.alt)}
                >
                  <MapPin size={10} className="text-[#2a8fa8] shrink-0" />
                  {pin.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>


      {/* Direct Link to Standalone 3D Cutaway Observatory */}
      <Link
        href="/cutaway"
        className="
          shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded text-2xs font-mono
          bg-cyan-500/15 border border-cyan-400/30 text-cyan-300
          hover:bg-cyan-500/25 hover:border-cyan-400/60 hover:text-white
          transition-all duration-200 shadow-sm
        "
        title="Open Standalone 3D Ocean Cutaway Observatory"
      >
        <Lightbulb size={11} className="text-cyan-400" />
        <span className="hidden sm:inline">3D Cutaway</span>
      </Link>

      {/* Reset view */}
      <button
        onClick={handleReset}
        className="
          shrink-0 w-7 h-7 flex items-center justify-center rounded
          border border-thermocline/30 text-foam-dim
          hover:text-biolume hover:border-biolume/40
          focus:outline-none focus:ring-2 focus:ring-biolume/40
          transition-colors
        "
        aria-label="Reset to Indian Ocean overview"
        title="Reset view"
      >
        <RefreshCw size={12} aria-hidden="true" />
      </button>
    </header>
  );
}
