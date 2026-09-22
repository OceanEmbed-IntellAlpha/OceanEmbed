import React from 'react';
import { Layers, Cpu, Database } from 'lucide-react';

const TechStackStrip = () => {
  const stack = [
    {
      category: "Frontend & Visualization",
      icon: <Layers className="w-4 h-4 text-slate-400" />,
      items: ["Next.js 14", "React", "Tailwind CSS", "CesiumJS", "Zustand"]
    },
    {
      category: "AI & Pipeline",
      icon: <Cpu className="w-4 h-4 text-slate-400" />,
      items: ["PyTorch", "FastAPI", "ONNX Runtime", "Scikit-Learn"]
    },
    {
      category: "Data Engineering",
      icon: <Database className="w-4 h-4 text-slate-400" />,
      items: ["Xarray", "NetCDF4", "Zarr", "Pandas"]
    }
  ];

  return (
    <section className="w-full bg-[#02050A] py-16 px-6 md:px-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-12 md:gap-8 justify-between items-start md:items-center">
        
        <div className="flex-shrink-0">
          <p className="text-slate-500 font-mono text-xs tracking-widest uppercase mb-2">Powered By</p>
          <h3 className="text-xl font-medium text-slate-300">Modern Architecture</h3>
        </div>

        <div className="flex flex-col md:flex-row w-full justify-end gap-10 lg:gap-16">
          {stack.map((group, idx) => (
            <div key={idx} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {group.icon}
                <span className="text-slate-400 font-mono text-xs uppercase tracking-wider">{group.category}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item, i) => (
                  <span 
                    key={i} 
                    className="text-slate-300 text-sm px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-colors cursor-default"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default TechStackStrip;
