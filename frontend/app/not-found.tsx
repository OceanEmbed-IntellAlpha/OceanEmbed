"use client";
import Link from "next/link";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#03131d] px-6 py-12 text-white">

      {/* Underwater glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-600/10 blur-[100px]" />

      {/* Floating particles */}
      <div className="pointer-events-none absolute left-[12%] top-[20%] h-2 w-2 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_20px_#22d3ee]" />

      <div className="pointer-events-none absolute right-[15%] top-[30%] h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-200 shadow-[0_0_15px_#22d3ee]" />

      <div className="pointer-events-none absolute bottom-[20%] right-[25%] h-2 w-2 animate-pulse rounded-full bg-blue-300 shadow-[0_0_20px_#60a5fa]" />

      {/* Main content */}
      <section className="relative grid w-full max-w-5xl items-center gap-8 rounded-[32px] border border-cyan-400/15 bg-[#071b25]/60 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-10 md:grid-cols-2 md:gap-12 md:p-14">

        {/* Jellyfish animation */}
        <div className="relative">
          <div className="absolute inset-10 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative animate-[float_4s_ease-in-out_infinite]">
            <DotLottieReact
              src="/animations/404.lottie"
              loop
              autoplay
            />
          </div>

          <div className="mx-auto mt-[-15px] h-1 w-2/3 rounded-full bg-cyan-400/60 blur-md" />
        </div>

        {/* Error message */}
        <div className="relative text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-400 sm:text-sm">
            Signal Lost
          </p>

          <h1 className="mt-4 bg-gradient-to-b from-white to-cyan-300 bg-clip-text text-8xl font-bold tracking-tight text-transparent sm:text-9xl">
            404
          </h1>

          <h2 className="mt-4 text-xl font-medium text-white sm:text-2xl">
            Lost at sea?
          </h2>

          <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-slate-400 md:mx-0 sm:text-base">
            Looks like this page drifted out to sea.
            The coordinates you&apos;re looking for
            couldn&apos;t be found.
          </p>

          <Link
            href="/"
            className="group mt-8 inline-flex items-center gap-3 rounded-full bg-cyan-400 px-7 py-3.5 font-semibold text-[#03131d] shadow-lg shadow-cyan-400/20 transition duration-300 hover:-translate-y-1 hover:bg-cyan-300 hover:shadow-cyan-400/40"
          >
            Back to Home
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>

          <p className="mt-8 text-xs tracking-widest text-slate-600">
            OCEANEMBED · EXPLORING THE UNKNOWN
          </p>
        </div>
      </section>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          section *,
          section *::before,
          section *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}
