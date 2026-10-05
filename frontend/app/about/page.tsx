import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Layers3,
  MapPinned,
  Satellite,
  Waves,
} from 'lucide-react';

import { GlobalNav } from '@/components/shared/GlobalNav';

export const metadata: Metadata = {
  title: 'About — OceanEmbed Subsurface Intelligence',
  description:
    'Learn how OceanEmbed uses satellite observations and deep learning to reconstruct subsurface ocean temperature across 15 depth levels in the North Indian Ocean.',
};

const surfaceSignals = [
  { code: 'SST', label: 'Sea surface temperature', tone: 'surfaceSignal' },
  { code: 'SSS', label: 'Sea surface salinity', tone: 'embeddingPurple' },
  { code: 'SSH / SLA', label: 'Sea level height & anomaly', tone: 'thermocline' },
  { code: 'U / V', label: 'Surface currents', tone: 'reconstruction' },
  { code: 'U / V', label: 'Surface winds', tone: 'biolume' },
];

const pipelineSteps = [
  {
    number: '01',
    title: 'Observe',
    description: 'Multi-source surface observations capture the ocean state from above.',
  },
  {
    number: '02',
    title: 'Harmonize',
    description: 'Different products are aligned into a common daily 0.25° representation.',
  },
  {
    number: '03',
    title: 'Learn',
    description: 'A deep learning model learns spatial relationships between the surface state and subsurface structure.',
  },
  {
    number: '04',
    title: 'Reconstruct',
    description: 'Temperature is reconstructed across 15 depth levels through the water column.',
  },
  {
    number: '05',
    title: 'Validate',
    description: 'Reconstructed profiles are evaluated against independent ARGO observations.',
  },
];

const depthLevels = Array.from({ length: 15 }, (_, index) => ({
  number: String(index + 1).padStart(2, '0'),
}));

const validationMetrics = [
  {
    label: 'RMSE',
    description: 'Quantifies the magnitude of reconstruction error.',
  },
  {
    label: 'BIAS',
    description: 'Tracks systematic over- or under-estimation.',
  },
  {
    label: 'PEARSON r',
    description: 'Measures agreement in profile variation.',
  },
];

const dataSources = [
  'OSTIA SST',
  'Multi-Obs SSS',
  'DUACS Altimetry',
  'OSCAR Currents',
  'CCMP Winds',
  'GLORYS12V1',
];

function SectionLabel({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <p
      className={`font-mono text-[10px] font-bold uppercase tracking-[0.24em] ${
        accent ? 'text-thermocline' : 'text-foam-dim'
      }`}
    >
      {children}
    </p>
  );
}

function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center justify-center gap-2 rounded-full bg-thermocline px-6 py-3 text-sm font-semibold text-abyss transition-all duration-300 hover:bg-foam focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-thermocline"
    >
      {children}
      <ArrowRight
        size={16}
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-foam transition-all duration-300 hover:border-white/30 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-thermocline"
    >
      {children}
    </Link>
  );
}

