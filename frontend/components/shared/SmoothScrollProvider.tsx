'use client';

import { ReactLenis } from 'lenis/react';
import { ReactNode } from 'react';

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.08,
        duration: 1.2,
        smoothWheel: true,
        // Prevents the virtual mouse/scroll indicator from appearing
        syncTouch: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}
