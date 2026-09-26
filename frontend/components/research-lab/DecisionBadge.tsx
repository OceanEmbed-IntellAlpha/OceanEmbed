import React from 'react';
import { ExperimentStatus } from '@/lib/api/research-types';

const STATUS_CONFIG: Record<ExperimentStatus, { bg: string, text: string, ring: string, dot: string, label: string }> = {
  BASELINE: {
    bg: 'bg-zinc-800/50',
    text: 'text-zinc-400',
    ring: 'ring-zinc-700',
    dot: 'bg-zinc-500',
    label: 'Baseline Model'
  },
  PENDING: {
    bg: 'bg-zinc-800/50',
    text: 'text-zinc-400',
    ring: 'ring-zinc-700',
    dot: 'bg-zinc-500',
    label: 'In Progress'
  },
  TESTING: {
    bg: 'bg-zinc-800/50',
    text: 'text-zinc-300',
    ring: 'ring-zinc-600',
    dot: 'bg-zinc-400 animate-pulse',
    label: 'Testing'
  },
  COMPLETED: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    ring: 'ring-indigo-500/20',
    dot: 'bg-indigo-400',
    label: 'Completed'
  },
  KEEP: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    ring: 'ring-indigo-500/20',
    dot: 'bg-indigo-400',
    label: 'Adopted'
  },
  REJECTED: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    ring: 'ring-rose-500/20',
    dot: 'bg-rose-400',
    label: 'Rejected'
  },
  INCONCLUSIVE: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    ring: 'ring-amber-500/20',
    dot: 'bg-amber-400',
    label: 'Inconclusive'
  },
  VALIDATION: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    ring: 'ring-orange-500/20',
    dot: 'bg-orange-400',
    label: 'Validation'
  }
};

export function DecisionBadge({ status }: { status: ExperimentStatus }) {
  const config = STATUS_CONFIG[status];
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${config.bg} border border-${config.ring.replace('ring-', '')} backdrop-blur-md`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className={`font-mono text-[9px] font-bold tracking-widest uppercase ${config.text}`}>
        {config.label}
      </span>
    </div>
  );
}
