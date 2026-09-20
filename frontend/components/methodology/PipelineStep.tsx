'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  Satellite, 
  Settings2, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  Compass, 
  Activity,
  LucideIcon 
} from 'lucide-react';

const ICONS_BY_NAME: Record<string, LucideIcon> = {
  satellite: Satellite,
  settings: Settings2,
  settings2: Settings2,
  cpu: Cpu,
  layers: Layers,
  check: CheckCircle2,
  checkCircle: CheckCircle2,
  compass: Compass,
};

interface PipelineStepProps {
  number: string;
  title: string;
  description: string;
  tags: string[];
  icon?: LucideIcon;
  iconName?: 'satellite' | 'settings' | 'settings2' | 'cpu' | 'layers' | 'check' | 'compass';
  isLast?: boolean;
}

export function PipelineStep({ number, title, description, tags, icon: Icon, iconName, isLast = false }: PipelineStepProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20% 0px -20% 0px" });
  const ResolvedIcon = (iconName ? ICONS_BY_NAME[iconName] : Icon) || Activity;

  return (
    <div ref={ref} className="relative flex w-full max-w-4xl mx-auto">
      {/* Vertical Line */}
      {!isLast && (
        <div className="absolute left-8 top-16 bottom-[-4rem] w-px bg-thermocline/20 z-0">
          <motion.div 
            className="w-full bg-biolume origin-top"
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: "easeInOut" }}
            style={{ height: '100%' }}
          />
        </div>
      )}

      {/* Node / Icon */}
      <div className="relative z-10 flex flex-col items-center mr-8 md:mr-12 shrink-0">
        <motion.div 
          className="w-16 h-16 rounded-full bg-deep-panel border border-thermocline/30 flex items-center justify-center shadow-[0_0_20px_rgba(76,224,210,0.1)] relative"
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {isInView && (
            <motion.div 
              className="absolute inset-0 rounded-full border border-biolume"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <ResolvedIcon className="text-biolume" size={24} />
        </motion.div>
      </div>

      {/* Content */}
      <motion.div 
        className="flex-1 pb-16 pt-0"
        initial={{ x: 50, opacity: 0 }}
        animate={isInView ? { x: 0, opacity: 1 } : { x: 50, opacity: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
      >
        <div className="bg-deep-panel/20 backdrop-blur-lg border border-white/5 rounded-2xl p-6 md:p-8 hover:bg-deep-panel/40 hover:border-thermocline/30 hover:shadow-[0_8px_32px_rgba(76,224,210,0.1)] transition-all duration-500 group">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-mono text-sm text-thermocline tracking-widest bg-thermocline/10 px-3 py-1 rounded-full group-hover:bg-thermocline/20 group-hover:text-biolume transition-colors">{number}</span>
            <h3 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight group-hover:text-biolume transition-colors duration-300">{title}</h3>
          </div>
          
          <p className="text-foam/80 text-base md:text-lg mb-8 leading-relaxed max-w-2xl group-hover:text-foam transition-colors duration-300">
            {description}
          </p>

          <div className="flex flex-wrap gap-2 mt-auto">
            {tags.map((tag, i) => (
              <span 
                key={i} 
                className="px-3 py-1 bg-black/30 border border-white/5 rounded-full font-mono text-[10px] md:text-xs text-foam-dim tracking-wider uppercase group-hover:border-white/20 group-hover:text-white transition-colors duration-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