export default function AboutPage() {
  return (
    <>
      <GlobalNav />

      <main className="relative min-h-screen overflow-hidden bg-abyss text-foam">
        {/* ============================================================= */}
        {/* Global atmosphere                                               */}
        {/* ============================================================= */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[900px] overflow-hidden"
        >
          <div className="absolute left-1/2 top-[-280px] h-[760px] w-[760px] -translate-x-1/2 rounded-full bg-biolume/[0.055] blur-[140px]" />
          <div className="absolute left-[8%] top-[500px] h-[320px] w-[320px] rounded-full bg-thermocline/[0.025] blur-[100px]" />
          <div className="absolute right-[5%] top-[700px] h-[300px] w-[300px] rounded-full bg-instrument-amber/[0.025] blur-[100px]" />
        </div>

        {/* ============================================================= */}
        {/* HERO                                                            */}
        {/* ============================================================= */}

        <header className="relative mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-10 md:pb-32">
          <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative z-10">
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-thermocline/30 bg-deep-panel/60 px-4 py-2.5 backdrop-blur-xl">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 animate-pulse rounded-full bg-thermocline shadow-[0_0_14px_rgba(16,185,129,0.8)]"
                />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-foam">
                  OceanEmbed · Subsurface Intelligence
                </span>
              </div>

              <h1 className="max-w-4xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl md:text-7xl lg:text-[5.7rem]">
                Seeing beneath
                <br />
                <span className="bg-gradient-to-r from-white via-foam to-thermocline bg-clip-text font-normal text-transparent">
                  the surface.
                </span>
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-8 text-foam-dim sm:text-xl">
                OceanEmbed uses broad surface observations and deep learning
                to reconstruct the hidden thermal structure of the ocean
                across 15 depth levels.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 font-mono text-[10px] uppercase tracking-[0.16em] text-foam-dim">
                <span className="text-surfaceSignal">7 surface channels</span>
                <span className="text-white/20">/</span>
                <span className="text-biolume">15 depth levels</span>
                <span className="text-white/20">/</span>
                <span className="text-reconstruction">North Indian Ocean</span>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <PrimaryButton href="/explorer">
                  Launch Explorer
                </PrimaryButton>
                <SecondaryButton href="/methodology">
                  Understand the Method
                </SecondaryButton>
              </div>
            </div>

            {/* Hero depth visual */}
            <div className="relative mx-auto w-full max-w-lg">
              <div
                aria-hidden="true"
                className="absolute -inset-8 rounded-full bg-biolume/[0.03] blur-3xl"
              />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-deep-panel/35 p-5 shadow-2xl backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <SectionLabel accent>Reconstruction field</SectionLabel>
                    <p className="mt-1 font-mono text-[10px] text-foam-dim">
                      SURFACE → SUBSURFACE
                    </p>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[9px] text-foam-dim">
                    <span className="h-1.5 w-1.5 rounded-full bg-thermocline" />
                    LIVE SCHEMATIC
                  </div>
                </div>

                <div className="relative h-[470px] overflow-hidden rounded-2xl border border-white/10 bg-[#060b10]">
                  {/* Surface layer */}
                  <div className="absolute inset-x-0 top-0 h-[19%] border-b border-surfaceSignal/30 bg-surfaceSignal/[0.07]">
                    <div className="flex items-center justify-between px-5 py-4">
                      <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-surfaceSignal">
                        SURFACE SIGNAL
                      </span>
                      <span className="font-mono text-[9px] text-foam-dim">
                        7 CHANNELS
                      </span>
                    </div>

                    <div className="mx-5 grid grid-cols-5 gap-1.5">
                      {surfaceSignals.map((signal) => (
                        <div
                          key={`${signal.code}-${signal.label}`}
                          className="h-1 rounded-full bg-white/10"
                        >
                          <div
                            className={`h-full w-2/3 rounded-full ${
                              signal.tone === 'surfaceSignal'
                                ? 'bg-surfaceSignal'
                                : signal.tone === 'embeddingPurple'
                                  ? 'bg-embeddingPurple'
                                  : signal.tone === 'thermocline'
                                    ? 'bg-thermocline'
                                    : signal.tone === 'reconstruction'
                                      ? 'bg-reconstruction'
                                      : 'bg-biolume'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Depth field */}
                  <div className="absolute inset-x-0 bottom-0 top-[19%] overflow-hidden bg-gradient-to-b from-instrument-amber/[0.28] via-thermocline/[0.07] to-[#030608]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 opacity-60"
                      style={{
                        backgroundImage:
                          'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                      }}
                    />

                    <div className="absolute inset-x-0 top-[35%] border-t border-thermocline/25" />
                    <div className="absolute inset-x-0 top-[54%] border-t border-white/10" />
                    <div className="absolute inset-x-0 top-[76%] border-t border-white/10" />

                    <div className="relative flex h-full flex-col justify-between px-5 py-5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-foam">
                          RECONSTRUCTED FIELD
                        </span>
                        <span className="font-mono text-[9px] text-foam-dim">
                          DEPTH STACK
                        </span>
                      </div>

                      <div className="relative mx-auto w-full max-w-[260px] flex-1 py-8">
                        <div className="absolute bottom-2 left-1/2 top-2 w-px -translate-x-1/2 bg-gradient-to-b from-instrument-amber/70 via-thermocline/40 to-biolume/10
                        " />

                        <div className="flex h-full flex-col justify-between">
                          {depthLevels.map((depth, index) => (
                            <div
                              key={depth.number}
                              className="relative flex items-center gap-3"
                            >
                              <span className="w-8 text-right font-mono text-[8px] text-foam-dim">
                                {depth.number}
                              </span>

                              <div
                                className={`h-px flex-1 ${
                                  index < 4
                                    ? 'bg-instrument-amber/70'
                                    : index < 8
                                      ? 'bg-thermocline/45'
                                      : 'bg-white/15'
                                }`}
                              />

                              <span className="w-14 font-mono text-[8px] text-foam-dim">
                                LEVEL
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="absolute left-1/2 top-[33%] h-8 w-28 -translate-x-1/2 rounded-full bg-thermocline/10 blur-xl" />
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <p className="font-display text-4xl font-light text-white">
                            15
                          </p>
                          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-foam-dim">
                            reconstructed levels
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-foam-dim">
                            vertical reach
                          </p>
                          <p className="mt-1 font-display text-xl text-reconstruction">
                            ~1,000 m
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 h-px animate-scan-line bg-thermocline/70 shadow-[0_0_18px_rgba(16,185,129,0.55)]"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.15em] text-foam-dim">
                  <span>Visible surface state</span>
                  <span className="text-thermocline">↓ hidden structure</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================================= */}
        {/* THE OBSERVATION GAP                                              */}
        {/* ============================================================= */}

        <section className="relative border-t border-white/10">
          <div className="mx-auto max-w-7xl px-6 py-28 md:px-10 lg:py-32">
            <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <SectionLabel>01 · The observation gap</SectionLabel>

                <h2 className="mt-6 max-w-xl font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                  The ocean is observed from above.
                  <br />
                  <span className="text-foam-dim">
                    Its deeper structure is harder to see.
                  </span>
                </h2>
              </div>

              <div className="max-w-2xl">
                <p className="text-xl leading-8 text-foam">
                  Satellite observations provide broad views of the ocean
                  surface. But the thermal structure below the surface cannot
                  be directly read from a satellite image.
                </p>

                <p className="mt-6 leading-7 text-foam-dim">
                  Direct in-situ observations provide valuable vertical
                  information, but they are sparse in space and time. OceanEmbed
                  is built around the reconstruction problem: learn how
                  observable surface signals relate to the hidden structure
                  below.
                </p>

                <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
                  <div className="bg-deep-panel/60 p-6">
                    <Satellite size={22} className="text-surfaceSignal" />
                    <p className="mt-5 font-display text-lg text-white">
                      Broad coverage
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foam-dim">
                      Surface observations can be collected across wide
                      regions.
                    </p>
                  </div>

                  <div className="bg-deep-panel/60 p-6">
                    <Activity size={22} className="text-thermocline" />
                    <p className="mt-5 font-display text-lg text-white">
                      Coupled signals
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foam-dim">
                      Surface variables carry different pieces of the ocean
                      state.
                    </p>
                  </div>

                  <div className="bg-deep-panel/60 p-6">
                    <Layers3 size={22} className="text-reconstruction" />
                    <p className="mt-5 font-display text-lg text-white">
                      Hidden depth
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foam-dim">
                      The subsurface thermal profile must be reconstructed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* SURFACE SIGNALS                                                  */}
        {/* ============================================================= */}

        <section className="relative overflow-hidden border-t border-white/10 bg-deep-panel/30">
          <div className="mx-auto max-w-7xl px-6 py-28 md:px-10">
            <div className="max-w-3xl">
              <SectionLabel accent>02 · What OceanEmbed sees</SectionLabel>

              <h2 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                Seven surface signals.
                <br />
                <span className="text-foam-dim">
                  One coupled ocean state.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-foam-dim">
                OceanEmbed combines temperature, salinity, sea-level,
                atmospheric and current information rather than treating the
                ocean surface as a single measurement.
              </p>
            </div>

            <div className="mt-16 grid gap-3 md:grid-cols-5">
              {surfaceSignals.map((signal, index) => (
                <div
                  key={`${signal.code}-${signal.label}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-abyss/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[10px] font-bold tracking-[0.18em] ${
                        signal.tone === 'surfaceSignal'
                          ? 'text-surfaceSignal'
                          : signal.tone === 'embeddingPurple'
                            ? 'text-embeddingPurple'
                            : signal.tone === 'thermocline'
                              ? 'text-thermocline'
                              : signal.tone === 'reconstruction'
                                ? 'text-reconstruction'
                                : 'text-biolume'
                      }`}
                    >
                      {signal.code}
                    </span>

                    <span className="font-mono text-[9px] text-white/20">
                      0{index + 1}
                    </span>
                  </div>

                  <div className="mt-12">
                    <div className="mb-4 h-12">
                      <div className="flex h-full items-end gap-1">
                        {Array.from({ length: 7 }, (_, i) => (
                          <span
                            key={i}
                            className={`w-full rounded-t-sm ${
                              signal.tone === 'surfaceSignal'
                                ? 'bg-surfaceSignal'
                                : signal.tone === 'embeddingPurple'
                                  ? 'bg-embeddingPurple'
                                  : signal.tone === 'thermocline'
                                    ? 'bg-thermocline'
                                    : signal.tone === 'reconstruction'
                                      ? 'bg-reconstruction'
                                      : 'bg-biolume'
                            }`}
                            style={{
                              height: `${26 + ((i * 19 + index * 13) % 62)}%`,
                              opacity: 0.25 + i * 0.08,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="font-display text-lg text-white">
                      {signal.label}
                    </p>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-4 border-l border-thermocline/40 pl-6 sm:flex-row sm:items-center sm:gap-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-thermocline">
                Surface → learned representation → temperature
              </p>
              <p className="max-w-xl text-sm leading-6 text-foam-dim">
                Each observation captures a different aspect of the coupled
                ocean-atmosphere system. Their combination provides the model
                with richer context than a single surface variable.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* PIPELINE                                                        */}
        {/* ============================================================= */}

        <section className="relative border-t border-white/10">
          <div className="mx-auto max-w-7xl px-6 py-28 md:px-10 lg:py-32">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <SectionLabel>03 · The system at a glance</SectionLabel>

                <h2 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                  From surface signal
                  <br />
                  <span className="text-foam-dim">
                    to subsurface structure.
                  </span>
                </h2>
              </div>

              <Link
                href="/methodology"
                className="group inline-flex w-fit items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-thermocline hover:text-foam"
              >
                Full methodology
                <ArrowRight
                  size={13}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>

            <div className="relative mt-16">
              <div className="absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-surfaceSignal/30 via-white/10 to-thermocline/20 lg:block" />

              <div className="grid gap-3 lg:grid-cols-5">
                {pipelineSteps.map((step, index) => (
                  <div
                    key={step.number}
                    className="relative rounded-2xl border border-white/10 bg-deep-panel/50 p-6 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-bold tracking-[0.2em] text-foam-dim">
                        STAGE
                      </span>

                      <span className="font-mono text-[10px] text-thermocline">
                        {step.number}
                      </span>
                    </div>

                    <div className="relative mt-7">
                      <div
                        className={`mb-4 h-2 w-2 rounded-full ${
                          index === 0
                            ? 'bg-surfaceSignal'
                            : index === 1
                              ? 'bg-embeddingPurple'
                              : index === 2
                                ? 'bg-biolume'
                                : index === 3
                                  ? 'bg-reconstruction'
                                  : 'bg-thermocline'
                        }`}
                      />

                      <h3 className="font-display text-xl text-white">
                        {step.title}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-foam-dim">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* DEPTH STACK                                                     */}
        {/* ============================================================= */}

        <section className="relative overflow-hidden border-t border-white/10 bg-deep-panel/30">
          <div className="mx-auto grid max-w-7xl gap-16 px-6 py-28 md:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:py-32">
            <div>
              <SectionLabel accent>04 · The depth stack</SectionLabel>

              <h2 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                One system.
                <br />
                <span className="text-foam-dim">Fifteen levels.</span>
              </h2>

              <p className="mt-7 max-w-xl text-lg leading-8 text-foam-dim">
                OceanEmbed reconstructs subsurface temperature across 15
                standard depth levels, extending from the surface into the
                deeper ocean.
              </p>

              <div className="mt-10 grid max-w-md grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                <div className="bg-abyss p-5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-foam-dim">
                    Vertical output
                  </p>
                  <p className="mt-3 font-display text-3xl text-white">
                    15
                  </p>
                  <p className="mt-1 text-xs text-foam-dim">
                    depth levels
                  </p>
                </div>

                <div className="bg-abyss p-5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-foam-dim">
                    Reach
                  </p>
                  <p className="mt-3 font-display text-3xl text-reconstruction">
                    1 km
                  </p>
                  <p className="mt-1 text-xs text-foam-dim">
                    target depth
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-abyss p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <SectionLabel>Vertical reconstruction</SectionLabel>
                  <p className="mt-1 font-mono text-[9px] text-foam-dim">
                    SURFACE → DEEP OCEAN
                  </p>
                </div>

                <Layers3 size={20} className="text-thermocline" />
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#05090c] px-5 py-7">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at center, rgba(129,140,248,0.15), transparent 55%)',
                  }}
                />

                <div className="relative space-y-2">
                  {depthLevels.map((depth, index) => (
                    <div
                      key={depth.number}
                      className="grid grid-cols-[48px_1fr_58px] items-center gap-3"
                    >
                      <span className="font-mono text-[9px] text-foam-dim">
                        {depth.number}
                      </span>

                      <div className="relative h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className={`h-full rounded-full ${
                            index < 5
                              ? 'bg-gradient-to-r from-instrument-amber to-thermocline'
                              : index < 10
                                ? 'bg-gradient-to-r from-thermocline to-biolume'
                                : 'bg-gradient-to-r from-biolume to-surfaceSignal'
                          }`}
                          style={{
                            width: `${90 - index * 2.7}%`,
                            opacity: 0.9 - index * 0.035,
                          }}
                        />
                      </div>

                      <span className="text-right font-mono text-[8px] uppercase tracking-[0.12em] text-foam-dim">
                        level
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-surfaceSignal">
                    surface
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-foam-dim">
                    deeper structure
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* NORTH INDIAN OCEAN                                              */}
        {/* ============================================================= */}

        <section className="relative border-t border-white/10">
          <div className="mx-auto grid max-w-7xl gap-16 px-6 py-28 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-32">
            <div className="relative mx-auto w-full max-w-xl">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-deep-panel/40 p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <SectionLabel accent>Study domain</SectionLabel>
                    <p className="mt-1 font-mono text-[9px] text-foam-dim">
                      NORTH INDIAN OCEAN
                    </p>
                  </div>
                  <MapPinned size={19} className="text-thermocline" />
                </div>

                <div className="relative aspect-[1.45] overflow-hidden rounded-2xl border border-white/10 bg-[#05090d]">
                  {/* Abstract geographic field — intentionally schematic,
                      not a cartographic map. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 opacity-35"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                      backgroundSize: '28px 28px',
                    }}
                  />

                  <div
                    aria-hidden="true"
                    className="absolute left-[17%] top-[23%] h-[51%] w-[65%] rounded-[42%] border border-dashed border-thermocline/50 bg-thermocline/[0.035]"
                  />

                  <div
                    aria-hidden="true"
                    className="absolute left-[34%] top-[34%] h-28 w-28 rounded-full border border-white/10"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute left-[42%] top-[43%] h-12 w-12 rounded-full border border-thermocline/30 bg-thermocline/[0.05]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute left-[48%] top-[49%] h-2 w-2 rounded-full bg-thermocline shadow-[0_0_18px_rgba(16,185,129,0.8)]"
                  />

                  <div className="absolute left-4 top-4 font-mono text-[8px] text-foam-dim">
                    30°N
                  </div>
                  <div className="absolute bottom-4 left-4 font-mono text-[8px] text-foam-dim">
                    5°N
                  </div>
                  <div className="absolute bottom-4 right-4 font-mono text-[8px] text-foam-dim">
                    105°E
                  </div>
                  <div className="absolute right-4 top-4 font-mono text-[8px] text-foam-dim">
                    45°E
                  </div>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-md">
                    <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-thermocline">
                      North Indian Ocean
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
                  <div className="bg-abyss p-4">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-foam-dim">
                      Latitude
                    </p>
                    <p className="mt-2 font-display text-lg text-white">
                      5°N — 30°N
                    </p>
                  </div>

                  <div className="bg-abyss p-4">
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-foam-dim">
                      Longitude
                    </p>
                    <p className="mt-2 font-display text-lg text-white">
                      45°E — 105°E
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <SectionLabel>05 · Geographic focus</SectionLabel>

              <h2 className="mt-6 max-w-xl font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                Focused where the project begins:
                <br />
                <span className="text-thermocline">
                  the North Indian Ocean.
                </span>
              </h2>

              <p className="mt-7 max-w-xl text-lg leading-8 text-foam-dim">
                OceanEmbed&apos; current model domain is the North Indian Ocean,
                covering the Arabian Sea, Bay of Bengal and surrounding waters.
                The focused regional setup makes it possible to study how
                surface observations relate to subsurface thermal structure
                within a specific ocean regime.
              </p>

              <div className="mt-9 flex flex-wrap gap-2">
                {['Arabian Sea', 'Bay of Bengal', 'Monsoon dynamics', 'Mesoscale structure'].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-foam-dim"
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* VALIDATION                                                      */}
        {/* ============================================================= */}

        <section className="relative border-t border-white/10 bg-deep-panel/30">
          <div className="mx-auto max-w-7xl px-6 py-28 md:px-10 lg:py-32">
            <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <SectionLabel accent>06 · Validation</SectionLabel>

                <h2 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                  Reconstruction is only useful
                  <br />
                  <span className="text-foam-dim">
                    if it can be tested.
                  </span>
                </h2>

                <p className="mt-7 max-w-xl text-lg leading-8 text-foam-dim">
                  OceanEmbed is evaluated not only against its reanalysis
                  reference target, but also against independent in-situ
                  observations from the ARGO float network.
                </p>

                <Link
                  href="/research-lab"
                  className="group mt-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-thermocline hover:text-foam"
                >
                  Explore research results
                  <ArrowRight
                    size={13}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-abyss">
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <SectionLabel>Profile comparison</SectionLabel>
                      <p className="mt-1 font-mono text-[9px] text-foam-dim">
                        OCEANEMBED ↔ ARGO
                      </p>
                    </div>

                    <CheckCircle2
                      size={19}
                      className="text-thermocline"
                    />
                  </div>
                </div>

                <div className="grid gap-8 p-6 md:grid-cols-[0.8fr_1.2fr] md:p-8">
                  <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#05090c]">
                    <div className="absolute inset-y-5 left-8 w-px bg-white/10" />

                    <div className="relative h-[230px] w-[160px]">
                      <svg
                        viewBox="0 0 160 230"
                        className="h-full w-full"
                        fill="none"
                        role="img"
                        aria-label="Illustrative comparison between an OceanEmbed reconstruction and an ARGO profile"
                      >
                        <path
                          d="M125 12 C121 42 113 63 100 86 C84 115 64 137 53 164 C46 183 42 204 40 220"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="text-reconstruction"
                        />

                        <path
                          d="M130 12 C123 44 115 64 103 87 C87 114 68 138 57 163 C50 182 45 205 42 220"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray="6 5"
                          className="text-argoObs"
                        />

                        <line
                          x1="22"
                          y1="10"
                          x2="22"
                          y2="220"
                          stroke="currentColor"
                          className="text-white/20"
                        />

                        {[35, 75, 115, 155, 195].map((y) => (
                          <line
                            key={y}
                            x1="18"
                            y1={y}
                            x2="26"
                            y2={y}
                            stroke="currentColor"
                            className="text-white/15"
                          />
                        ))}
                      </svg>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <div className="space-y-0 divide-y divide-white/10 border-y border-white/10">
                      {validationMetrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="py-5"
                        >
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="font-display text-xl text-white">
                              {metric.label}
                            </span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-foam-dim">
                              validation metric
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-foam-dim">
                            {metric.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-4 font-mono text-[9px] uppercase tracking-[0.13em]">
                      <span className="text-reconstruction">
                        ━ OceanEmbed
                      </span>
                      <span className="text-argoObs">
                        ━ ━ ARGO
                      </span>
                    </div>

                    <p className="mt-5 text-xs leading-5 text-foam-dim">
                      Schematic illustration only — not a measured profile.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* DATA FOUNDATION                                                 */}
        {/* ============================================================= */}

        <section className="relative border-t border-white/10">
          <div className="mx-auto max-w-7xl px-6 py-24 md:px-10">
            <div className="flex flex-col gap-8 border-y border-white/10 py-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <SectionLabel>07 · Data foundation</SectionLabel>
                <p className="mt-4 font-display text-2xl leading-tight text-white sm:text-3xl">
                  Built on a harmonized Earth-observation data stack.
                </p>
              </div>

              <div className="flex max-w-3xl flex-wrap gap-2">
                {dataSources.map((source) => (
                  <span
                    key={source}
                    className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-foam-dim transition-colors hover:border-white/20 hover:text-foam"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* FINAL CTA                                                       */}
        {/* ============================================================= */}

        <section className="relative overflow-hidden border-t border-white/10 bg-gradient-to-b from-abyss to-deep-panel">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-thermocline/40 to-transparent" />

          <div className="mx-auto max-w-5xl px-6 py-32 text-center md:px-10 lg:py-40">
            <div className="mx-auto mb-7 flex h-12 w-12 items-center justify-center rounded-full border border-thermocline/30 bg-thermocline/[0.05]">
              <Waves size={22} className="text-thermocline" />
            </div>

            <SectionLabel accent>Explore the platform</SectionLabel>

            <h2 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
              Surface observations are only the beginning.
            </h2>

            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-foam-dim">
              Move from the concept to the reconstruction itself — explore
              the North Indian Ocean and inspect the thermal structure beneath
              the surface.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <PrimaryButton href="/explorer">
                Launch Explorer
              </PrimaryButton>
              <SecondaryButton href="/methodology">
                Read Methodology
              </SecondaryButton>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* FOOTER — aligned with existing homepage                        */}
        {/* ============================================================= */}

        <footer className="border-t border-thermocline/10 bg-[#01060a] px-6 pb-10 pt-20">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 pb-16 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="mb-6 flex items-center gap-2">
                <Waves size={24} className="text-biolume" />
                <span className="font-display text-2xl font-bold tracking-wide text-white">
                  OCEANEMBED
                </span>
              </div>

              <p className="max-w-sm text-base leading-relaxed text-foam-dim">
                A scientific ocean-intelligence platform reconstructing
                subsurface temperature from surface observations with deep
                learning.
              </p>
            </div>

            <div>
              <h3 className="mb-6 font-mono text-sm uppercase tracking-widest text-white">
                Navigation
              </h3>

              <div className="flex flex-col gap-4 text-base text-foam-dim">
                <Link
                  href="/explorer"
                  className="w-fit transition-colors hover:text-white"
                >
                  Explorer
                </Link>
                <Link
                  href="/methodology"
                  className="w-fit transition-colors hover:text-white"
                >
                  Methodology
                </Link>
                <Link
                  href="/research-lab"
                  className="w-fit transition-colors hover:text-white"
                >
                  Research Lab
                </Link>
                <Link
                  href="/about"
                  className="w-fit text-white"
                >
                  About
                </Link>
              </div>
            </div>

            <div>
              <h3 className="mb-6 font-mono text-sm uppercase tracking-widest text-white">
                Observation Data
              </h3>

              <div className="flex flex-col gap-4 font-mono text-sm text-foam-dim">
                <span>Copernicus / CMEMS</span>
                <span>NASA / PO.DAAC</span>
                <span>GLORYS12V1</span>
                <span>ARGO Network</span>
              </div>
            </div>
          </div>

          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-thermocline/10 pt-8 text-center font-ui text-sm text-foam-dim/50 md:flex-row md:text-left">
            <span>© 2026 OceanEmbed</span>
            <span>
              Prototype developed for Smart India Hackathon (SIH 2026) —
              Problem Statement 26066.
            </span>
          </div>
        </footer>
      </main>
    </>
  );
}