import React from 'react';
import { GlobalNav } from '@/components/shared/GlobalNav';
import { RegionalSummaryCards } from '@/components/validation/RegionalSummaryCards';
import { RmseByDepthChart } from '@/components/validation/RmseByDepthChart';
import { ProfileComparisonGrid } from '@/components/validation/ProfileComparisonGrid';
import regionalDataRaw from '@/lib/fixtures/regional_validation.json';
import matchupDataRaw from '@/lib/fixtures/matchup.json';
import type { RegionalValidation, ValidationMatchup } from '@/lib/api/types';

const regionalData = regionalDataRaw as RegionalValidation[];
const matchupData = matchupDataRaw as unknown as ValidationMatchup;

export const metadata = {
  title: 'Validation Dashboard — OceanEmbed',
  description: 'Regional and depth-wise validation metrics for OceanEmbed.',
};

export default function ValidationDashboardPage() {
  return (
    <main className="min-h-screen bg-abyss text-foam flex flex-col overflow-x-hidden">
      <GlobalNav />

      {/* Decorative gradient */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-validation-good/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative pt-24 pb-20 px-6 w-full max-w-7xl mx-auto flex-1 flex flex-col gap-10">
        
        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-validation-good animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="font-mono text-[10px] tracking-[0.2em] text-validation-good uppercase">
              Model Performance
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white">
            Validation Dashboard
          </h1>
          <p className="text-foam-dim max-w-3xl">
            How accurate is the reconstruction? These metrics compare the OceanEmbed deep learning model&apos;s output against independent, in-situ ARGO float observations across the Indian Ocean basin.
          </p>
        </header>

        {/* 1. Regional Summary */}
        <section>
          <div className="flex items-center gap-4 mb-6 border-b border-thermocline/20 pb-4">
            <h2 className="font-display text-xl text-white font-semibold">Regional Summary</h2>
            <span className="font-mono text-[10px] text-foam-dim uppercase tracking-widest border border-thermocline/30 px-2 py-0.5 rounded">
              Aggregated Metrics
            </span>
          </div>
          
          <RegionalSummaryCards data={regionalData} />
        </section>

        {/* 2. Depth Chart & Profile Compare */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-deep-panel/50 border border-thermocline/20 rounded-lg p-6 flex flex-col">
            <RmseByDepthChart data={regionalData} />
          </div>
          <div className="flex flex-col">
            <ProfileComparisonGrid matchup={matchupData} />
          </div>
        </section>

        {/* Disclaimer / Info */}
        <footer className="mt-8 border-t border-thermocline/20 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[10px] text-foam-dim tracking-widest uppercase">
            Validation metrics calculated over a holdout test set of ARGO profiles (2020-2025).
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-validation-good" />
              <span className="font-mono text-[9px] text-foam uppercase">Target Met</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-validation-warn" />
              <span className="font-mono text-[9px] text-foam uppercase">Acceptable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-validation-bad" />
              <span className="font-mono text-[9px] text-foam uppercase">Suboptimal</span>
            </div>
          </div>
        </footer>

      </div>
    </main>
  );
}
