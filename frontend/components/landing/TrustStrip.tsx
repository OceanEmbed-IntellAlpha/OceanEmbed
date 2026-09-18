'use client';

export function TrustStrip() {
  const missions = [
    'Copernicus Marine (GLORYS12V1)',
    'ESA Climate Change Initiative',
    'AVISO+ / CMEMS Altimetry',
    'Argo Global Data Assembly (GDAC)',
    'OSCAR Ocean Surface Currents',
    'ECMWF ERA5 Reanalysis',
    'INCOIS Ocean Observation System',
  ];

  return (
    <section className="py-5 border-b border-thermocline/10 bg-deep-panel/30 overflow-hidden relative">
      {/* Edge fade masks */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, var(--color-abyss, #020b14) 0%, transparent 15%, transparent 85%, var(--color-abyss, #020b14) 100%)',
        }}
      />

      <div className="flex items-center gap-8 relative">
        {/* Static label */}
        <span className="font-mono text-[10px] text-biolume/80 tracking-widest uppercase shrink-0 pl-6 z-20 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-biolume animate-pulse" />
          Data Sources & Standards
        </span>

        {/* Infinite scroll track */}
        <div className="flex-1 overflow-hidden">
          <div className="flex w-max animate-marquee gap-14">
            {[...missions, ...missions].map((name, i) => (
              <span
                key={i}
                className="font-mono font-medium text-xs md:text-sm text-foam/60 tracking-wider uppercase shrink-0 select-none flex items-center gap-4"
              >
                <span>{name}</span>
                <span className="text-white/20">/</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
