import React from 'react';
import { Database, Link as LinkIcon, Box } from 'lucide-react';
import type { DatasetCard as DatasetCardType } from '@/lib/api/types';

interface DatasetCardProps {
  dataset: DatasetCardType;
}

export function DatasetCard({ dataset }: DatasetCardProps) {
  const roleColor = 
    dataset.role === 'input' ? 'text-surface-signal bg-surface-signal/10 border-surface-signal/20' :
    dataset.role === 'training_target' ? 'text-reconstruction bg-reconstruction/10 border-reconstruction/20' :
    'text-argo-obs bg-argo-obs/10 border-argo-obs/20';

  const roleLabel = 
    dataset.role === 'input' ? 'Input Feature' :
    dataset.role === 'training_target' ? 'Training Target' :
    'Validation Truth';

  return (
    <div className="bg-deep-panel/50 border border-thermocline/20 rounded-lg p-5 flex flex-col gap-4 hover:border-biolume/30 transition-colors group">
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-black/40 border border-white/5 flex items-center justify-center shrink-0 group-hover:border-biolume/50 transition-colors">
            <Database size={18} className="text-foam-dim group-hover:text-biolume transition-colors" />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-lg tracking-tight">{dataset.id}</h3>
            <p className="font-mono text-[10px] text-foam-dim uppercase tracking-wider">{dataset.name}</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-mono tracking-widest uppercase border ${roleColor}`}>
          {roleLabel}
        </div>
      </div>

      {/* Grid details */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[9px] text-foam-dim/60 uppercase tracking-widest">Variable</span>
          <span className="font-mono text-xs text-foam">{dataset.variable}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[9px] text-foam-dim/60 uppercase tracking-widest">Spatial Res</span>
          <span className="font-mono text-xs text-foam">{dataset.resolution}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[9px] text-foam-dim/60 uppercase tracking-widest">Temporal Res</span>
          <span className="font-mono text-xs text-foam">{dataset.temporal}</span>
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-auto pt-4 border-t border-thermocline/20 flex items-center gap-4">
        {dataset.url && (
          <a 
            href={dataset.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-[10px] text-biolume/70 hover:text-biolume uppercase tracking-wider transition-colors"
          >
            <LinkIcon size={12} />
            Data Source
          </a>
        )}
        {dataset.doi && (
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-foam-dim uppercase tracking-wider">
            <Box size={12} />
            DOI: {dataset.doi}
          </div>
        )}
      </div>

    </div>
  );
}
