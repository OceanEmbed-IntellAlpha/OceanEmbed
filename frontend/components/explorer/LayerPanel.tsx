'use client';

import React from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { Layers, Activity, Droplet, Wind, Eye, Network } from 'lucide-react';

export function LayerPanel() {
  const {
    showSST, showSSS, showSSH, showCurrents, showWinds,
    showSubsurfaceTemp, showEmbedding, showConfidence, showArgoPoints,
    toggleLayer
  } = useExplorerStore();

  const LayerToggle = ({ label, active, field, icon }: { label: string, active: boolean, field: any, icon?: React.ReactNode }) => (
    <div 
      className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
        active 
          ? 'bg-biolume/10 border-biolume/40 text-white shadow-[inset_0_0_20px_rgba(0,210,255,0.05)]' 
          : 'bg-white/[0.02] border-white/5 text-foam-dim hover:bg-white/[0.05] hover:border-white/10'
      }`}
      onClick={() => toggleLayer(field)}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span className={`transition-colors duration-300 ${active ? 'text-biolume drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]' : 'text-foam-dim group-hover:text-foam'}`}>
            {icon}
          </span>
        )}
        <span className="text-xs font-medium tracking-wide leading-snug">{label}</span>
      </div>
      
      {/* Animated Toggle Switch */}
      <div className={`shrink-0 relative w-8 h-4 rounded-full transition-colors duration-300 ${active ? 'bg-biolume/30 border border-biolume/50' : 'bg-black/50 border border-white/10'}`}>
        <div 
          className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            active ? 'translate-x-4 bg-biolume shadow-[0_0_8px_rgba(0,210,255,0.8)]' : 'translate-x-0 bg-foam-dim/50'
          }`} 
        />
      </div>
    </div>
  );

  return (
    <div className="w-full flex-grow min-h-0 flex flex-col overflow-hidden glass-panel">
      <div className="p-5 border-b border-white/5 bg-black/20">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-biolume font-bold flex items-center gap-2 drop-shadow-[0_0_8px_rgba(0,210,255,0.4)]">
          <Layers size={14} /> Data Layers
        </h2>
      </div>
      
      <div className="p-5 flex-grow overflow-y-auto space-y-8 console-scroll min-h-0" data-lenis-prevent="true">
        
        {/* Surface Satellite Inputs */}
        <div className="space-y-3 relative">
          <div className="absolute -left-3 top-0 bottom-0 w-[2px] bg-gradient-to-b from-white/20 to-transparent rounded-full"></div>
          <h3 className="text-[10px] font-mono text-foam-dim/80 uppercase tracking-[0.15em] pl-1">Surface Boundary Inputs</h3>
          <div className="space-y-2">
            <LayerToggle label="Sea Surface Temp (SST)" active={showSST} field="showSST" icon={<Activity size={16}/>} />
            <LayerToggle label="Sea Surface Salinity" active={showSSS} field="showSSS" icon={<Droplet size={16}/>} />
            <LayerToggle label="Sea Level Anomaly" active={showSSH} field="showSSH" icon={<Waves size={16}/>} />
            <LayerToggle label="Surface Currents" active={showCurrents} field="showCurrents" icon={<Network size={16}/>} />
            <LayerToggle label="Surface Winds" active={showWinds} field="showWinds" icon={<Wind size={16}/>} />
          </div>
        </div>

        {/* Deep Embedding Output */}
        <div className="space-y-3 relative">
          <div className="absolute -left-3 top-0 bottom-0 w-[2px] bg-gradient-to-b from-biolume/50 to-transparent drop-shadow-[0_0_5px_rgba(0,210,255,0.5)] rounded-full"></div>
          <h3 className="text-[10px] font-mono text-biolume/80 uppercase tracking-[0.15em] pl-1">OceanEmbed Output</h3>
          <div className="space-y-2">
            <LayerToggle label="Subsurface Temperature" active={showSubsurfaceTemp} field="showSubsurfaceTemp" icon={<Eye size={16}/>} />
            <LayerToggle label="Deep Embedding Space" active={showEmbedding} field="showEmbedding" icon={<Layers size={16}/>} />
            <LayerToggle label="Model Confidence" active={showConfidence} field="showConfidence" icon={<Activity size={16}/>} />
          </div>
        </div>

        {/* Validation */}
        <div className="space-y-3 relative">
          <div className="absolute -left-3 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#10B981]/50 to-transparent rounded-full"></div>
          <h3 className="text-[10px] font-mono text-[#10B981]/80 uppercase tracking-[0.15em] pl-1">Ground Truth</h3>
          <div className="space-y-2">
            <LayerToggle label="ARGO Float Network" active={showArgoPoints} field="showArgoPoints" icon={<Target size={16}/>} />
          </div>
        </div>

      </div>
    </div>
  );
}

// Temporary icon fallbacks since we didn't import all
function Waves(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6c.6 0 1.2-.2 1.8-.6.5-.3 1.1-.6 1.7-.6s1.2.3 1.7.6c.6.4 1.2.6 1.8.6.6 0 1.2-.2 1.8-.6.5-.3 1.1-.6 1.7-.6s1.2.3 1.7.6c.6.4 1.2.6 1.8.6.6 0 1.2-.2 1.8-.6.5-.3 1.1-.6 1.7-.6s1.2.3 1.7.6c.6.4 1.2.6 1.8.6"/><path d="M2 12c.6 0 1.2-.2 1.8-.6.5-.3 1.1-.6 1.7-.6s1.2.3 1.7.6c.6.4 1.2.6 1.8.6.6 0 1.2-.2 1.8-.6.5-.3 1.1-.6 1.7-.6s1.2.3 1.7.6c.6.4 1.2.6 1.8.6.6 0 1.2-.2 1.8-.6.5-.3 1.1-.6 1.7-.6s1.2.3 1.7.6c.6.4 1.2.6 1.8.6.6 0 1.2-.2 1.8-.6.5-.3 1.1-.6 1.7-.6s1.2.3 1.7.6c.6.4 1.2.6 1.8.6"/><path d="M2 18c.6 0 1.2-.2 1.8-.6.5-.3 1.1-.6 1.7-.6s1.2.3 1.7.6c.6.4 1.2.6 1.8.6.6 0 1.2-.2 1.8-.6.5-.3 1.1-.6 1.7-.6s1.2.3 1.7.6c.6.4 1.2.6 1.8.6.6 0 1.2-.2 1.8-.6.5-.3 1.1-.6 1.7-.6s1.2.3 1.7.6c.6.4 1.2.6 1.8.6"/></svg> }
function Target(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> }
