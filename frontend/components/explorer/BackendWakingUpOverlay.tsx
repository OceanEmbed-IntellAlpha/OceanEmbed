'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBackendHealth, BASE_URL } from '@/lib/api/queries';
import { Server, Radio, RefreshCw, CheckCircle2, Terminal, Sparkles, Activity } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function BackendWakingUpOverlay() {
  const queryClient = useQueryClient();
  const { data: health, isError, isLoading, isFetching, refetch } = useBackendHealth();
  const [justConnected, setJustConnected] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [attemptCount, setAttemptCount] = useState(1);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Detect when server switches from offline/error to healthy
  useEffect(() => {
    if (health?.status === 'healthy') {
      if (attemptCount > 1 || isError) {
        setJustConnected(true);
        // Invalidate all failed queries so data loads immediately
        queryClient.invalidateQueries({ queryKey: ['surface_field'] });
        queryClient.invalidateQueries({ queryKey: ['subsurface_profile'] });
        const timer = setTimeout(() => {
          setJustConnected(false);
        }, 2800);
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

  // If healthy and not in celebration grace period, hide
  if (!isWakingUp && !justConnected) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none flex items-center justify-center p-4">
      {/* Dim backdrop to focus attention without obscuring 3D globe completely */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
        onClick={() => {}}
      />

      <AnimatePresence mode="wait">
        {justConnected ? (
          /* Success notification card */
          <motion.div
            key="connected-banner"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative pointer-events-auto max-w-md w-full rounded-2xl p-6 bg-[#04120e]/95 border border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.3)] backdrop-blur-2xl text-center"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
            </div>
            <div className="inline-block px-3 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
              Neural Engine Online
            </div>
            <h3 className="text-lg font-bold text-white font-display tracking-wide">
              Backend Connected!
            </h3>
            <p className="text-xs text-emerald-200/80 mt-1 font-mono">
              FastAPI v2 service & PyTorch 7-channel models loaded. Syncing oceanographic data...
            </p>
          </motion.div>
        ) : (
          /* Waking Up / Cold Start card */
          <motion.div
            key="waking-up-card"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative pointer-events-auto max-w-lg w-full rounded-2xl p-6 bg-[#050b18]/92 border border-amber-500/40 shadow-[0_0_60px_rgba(245,158,11,0.22)] backdrop-blur-2xl text-foam"
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 shadow-[0_0_10px_#f59e0b]" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-widest text-amber-300 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                  Waking Up Backend
                </span>
              </div>
              <span className="font-mono text-[10px] text-white/50 tracking-wider">
                Attempt #{attemptCount}
              </span>
            </div>

            {/* Main Visual & Title */}
            <div className="flex items-start gap-4 mb-4">
              <div className="relative shrink-0 w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-inner">
                <Radio className="w-6 h-6 text-amber-400 animate-pulse" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center">
                  <Activity size={9} className="text-cyan-300" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white font-display tracking-tight flex items-center gap-2">
                  Starting OceanEmbed API Server
                  <Sparkles size={14} className="text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                </h2>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  Free cloud instances (Render, Koyeb, HF) sleep during inactivity. The container is provisioning memory and loading the <strong>7-channel U-Net neural weights</strong> (~20–40s).
                </p>
              </div>
            </div>

            {/* Glowing animated progress line */}
            <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-4 border border-white/10">
              <motion.div
                className="absolute inset-y-0 bg-gradient-to-r from-amber-500 via-cyan-400 to-amber-400 rounded-full"
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.2,
                  ease: 'easeInOut',
                }}
                style={{ width: '60%' }}
              />
            </div>

            {/* Telemetry & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="text-[11px] font-mono text-white/60 flex items-center gap-1.5 self-start sm:self-auto">
                <RefreshCw size={11} className={`text-cyan-400 ${isFetching ? 'animate-spin' : ''}`} />
                <span>Auto-retrying in <strong className="text-amber-300 font-bold">{countdown}s</strong></span>
                <span className="text-white/30">•</span>
                <span className="text-white/40 truncate max-w-[140px]" title={BASE_URL}>{BASE_URL.replace(/^https?:\/\//, '')}</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-white/50 hover:text-white hover:bg-white/5 border border-white/5 transition-colors"
                >
                  {showTroubleshoot ? 'Hide Help' : 'Help'}
                </button>

                <button
                  type="button"
                  onClick={handleManualRetry}
                  disabled={isFetching}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium text-black bg-amber-400 hover:bg-amber-300 active:scale-95 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                >
                  <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
                  <span>{isFetching ? 'Pinging...' : 'Wake Up Now'}</span>
                </button>
              </div>
            </div>

            {/* Expandable Developer / Local Troubleshooting Panel */}
            <AnimatePresence>
              {showTroubleshoot && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-3 pt-3 border-t border-white/5 text-[11px] font-mono text-white/60 space-y-1.5 bg-black/30 p-3 rounded-lg border border-white/5"
                >
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <Terminal size={12} />
                    <span>Running Locally?</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/50">
                    If developing locally on your machine, make sure the FastAPI backend is running:
                  </p>
                  <pre className="bg-black/60 p-2 rounded text-[10px] text-cyan-300 overflow-x-auto selection:bg-cyan-500/30">
                    python -m uvicorn backend.api.main:app --reload --port 8000
                  </pre>
                  <p className="text-[9px] text-white/40">
                    Target Endpoint: <code className="text-amber-300">{BASE_URL}/api/health</code>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
