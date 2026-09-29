'use client';

import dynamic from 'next/dynamic';
import { OceanSonicLoader } from '@/components/shared/OceanSonicLoader';

const ExplorerShell = dynamic(
  () => import('@/components/explorer/ExplorerShell').then(m => m.ExplorerShell),
  {
    ssr: false,
    loading: () => <OceanSonicLoader />,
  }
);


export default function ExplorePage() {
  return (
    <main className="h-screen w-full overflow-hidden">
      <ExplorerShell />
    </main>
  );
}
