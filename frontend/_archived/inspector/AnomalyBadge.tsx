'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface AnomalyBadgeProps {
  type: 'warning' | 'critical';
  label?: string;
  className?: string;
}

/**
 * AnomalyBadge — amber (notable) or coral (critical) anomaly flag.
 * Never uses color as the only signal — includes an icon.
 */
export function AnomalyBadge({ type, label, className }: AnomalyBadgeProps) {
  const isWarning = type === 'warning';

  return (
    <span
      role="alert"
      aria-label={label ?? (isWarning ? 'Anomaly detected' : 'Critical anomaly')}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-2xs tracking-widest border',
        isWarning
          ? 'text-instrument-amber border-instrument-amber/40 bg-instrument-amber/10'
          : 'text-coral-delta border-coral-delta/40 bg-coral-delta/10',
        className
      )}
    >
      <AlertTriangle size={9} aria-hidden="true" />
      <span>{label ?? (isWarning ? 'ANOMALY' : 'CRITICAL')}</span>
    </span>
  );
}
