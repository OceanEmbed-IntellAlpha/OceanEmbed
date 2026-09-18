'use client';

import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { MonoValue } from '@/components/shared/MonoValue';

/**
 * LiveReadout — real-time lat/lon/depth + simulation time display.
 * Time reflects the currently selected timeline position in IST,
 * so it stays in sync with the ocean model data being rendered.
 */
export function LiveReadout() {
  const cursorLat = useExplorerStore((s) => s.cursorLat);
  const cursorLon = useExplorerStore((s) => s.cursorLon);
  const depth = useExplorerStore((s) => s.selectedDepth);
  const time = useExplorerStore((s) => s.selectedDate);

  // Simulation time converted to IST — stays in sync with the timeline scrubber
  const simTime = new Date(time).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
    hour12: false,
  });

  const displayLat = cursorLat !== null ? cursorLat.toFixed(2) : '10.00';
  const displayLon = cursorLon !== null ? cursorLon.toFixed(2) : '80.00';
  const latDir = parseFloat(displayLat) >= 0 ? 'N' : 'S';
  const lonDir = parseFloat(displayLon) >= 0 ? 'E' : 'W';

  return (
    <div
      className="hidden md:flex items-center gap-4"
      aria-label="Live position and time readout"
      role="status"
      aria-live="polite"
    >
      {/* Coordinates */}
      <div className="flex items-center gap-1">
        <MonoValue
          value={`${Math.abs(parseFloat(displayLat)).toFixed(2)}°${latDir}`}
          size="sm"
          color="biolume"
          aria-label={`Latitude: ${displayLat} degrees`}
        />
        <span className="text-thermocline text-xs">·</span>
        <MonoValue
          value={`${Math.abs(parseFloat(displayLon)).toFixed(2)}°${lonDir}`}
          size="sm"
          color="biolume"
          aria-label={`Longitude: ${displayLon} degrees`}
        />
      </div>

      {/* Divider */}
      <span className="w-px h-3 bg-thermocline/50" />

      {/* Depth */}
      <MonoValue
        value={depth === 0 ? 'SURFACE' : depth.toFixed(0)}
        unit={depth === 0 ? '' : 'm'}
        size="sm"
        color="amber"
        aria-label={`Current depth: ${depth === 0 ? 'surface' : depth + ' meters'}`}
      />

      {/* Divider */}
      <span className="w-px h-3 bg-thermocline/50" />

      {/* Simulation time in IST — updates with timeline scrubber */}
      <div className="flex items-center gap-1.5">
        <MonoValue
          value={simTime}
          unit="SIM·IST"
          size="sm"
          color="dim"
          aria-label={`Simulation time: ${simTime} IST`}
        />
      </div>
    </div>
  );
}
