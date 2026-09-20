import React from 'react';
import { ExperimentStatus } from '@/lib/api/research-types';

const STATUS_CONFIG: Record<ExperimentStatus, { bg: string, text: string, ring: string, dot: string, label: string }> = {
  BASELINE: {
    bg: 'bg-white/5',
    text: 'text-white/80',
    ring: 'ring-white/10',
    dot: 'bg-white/50',
    label: 'Baseline Model'
  },
  PENDING: {
    bg: 'bg-foam-dim/5',
    text: 'text-foam-dim',
    ring: 'ring-foam-dim/20',
    dot: 'bg-foam-dim/50',
    label: 'In Progress'
  },
  TESTING: {
    bg: 'bg-foam-dim/5',
    text: 'text-foam-dim',
    ring: 'ring-foam-dim/20',
    dot: 'bg-foam-dim animate-pulse',
    label: 'Testing'
  },
  COMPLETED: {
    bg: 'bg-biolume/5',
    text: 'text-biolume',
    ring: 'ring-biolume/20',
    dot: 'bg-biolume',
    label: 'Completed'
  },
  KEEP: {
    bg: 'bg-biolume/5',
    text: 'text-biolume',
    ring: 'ring-biolume/20',
    dot: 'bg-biolume animate-pulse shadow-[0_0_8px_#4CE0D2]',
    label: 'Adopted'
  },
  REJECTED: {
    bg: 'bg-validation-error/5',
    text: 'text-validation-error',
    ring: 'ring-validation-error/20',
    dot: 'bg-validation-error',
    label: 'Rejected'
  },
  INCONCLUSIVE: {
    bg: 'bg-instrument-amber/5',
    text: 'text-instrument-amber',
    ring: 'ring-instrument-amber/20',
    dot: 'bg-instrument-amber',
    label: 'Inconclusive'
  },
  VALIDATION: {
    bg: 'bg-validation-warn/5',
    text: 'text-validation-warn',
    ring: 'ring-validation-warn/20',
    dot: 'bg-validation-warn',
    label: 'Validation'
  }
};

export function DecisionBadge({ status }: { status: ExperimentStatus }) {
  const config = STATUS_CONFIG[status];
  
  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full ${config.bg} ring-1 ${config.ring} backdrop-blur-md`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className={`font-mono text-[10px] font-medium tracking-[0.2em] uppercase ${config.text}`}>
        {config.label}
      </span>
    </div>
  );
}
