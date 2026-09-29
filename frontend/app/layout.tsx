import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OceanEmbed — Subsurface Ocean Intelligence',
  description:
    'Reconstructing subsurface ocean temperature from satellite observations with deep learning. North Indian Ocean, 15 depth levels, ARGO-validated.',
  keywords: ['OceanEmbed', 'subsurface temperature', 'satellite embedding', 'INCOIS', 'SIH 2026', '26066', 'GLORYS', 'ARGO validation'],
};

import { SmoothScrollProvider } from '@/components/shared/SmoothScrollProvider';
import { NoiseOverlay } from '@/components/shared/NoiseOverlay';
import { ReactQueryProvider } from '@/components/shared/ReactQueryProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="w-full h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="w-full h-full bg-abyss text-foam font-ui">
        <SmoothScrollProvider>
          <ReactQueryProvider>
            <NoiseOverlay />
            {children}
          </ReactQueryProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
