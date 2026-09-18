'use client';

import { cn } from '@/lib/utils';

interface LoadingScanProps {
  label?: string;
  className?: string;
  compact?: boolean;
}

/**
 * LoadingScan — instrument-style animated scan line.
 * Replaces the generic spinner with a sonar/radar sweep aesthetic.
 */
export function LoadingScan({ label, className, compact = false }: LoadingScanProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)} role="status" aria-label={label ?? 'Loading'}>
        <div className="w-12 h-px bg-thermocline/40 relative overflow-hidden rounded">
          <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-transparent via-biolume to-transparent animate-[scan-h_1.2s_linear_infinite]" />
        </div>
        {label && (
          <span className="font-mono text-2xs text-foam-dim tracking-widest uppercase animate-pulse">
            {label}
          </span>
        )}
        <style jsx>{`
          @keyframes scan-h {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-8',
        className
      )}
      role="status"
      aria-label={label ?? 'Loading data'}
    >
      {/* Sonar circle */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border border-thermocline/30" />
        <div className="absolute inset-2 rounded-full border border-thermocline/20" />
        <div className="absolute inset-4 rounded-full border border-thermocline/15" />
        {/* Sweep */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ animation: 'sonar-sweep 1.8s linear infinite' }}
        >
          <div
            className="absolute top-1/2 left-1/2 w-1/2 h-px origin-left"
            style={{
              background: 'linear-gradient(to right, rgba(76,224,210,0.9), transparent)',
              transformOrigin: '0 50%',
              animation: 'sonar-sweep 1.8s linear infinite',
            }}
          />
        </div>
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-biolume" />
        </div>
      </div>

      {label && (
        <p className="font-mono text-xs text-foam-dim tracking-widest uppercase">
          {label}
        </p>
      )}

      <style jsx global>{`
        @keyframes sonar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
