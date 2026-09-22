import React from 'react';
import { Shield, Fish, Thermometer, Anchor, Waves } from 'lucide-react';

const ImpactSection = () => {
  const impacts = [
    {
      icon: <Shield className="w-8 h-8 text-cyan-400" />,
      title: "Defense & Naval Operations",
      description: "Enhance acoustic propagation modeling and sonar range prediction by accurately resolving the thermocline depth and sound speed profiles.",
    },
    {
      icon: <Fish className="w-8 h-8 text-cyan-400" />,
      title: "Marine Biology & Fisheries",
      description: "Identify Potential Fishing Zones (PFZ) and track marine habitat shifts caused by changing subsurface temperature gradients.",
    },
    {
      icon: <Thermometer className="w-8 h-8 text-cyan-400" />,
      title: "Climate Science",
      description: "Monitor Ocean Heat Content (OHC) and extreme marine heatwaves to better understand long-term global thermodynamic shifts.",
    },
  ];

  return (
    <section className="relative w-full bg-[#030812] py-24 px-6 md:px-12 lg:px-24 border-t border-white/5">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-[#030812]/0 to-[#030812]/0"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
          <p className="text-cyan-400 font-mono text-xs md:text-sm tracking-[0.2em] uppercase">
            Real-World Impact
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Why Subsurface State Matters
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg pt-4">
            Reconstructing the 3D thermal structure of the ocean is critical for applications that depend on understanding the hidden dynamics beneath the surface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {impacts.map((impact, index) => (
            <div 
              key={index} 
              className="group relative flex flex-col p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 transition-all duration-300 hover:bg-white/[0.04]"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
              
              <div className="mb-6 p-4 rounded-xl bg-cyan-950/30 w-fit border border-cyan-900/50">
                {impact.icon}
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-3">
                {impact.title}
              </h3>
              
              <p className="text-slate-400 leading-relaxed text-sm">
                {impact.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImpactSection;
