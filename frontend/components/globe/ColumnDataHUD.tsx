'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { X, Thermometer, Droplets, MapPin, Compass } from 'lucide-react';
import { getZone, interpolate } from '@/components/cutaway/utils';

// ── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  depths: number[];
  temperature: number[];
}

interface ColumnDataHUDProps {
  viewer: unknown | null;
}

/**
 * ColumnDataHUD — a floating glassmorphic data overlay that tracks the
 * water column position on screen using Cesium's wgs84ToWindowCoordinates.
 * Shows depth readouts, temperature/salinity at the scan plane, zone info,
 * and a compact inline sparkline SVG.
 */
export default function ColumnDataHUD({ viewer }: ColumnDataHUDProps) {
  const { selectedLat: focusLat, selectedLon: focusLon, selectedDepth: depth, resetView, setMode, selectedDate } = useExplorerStore();
  const variable = 'temperature';

  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const rafRef = useRef<number>(0);
  const cesiumRef = useRef<typeof import('cesium') | null>(null);

  const isOpen = focusLat !== null && focusLon !== null;

  // ── Fetch profile when focus changes ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: focusLat, lon: focusLon, date: selectedDate })
      }).then(r => r.json())
    ])
      .then(([tData]) => {
        if (cancelled) return;
        if (tData.depths && tData.depths.length > 0) {
          setProfile({
            depths: tData.depths,
            temperature: tData.temperature,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [focusLat, focusLon, isOpen, selectedDate]);

  // ── Track screen position using Cesium scene transforms ──────────────────
  const updateScreenPos = useCallback(() => {
    if (!viewer || !isOpen || !cesiumRef.current) {
      rafRef.current = requestAnimationFrame(updateScreenPos);
      return;
    }

    const Cesium = cesiumRef.current;
    const v = viewer as {
      scene: {
        globe: { ellipsoid: unknown };
        cartesianToCanvasCoordinates(pos: unknown, result?: unknown): { x: number; y: number } | undefined;
      };
      canvas: { width: number; height: number };
    };

    try {
      // Position the HUD at the east edge of the water column, at surface level
      const FOOTPRINT_HALF = 1.0; // half of 2°
      const worldPos = Cesium.Cartesian3.fromDegrees(
        focusLon! + FOOTPRINT_HALF + 0.5,
        focusLat!,
        0
      );

      const canvasPos = v.scene.cartesianToCanvasCoordinates(worldPos);
      if (canvasPos) {
        setScreenPos({ x: canvasPos.x, y: canvasPos.y });
      }
    } catch {
      // Scene not ready yet
    }

    rafRef.current = requestAnimationFrame(updateScreenPos);
  }, [viewer, isOpen, focusLat, focusLon]);

  useEffect(() => {
    if (!viewer) return;

    import('cesium').then((Cesium) => {
      cesiumRef.current = Cesium;
      rafRef.current = requestAnimationFrame(updateScreenPos);
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [viewer, updateScreenPos]);

  // ── Derived values ──────────────────────────────────────────────────────
  const zone = getZone(depth);
  const tempVal = profile ? interpolate(profile.depths, profile.temperature, depth) : null;

  const latStr = focusLat !== null ? `${Math.abs(focusLat).toFixed(2)}°${focusLat >= 0 ? 'N' : 'S'}` : '';
  const lonStr = focusLon !== null ? `${Math.abs(focusLon).toFixed(2)}°${focusLon >= 0 ? 'E' : 'W'}` : '';

  // ── Compact sparkline SVG ───────────────────────────────────────────────
  const sparklinePath = (() => {
    if (!profile) return '';
    const values = profile.temperature;
    const depths = profile.depths;
    if (values.length === 0) return '';

    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const rangeV = maxV - minV || 1;
    const maxD = Math.max(...depths);

    const w = 100;
    const h = 48;

    const points = depths.map((d, i) => {
      const x = (d / maxD) * w;
      const y = h - ((values[i] - minV) / rangeV) * h;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  })();

  // ── Current depth marker position on sparkline ──────────────────────────
  const depthMarkerX = (() => {
    if (!profile || profile.depths.length === 0) return 0;
    const maxD = Math.max(...profile.depths);
    return (depth / maxD) * 100;
  })();

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-[60] pointer-events-none"
      style={{
        left: screenPos ? screenPos.x : '60%',
        top: screenPos ? Math.max(80, Math.min(screenPos.y - 120, window.innerHeight - 400)) : '20%',
        transform: 'translate(0, 0)',
        transition: 'left 0.15s ease-out, top 0.15s ease-out',
      }}
    >
      <div
        className="pointer-events-auto w-[280px] animate-fade-in"
        style={{
          background: 'rgba(10, 15, 21, 0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(76, 224, 210, 0.15)',
          borderRadius: '12px',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(76, 224, 210, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={12} className="text-[#4CE0D2] shrink-0" />
            <span className="font-mono text-[0.65rem] tracking-wider text-[#d4f0f5]/80 truncate">
              {latStr} | {lonStr}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMode('dive')}
              className="px-2 py-0.5 rounded bg-[#4CE0D2]/20 border border-[#4CE0D2]/40 text-[#4CE0D2] hover:bg-[#4CE0D2]/30 text-[0.6rem] font-mono uppercase tracking-wider flex items-center gap-1 transition-all"
              title="Dive inside this water column"
            >
              <Compass size={11} />
              Dive In
            </button>
            <button
              onClick={() => resetView()}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close water column"
            >
              <X size={12} className="text-white/50 hover:text-white" />
            </button>
          </div>
        </div>

        {/* ── Depth Readout ────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-white/[0.04]">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-light text-white tracking-tight">{depth}</span>
            <span className="font-mono text-xs text-white/40">m</span>
            <span className="ml-auto font-mono text-[0.55rem] tracking-widest uppercase" style={{ color: zone.accentHex }}>
              {zone.name}
            </span>
          </div>
          <div className="font-ui text-[0.6rem] text-[#8FA5AC]/60 mt-0.5">
            {zone.alias} — {zone.desc.slice(0, 60)}…
          </div>
        </div>

        {/* ── Variable Cards ────────────────────────────────────────────── */}
        <div className="bg-white/[0.04]">
          <div className={`px-3 py-2.5 bg-[#ea641e]/[0.08]`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Thermometer size={11} className="text-[#ff9e5e]" />
              <span className="font-mono text-[0.5rem] tracking-widest text-[#8FA5AC] uppercase">Temp</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-lg font-semibold text-white">
                {loading ? '—' : tempVal !== null ? tempVal.toFixed(1) : '—'}
              </span>
              <span className="font-mono text-[0.55rem] text-white/40">°C</span>
            </div>
          </div>
        </div>

        {/* ── Sparkline ─────────────────────────────────────────────────── */}
        {profile && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[0.5rem] tracking-widest text-[#8FA5AC] uppercase">
                Temp Profile
              </span>
              <span className="font-mono text-[0.5rem] text-white/30">0 → 2000m</span>
            </div>
            <div className="relative w-full h-12 bg-white/[0.02] rounded border border-white/[0.04] overflow-hidden">
              <svg
                viewBox="0 0 100 48"
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                {/* Profile curve */}
                <path
                  d={sparklinePath}
                  fill="none"
                  stroke="#ff9e5e"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Current depth marker */}
                <line
                  x1={depthMarkerX}
                  y1={0}
                  x2={depthMarkerX}
                  y2={48}
                  stroke="#4CE0D2"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
