import React from 'react';
import { cn } from '@/lib/utils';

interface MonoValueProps {
  value: string | number | null | undefined;
  unit?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'foam' | 'biolume' | 'amber' | 'coral' | 'dim';
  className?: string;
  label?: string;
  loading?: boolean;
  'aria-label'?: string;
}

const sizeMap = {
  xs: 'text-[0.6rem]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
};

const colorMap = {
  foam: 'text-foam',
  biolume: 'text-biolume drop-shadow-[0_0_6px_rgba(76,224,210,0.5)]',
  amber: 'text-instrument-amber drop-shadow-[0_0_6px_rgba(232,163,61,0.5)]',
  coral: 'text-coral-delta drop-shadow-[0_0_6px_rgba(255,107,91,0.5)]',
  dim: 'text-foam-dim',
};

/**
 * MonoValue — renders every numeric value in IBM Plex Mono with correct
 * tabular numerals. Unit rendered in foam-dim at reduced size.
 * The single biggest lever for "looks like an instrument, not a website."
 */
export function MonoValue({
  value,
  unit,
  size = 'md',
  color = 'foam',
  className,
  label,
  loading = false,
  'aria-label': ariaLabel,
}: MonoValueProps) {
  if (loading) {
    return (
      <span
        className={cn('font-mono inline-flex items-center gap-1', sizeMap[size], className)}
        aria-label="Loading..."
        aria-busy="true"
      >
        <span className="text-foam-dim animate-pulse">——</span>
        {unit && <span className="text-foam-dim/60 text-[0.75em]">{unit}</span>}
      </span>
    );
  }

  const display = value === null || value === undefined ? '—' : String(value);

  return (
    <span
      className={cn(
        'font-mono inline-flex items-baseline gap-1',
        sizeMap[size],
        colorMap[color],
        className
      )}
      aria-label={ariaLabel ?? (label ? `${label}: ${display}${unit ? ' ' + unit : ''}` : undefined)}
    >
      {label && (
        <span className="text-foam-dim text-[0.7em] font-ui uppercase tracking-widest mr-1 not-italic">
          {label}
        </span>
      )}
      <span className="tabular-nums">{display}</span>
      {unit && (
        <span className="text-foam-dim text-[0.75em] font-normal">{unit}</span>
      )}
    </span>
  );
}
