'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBackendHealth } from '@/lib/api/queries';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function BackendWakingUpOverlay() {
  const queryClient = useQueryClient();
  const { data: health, isError, isLoading, isFetching, refetch } = useBackendHealth();
  const [justConnected, setJustConnected] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [attemptCount, setAttemptCount] = useState(1);

  // Detect when server switches from offline/error to healthy
  useEffect(() => {
    if (health?.status === 'healthy') {
      if (attemptCount > 1 || isError) {
        setJustConnected(true);
        queryClient.invalidateQueries({ queryKey: ['surface_field'] });
        queryClient.invalidateQueries({ queryKey: ['subsurface_profile'] });
        const timer = setTimeout(() => {
          setJustConnected(false);
        }, 2200);
        return () => clearTimeout(timer);
      }
    }
  }, [health, attemptCount, isError, queryClient]);

  // Countdown timer for automatic retry probes
  useEffect(() => {
    if (!isError && !isLoading) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setAttemptCount((a) => a + 1);
          refetch();
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isError, isLoading, refetch]);

  const handleManualRetry = () => {
    setCountdown(4);
    setAttemptCount((a) => a + 1);
    refetch();
    queryClient.invalidateQueries();
  };

  const isWakingUp = isError || (isLoading && !health);

  if (!isWakingUp && !justConnected) {
    return null;
  }

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[85] pointer-events-none">
      <AnimatePresence mode="wait">
        {justConnected ? (
          <motion.div
            key="connected-pill"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto bg-[#04120e]/95 border border-emerald-500/40 rounded-full px-4 py-1.5 backdrop-blur-md flex items-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.25)] text-emerald-300 font-mono text-[11px]"
          >
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span className="font-semibold tracking-wide">Backend Online</span>
            <div className="h-3 w-px bg-emerald-500/30" />
            <span className="text-[10px] text-emerald-200/70">Neural Engine Ready</span>
          </motion.div>
        ) : (
          <motion.div
            key="waking-pill"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto bg-[#050A10]/95 border border-amber-400/35 rounded-full px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.6),0_0_15px_rgba(245,158,11,0.2)] text-foam font-mono text-[11px]"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>

            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-amber-300 font-semibold tracking-wider uppercase text-[10px]">Waking Up Backend</span>
              <span className="text-white/40 text-[10px] hidden sm:inline">•</span>
              <span className="text-white/60 text-[10px] hidden sm:inline">Cold start ~25s</span>
            </div>

            <div className="h-3 w-px bg-white/15" />

            <div className="flex items-center gap-2 text-[10px] text-white/50">
              <span>Retry in <strong className="text-amber-300 font-mono">{countdown}s</strong></span>
              <button
                type="button"
                onClick={handleManualRetry}
                disabled={isFetching}
                className="px-2 py-0.5 rounded-full bg-amber-400/15 hover:bg-amber-400/25 active:scale-95 text-amber-300 border border-amber-400/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Ping server now"
              >
                <RefreshCw size={9} className={isFetching ? 'animate-spin' : ''} />
                <span>{isFetching ? 'Pinging' : 'Retry'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
