'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Layers, ShieldCheck, Sparkles } from 'lucide-react';

export interface ArchitectureBlock {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  description: string;
  tensorShape: string;
  formula: string;
  codeSnippet?: string;
  physicalMeaning: string;
}

interface ArchitectureModalProps {
  block: ArchitectureBlock | null;
  onClose: () => void;
}

export function ArchitectureModal({ block, onClose }: ArchitectureModalProps) {
  if (!block) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-2xl bg-[#030B18] border border-biolume/40 p-5 sm:p-6 shadow-[0_0_50px_rgba(76,224,210,0.18)] flex flex-col gap-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <span className="px-2 py-0.5 rounded bg-biolume/20 border border-biolume/40 font-mono text-[10px] text-biolume uppercase tracking-widest font-semibold">
                {block.tag}
              </span>
              <h3 className="font-display text-xl font-bold text-white mt-1 leading-snug">
                {block.title}
              </h3>
              <p className="text-xs text-foam-dim font-mono mt-0.5 break-words">{block.subtitle}</p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tensor Shape & Mathematical Formulation */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <span className="font-mono text-[10px] text-white/40 uppercase">Tensor I/O Dimensions</span>
              <div className="font-mono text-xs font-bold text-biolume mt-0.5 break-words">{block.tensorShape}</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <span className="font-mono text-[10px] text-white/40 uppercase">Mathematical Formulation</span>
              <div className="font-mono text-xs font-bold text-cyan-300 mt-0.5 break-words">{block.formula}</div>
            </div>
          </div>

          {/* High Level Description */}
          <p className="text-xs text-foam-dim leading-relaxed font-light break-words">
            {block.description}
          </p>

          {/* Physical Interpretation */}
          <div className="p-3.5 rounded-xl bg-biolume/[0.04] border border-biolume/20 flex flex-col gap-1">
            <h4 className="font-mono text-xs text-biolume uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <ShieldCheck size={13} />
              Oceanographic Rationale
            </h4>
            <p className="text-xs text-foam-dim leading-relaxed font-light break-words">
              {block.physicalMeaning}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-biolume/20 hover:bg-biolume/30 border border-biolume/40 text-biolume font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(76,224,210,0.15)]"
          >
            Close Module View
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
