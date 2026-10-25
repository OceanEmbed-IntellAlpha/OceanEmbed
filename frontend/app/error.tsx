
"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#06151f] px-6 py-12 text-center text-white">
      {/* Ocean atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(8,145,178,0.16),_transparent_65%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Main panel */}
      <section className="relative w-full max-w-lg rounded-3xl border border-cyan-300/15 bg-[#0a202b]/75 px-6 py-10 shadow-2xl shadow-black/30 backdrop-blur-md sm:px-12">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-cyan-300/70">
          OCEANEMBED · SYSTEM ALERT
        </p>

        <div className="mx-auto w-full max-w-xs">
          <DotLottieReact
            src="/animations/500.lottie"
            loop
            autoplay
          />
        </div>

        <p className="mt-2 text-sm font-medium uppercase tracking-[0.3em] text-orange-300">
          Signal interrupted
        </p>

        <h1 className="mt-3 text-7xl font-semibold tracking-tight sm:text-8xl">
          500
        </h1>

        <h2 className="mt-4 text-xl font-medium text-cyan-50">
          Something went off course.
        </h2>

        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
          An unexpected system error interrupted our signal.
          Our crew is working to get things back online.
        </p>

        <button
          type="button"
          onClick={() => reset()}
          className="mt-8 rounded-full border border-cyan-300/30 bg-cyan-300 px-7 py-3 text-sm font-semibold text-[#06151f] transition hover:-translate-y-0.5 hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-[#0a202b]"
        >
          Try Again
        </button>

        <p className="mt-5 text-xs tracking-wide text-slate-500">
          CONNECTION STATUS: UNSTABLE
        </p>
      </section>

      <p className="relative mt-6 text-xs tracking-widest text-cyan-100/30">
        DEEP OCEAN SYSTEMS
      </p>
    </main>
  );
}
