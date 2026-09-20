import React from 'react';
import { GlobalNav } from '@/components/shared/GlobalNav';
import { PipelineStep } from '@/components/methodology/PipelineStep';

export const metadata = {
  title: 'Methodology — OceanEmbed Subsurface Intelligence',
  description: 'Learn how OceanEmbed reconstructs subsurface ocean temperature from satellite observations with deep learning.',
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-abyss flex flex-col relative overflow-hidden text-foam">
      <GlobalNav />
      
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-biolume/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative pt-32 pb-24 px-6 max-w-7xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Header */}
        <div className="text-center mb-24 relative z-10">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-thermocline/40 bg-deep-panel/60 backdrop-blur-md mb-8 shadow-[0_4px_24px_rgba(76,224,210,0.15)] hover:bg-deep-panel/80 hover:border-thermocline/60 transition-all duration-300">
            <div className="w-2.5 h-2.5 rounded-full bg-biolume animate-pulse shadow-[0_0_12px_rgba(76,224,210,1)]" />
            <span className="font-mono text-[11px] font-bold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-biolume to-thermocline uppercase">
              How it works
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold text-white tracking-tighter leading-tight mb-8 drop-shadow-lg">
            From Surface Signal <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-foam to-thermocline font-normal">to Latent Ocean State.</span>
          </h1>
          <p className="text-foam/80 max-w-3xl mx-auto text-xl leading-relaxed font-light">
            OceanEmbed treats the ocean as a unified system where surface dynamics are deeply coupled with subsurface thermal structure. Here is how we bridge the gap.
          </p>
        </div>

        {/* Pipeline Steps */}
        <div className="flex flex-col relative z-10">
          
          <PipelineStep
            number="01"
            title="Data Sources"
            description="We collect a multi-modal array of surface observations from Earth observation satellites. These variables provide the energetic, thermodynamic, and dynamic surface boundary conditions of the ocean."
            tags={['SST', 'SSS', 'SSH / SLA', 'U/V Currents', 'U/V Winds']}
            iconName="satellite"
          />

          <PipelineStep
            number="02"
            title="Harmonization"
            description="Raw satellite streams operate on different temporal and spatial grids. We apply rigorous quality control, interpolation, and regridding to create a unified data cube ready for deep learning."
            tags={['0.25° × 0.25° Grid', 'Daily Frequency', 'Zarr Cubes', 'Quality Control']}
            iconName="settings"
          />

          <PipelineStep
            number="03"
            title="Embedding Engine"
            description="A spatio-temporal deep learning architecture (incorporating CNN/ViT mechanics) processes the harmonized surface fields. The encoder compresses these coupled dynamics into a high-dimensional latent representation—the Ocean Embedding."
            tags={['Encoder', 'CNN / ViT', 'Latent Space', 'Non-linear Dynamics']}
            iconName="cpu"
          />

          <PipelineStep
            number="04"
            title="Reconstruction"
            description="A depth-aware decoder projects the latent embedding down through the water column. It reconstructs the temperature profile at 15 standard oceanographic depths, trained against high-fidelity reanalysis targets (GLORYS12V1)."
            tags={['Decoder', '15 Depth Levels', '0–1000m', 'GLORYS Target']}
            iconName="layers"
          />

          <PipelineStep
            number="05"
            title="Argo Validation"
            description="To prove real-world accuracy, the reconstructed profiles are validated against independent in-situ measurements from the ARGO float network—data the model has never seen during training."
            tags={['RMSE', 'Bias', 'Pearson Correlation', 'Independent Holdout']}
            iconName="check"
          />

          <PipelineStep
            number="06"
            title="Ocean Explorer"
            description="The entire pipeline converges into an interactive, high-performance visualization platform. Researchers can explore the hidden thermal structure of the ocean in real-time, just by querying the surface."
            tags={['Interactive Map', 'Profile Chart', 'Dive Mode', 'Digital Twin']}
            iconName="compass"
            isLast={true}
          />

        </div>

      </div>
    </main>
  );
}
