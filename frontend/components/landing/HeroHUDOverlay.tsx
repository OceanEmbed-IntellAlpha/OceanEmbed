'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface HeroHUDOverlayProps {
  argoHovered?: boolean;
  gliderHovered?: boolean;
  onHoverArgo?: (hovered: boolean) => void;
  onHoverGlider?: (hovered: boolean) => void;
  argoTargetPos?: { x: number; y: number } | null;
  gliderTargetPos?: { x: number; y: number } | null;
}

export function HeroHUDOverlay({
  argoHovered: propArgoHovered = false,
  gliderHovered: propGliderHovered = false,
  onHoverArgo,
  onHoverGlider,
  argoTargetPos,
  gliderTargetPos,
}: HeroHUDOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const argoCardRef = useRef<HTMLDivElement>(null);
  const gliderCardRef = useRef<HTMLDivElement>(null);

  const [localArgoHover, setLocalArgoHover] = useState(false);
  const [localGliderHover, setLocalGliderHover] = useState(false);

  const isArgoActive = propArgoHovered || localArgoHover;
  const isGliderActive = propGliderHovered || localGliderHover;


  // Measure card connection anchor points
  const [cardPositions, setCardPositions] = useState<{
    argo?: { right: number; centerY: number };
    glider?: { left: number; centerY: number };
  }>({});

  const updateCardPositions = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    let argo: { right: number; centerY: number } | undefined;
    if (argoCardRef.current) {
      const rect = argoCardRef.current.getBoundingClientRect();
      argo = {
        right: rect.right - containerRect.left,
        centerY: rect.top + rect.height * 0.5 - containerRect.top,
      };
    }

    let glider: { left: number; centerY: number } | undefined;
    if (gliderCardRef.current) {
      const rect = gliderCardRef.current.getBoundingClientRect();
      glider = {
        left: rect.left - containerRect.left,
        centerY: rect.top + rect.height * 0.5 - containerRect.top,
      };
    }

    setCardPositions({ argo, glider });
  }, []);

  useEffect(() => {
    updateCardPositions();
    window.addEventListener('resize', updateCardPositions);

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        updateCardPositions();
      });
      ro.observe(containerRef.current);
      if (argoCardRef.current) ro.observe(argoCardRef.current);
      if (gliderCardRef.current) ro.observe(gliderCardRef.current);
    }

    const t1 = setTimeout(updateCardPositions, 100);
    const t2 = setTimeout(updateCardPositions, 350);
    const t3 = setTimeout(updateCardPositions, 800);

    return () => {
      window.removeEventListener('resize', updateCardPositions);
      ro?.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [updateCardPositions, argoTargetPos, gliderTargetPos]);

  // Compute ARGO FLOAT sleek hairline leader line
  const argoConnector = useMemo(() => {
    if (!cardPositions.argo || !argoTargetPos) return null;
    const startX = cardPositions.argo.right;
    const startY = cardPositions.argo.centerY;
    const tipX = argoTargetPos.x;
    const tipY = argoTargetPos.y;

    if (startX <= 0 || startY <= 0 || tipX <= 0 || tipY <= 0) return null;

    const dx = tipX - startX;
    const cp1X = startX + dx * 0.45;
    const cp1Y = startY;
    const cp2X = startX + dx * 0.55;
    const cp2Y = tipY;

    return {
      startX,
      startY,
      tipX,
      tipY,
      d: `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${tipX} ${tipY}`,
    };
  }, [cardPositions.argo, argoTargetPos]);

  // Compute GLIDER sleek hairline leader line
  const gliderConnector = useMemo(() => {
    if (!cardPositions.glider || !gliderTargetPos) return null;
    const startX = cardPositions.glider.left;
    const startY = cardPositions.glider.centerY;
    const tipX = gliderTargetPos.x;
    const tipY = gliderTargetPos.y;

    if (startX <= 0 || startY <= 0 || tipX <= 0 || tipY <= 0) return null;

    const dx = tipX - startX;
    const cp1X = startX + dx * 0.45;
    const cp1Y = startY;
    const cp2X = startX + dx * 0.55;
    const cp2Y = tipY;

    return {
      startX,
      startY,
      tipX,
      tipY,
      d: `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${tipX} ${tipY}`,
    };
  }, [cardPositions.glider, gliderTargetPos]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[4] pointer-events-none overflow-hidden select-none"
    >
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MINIMAL HAIRLINE LEADER LINES (Calibrated Technical Guide Lines)   */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[2] overflow-visible">
        {/* 1. ARGO FLOAT CONNECTOR */}
        {argoConnector && (
          <g className="transition-opacity duration-300">
            <path
              d={argoConnector.d}
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="4 3"
              fill="none"
              strokeLinecap="round"
              opacity={isArgoActive ? 0.85 : 0.4}
            />
            <circle
              cx={argoConnector.startX}
              cy={argoConnector.startY}
              r="2"
              fill="#38bdf8"
              opacity={isArgoActive ? 1 : 0.7}
            />
            <circle
              cx={argoConnector.tipX}
              cy={argoConnector.tipY}
              r="4"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1"
              opacity={isArgoActive ? 0.7 : 0.35}
            />
            <circle
              cx={argoConnector.tipX}
              cy={argoConnector.tipY}
              r="2"
              fill="#38bdf8"
              opacity={isArgoActive ? 1 : 0.8}
            />
          </g>
        )}

        {/* 2. GLIDER CONNECTOR */}
        {gliderConnector && (
          <g className="transition-opacity duration-300">
            <path
              d={gliderConnector.d}
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="4 3"
              fill="none"
              strokeLinecap="round"
              opacity={isGliderActive ? 0.85 : 0.4}
            />
            <circle
              cx={gliderConnector.startX}
              cy={gliderConnector.startY}
              r="2"
              fill="#fbbf24"
              opacity={isGliderActive ? 1 : 0.7}
            />
            <circle
              cx={gliderConnector.tipX}
              cy={gliderConnector.tipY}
              r="4"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1"
              opacity={isGliderActive ? 0.7 : 0.35}
            />
            <circle
              cx={gliderConnector.tipX}
              cy={gliderConnector.tipY}
              r="2"
              fill="#fbbf24"
              opacity={isGliderActive ? 1 : 0.8}
            />
          </g>
        )}
      </svg>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 1. LEFT HUD: ARGO PROFILING FLOAT TELEMETRY SPEC CARD             */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div
        ref={argoCardRef}
        onMouseEnter={() => {
          setLocalArgoHover(true);
          onHoverArgo?.(true);
        }}
        onMouseLeave={() => {
          setLocalArgoHover(false);
          onHoverArgo?.(false);
        }}
        className={`
          hidden sm:block absolute pointer-events-auto transition-all duration-300 z-10
          left-4 md:left-6 lg:left-8 top-[24%] md:top-[26%]
          ${isArgoActive ? 'scale-[1.02]' : 'scale-100'}
        `}
      >
        <div
          onClick={() => {}}
          className="
            group cursor-pointer flex flex-col w-[230px] md:w-[245px]
            p-3 rounded-xl border border-white/[0.08] bg-[#020b14]/85 backdrop-blur-xl
            shadow-[0_16px_40px_rgba(0,0,0,0.6)]
            hover:border-cyan-400/40 hover:bg-[#031120]/90
            transition-all duration-200
          "
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-1 mb-2">
            <div>
              <span className="block font-mono text-[8.5px] uppercase tracking-[0.16em] text-foam-dim/50 font-medium">
                Profiling Float
              </span>
              <span className="font-mono text-[11px] font-semibold text-white tracking-tight whitespace-nowrap">
                Argo · WMO 2903341
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="
                  flex items-center gap-1 font-mono text-[9px] font-medium
                  text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20
                  border border-cyan-500/25 px-1.5 py-0.5 rounded transition-colors
                "
                title="Inspect 3D Device"
              >
                <span>3D</span>
                <ExternalLink size={8.5} />
              </button>
              <Link
                href="/argo"
                onClick={(e) => e.stopPropagation()}
                className="
                  flex items-center gap-0.5 font-mono text-[9px] font-medium
                  text-teal-300 hover:text-white bg-teal-500/10 hover:bg-teal-500/20
                  border border-teal-500/25 px-1.5 py-0.5 rounded transition-colors
                "
                title="Open Educational Learning Lab"
              >
                <span>LAB</span>
              </Link>
            </div>
          </div>

          {/* Metrics Matrix (3 Clean Tabular Columns) */}
          <div className="grid grid-cols-3 gap-1 py-1.5 border-y border-white/[0.06] text-left">
            <div>
              <span className="block font-mono text-[8.5px] tracking-wider text-foam-dim/50 uppercase">Temp</span>
              <span className="font-mono text-[11px] font-semibold text-white">24.5°C</span>
            </div>
            <div>
              <span className="block font-mono text-[8.5px] tracking-wider text-foam-dim/50 uppercase">Salinity</span>
              <span className="font-mono text-[11px] font-semibold text-white">35.1 PSU</span>
            </div>
            <div>
              <span className="block font-mono text-[8.5px] tracking-wider text-foam-dim/50 uppercase">Depth</span>
              <span className="font-mono text-[11px] font-semibold text-white">200m</span>
            </div>
          </div>

          {/* Geographic Metadata */}
          <div className="flex items-center justify-between pt-1.5 text-[9.5px]">
            <div className="flex items-center gap-1 font-mono text-foam-dim/60">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>14.8°N, 68.2°E</span>
            </div>
            <span className="font-ui text-foam-dim/50 font-medium">Arabian Sea</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 2. RIGHT HUD: UNDERWATER GLIDER TELEMETRY SPEC CARD               */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div
        ref={gliderCardRef}
        onMouseEnter={() => {
          setLocalGliderHover(true);
          onHoverGlider?.(true);
        }}
        onMouseLeave={() => {
          setLocalGliderHover(false);
          onHoverGlider?.(false);
        }}
        className={`
          hidden sm:block absolute pointer-events-auto transition-all duration-300 z-10
          right-4 md:right-6 lg:right-8 top-[24%] md:top-[26%]
          ${isGliderActive ? 'scale-[1.02]' : 'scale-100'}
        `}
      >
        <div
          onClick={() => {}}
          className="
            group cursor-pointer flex flex-col w-[230px] md:w-[245px]
            p-3 rounded-xl border border-white/[0.08] bg-[#020b14]/85 backdrop-blur-xl
            shadow-[0_16px_40px_rgba(0,0,0,0.6)]
            hover:border-amber-400/40 hover:bg-[#031120]/90
            transition-all duration-200
          "
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-1 mb-2">
            <div>
              <span className="block font-mono text-[8.5px] uppercase tracking-[0.16em] text-foam-dim/50 font-medium">
                Autonomous Vehicle
              </span>
              <span className="font-mono text-[11px] font-semibold text-white tracking-tight whitespace-nowrap">
                Glider · SG-642
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="
                flex items-center gap-1 font-mono text-[9px] font-medium
                text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20
                border border-amber-500/25 px-1.5 py-0.5 rounded transition-colors
                shrink-0
              "
            >
              <span>3D</span>
              <ExternalLink size={8.5} />
            </button>
          </div>

          {/* Metrics Matrix (3 Clean Tabular Columns) */}
          <div className="grid grid-cols-3 gap-1 py-1.5 border-y border-white/[0.06] text-left">
            <div>
              <span className="block font-mono text-[8.5px] tracking-wider text-foam-dim/50 uppercase">Temp</span>
              <span className="font-mono text-[11px] font-semibold text-white">21.8°C</span>
            </div>
            <div>
              <span className="block font-mono text-[8.5px] tracking-wider text-foam-dim/50 uppercase">Salinity</span>
              <span className="font-mono text-[11px] font-semibold text-white">34.9 PSU</span>
            </div>
            <div>
              <span className="block font-mono text-[8.5px] tracking-wider text-foam-dim/50 uppercase">Dive</span>
              <span className="font-mono text-[11px] font-semibold text-white">500m</span>
            </div>
          </div>

          {/* Geographic Metadata */}
          <div className="flex items-center justify-between pt-1.5 text-[9.5px]">
            <div className="flex items-center gap-1 font-mono text-foam-dim/60">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>11.2°N, 86.4°E</span>
            </div>
            <span className="font-ui text-foam-dim/50 font-medium">Bay of Bengal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
