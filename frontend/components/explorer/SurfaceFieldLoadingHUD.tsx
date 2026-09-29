'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSurfaceField } from '@/lib/api/queries';
import { Radio, Cloud, Waves } from 'lucide-react';

export function SurfaceFieldLoadingHUD() {
  const selectedDate = useExplorerStore((s) => s.selectedDate);
  const showSubsurfaceTemp = useExplorerStore((s) => s.showSubsurfaceTemp);
  const showSST = useExplorerStore((s) => s.showSST);
  const showSSS = useExplorerStore((s) => s.showSSS);

  let activeVar: 'sst' | 'sss' = 'sst';
  if (showSSS) activeVar = 'sss';

  const queryParams = { variable: activeVar, date: selectedDate };
  const { isFetching } = useSurfaceField(queryParams);

  return (
    <AnimatePresence>
      {isFetching && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] pointer-events-none"
        >
          <div className="bg-[#050A10]/90 border border-cyan-400/40 rounded-full px-4 py-1.5 backdrop-blur-md flex items-center gap-2.5 shadow-[0_0_20px_rgba(0,210,255,0.3)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
            </span>

            <div className="flex items-center gap-1.5 font-mono text-[11px] text-white tracking-wider uppercase">
              <Cloud size={13} className="text-cyan-400" />
              <span>Streaming R2</span>
              <span className="text-cyan-300 font-bold">[{activeVar.toUpperCase()} • {selectedDate}]</span>
            </div>

            <div className="h-3 w-px bg-white/20" />

            <span className="text-[10px] font-mono text-zinc-400">
              HTTP Range
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
