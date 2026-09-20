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
    <div className="bg-deep-panel/40 backdrop-blur-md border border-thermocline/10 rounded-xl p-6 flex flex-col gap-5 hover:bg-deep-panel/60 hover:border-thermocline/40 hover:shadow-[0_8px_32px_rgba(76,224,210,0.1)] transition-all duration-500 group relative overflow-hidden">
      
      {/* Background Glow on Hover */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-biolume/5 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center shrink-0 group-hover:border-biolume/50 group-hover:bg-black/80 transition-all duration-300">
            <Database size={20} className="text-foam-dim group-hover:text-biolume transition-colors duration-300" />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-lg tracking-tight group-hover:text-biolume transition-colors duration-300">{dataset.id}</h3>
            <p className="font-mono text-[11px] text-foam-dim uppercase tracking-wider">{dataset.name}</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded border text-[10px] font-mono tracking-widest uppercase ${roleColor} shadow-sm`}>
          {roleLabel}
        </div>
      </div>

      {/* Grid details */}
      <div className="grid grid-cols-2 gap-5 mt-2 relative z-10 p-4 bg-black/20 rounded-lg border border-white/5 group-hover:border-white/10 transition-colors">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] text-foam-dim/60 uppercase tracking-widest">Variable</span>
          <span className="font-mono text-xs text-foam font-semibold">{dataset.variable}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] text-foam-dim/60 uppercase tracking-widest">Spatial Res</span>
          <span className="font-mono text-xs text-foam font-semibold">{dataset.resolution}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] text-foam-dim/60 uppercase tracking-widest">Temporal Res</span>
          <span className="font-mono text-xs text-foam font-semibold">{dataset.temporal}</span>
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-auto pt-5 border-t border-thermocline/10 flex items-center gap-5 relative z-10">
        {dataset.url && (
          <a 
            href={dataset.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-mono text-[11px] text-biolume/80 hover:text-biolume uppercase tracking-wider transition-colors"
          >
            <LinkIcon size={14} />
            Data Source
          </a>
        )}
        {dataset.doi && (
          <div className="flex items-center gap-2 font-mono text-[11px] text-foam-dim uppercase tracking-wider group-hover:text-foam-dim/80">
            <Box size={14} />
            DOI: {dataset.doi}
          </div>
        )}
      </div>

    </div>
  );
}
