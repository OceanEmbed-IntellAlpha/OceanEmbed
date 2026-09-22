'use client';

import { useEffect, useRef } from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';

interface SearchMarkerLayerProps {
  viewer: unknown | null;
}

export default function SearchMarkerLayer({ viewer }: SearchMarkerLayerProps) {
  const lat = useExplorerStore((s) => s.selectedLat);
  const lon = useExplorerStore((s) => s.selectedLon);
  const entityRef = useRef<unknown | null>(null);

  useEffect(() => {
    if (!viewer) return;

    const v = viewer as {
      entities: {
        add(e: unknown): unknown;
        remove(e: unknown): void;
      };
      scene: { requestRender(): void };
    };

    if (entityRef.current) {
      try { v.entities.remove(entityRef.current); } catch {}
      entityRef.current = null;
    }

    if (lat === null || lon === null) {
      v.scene.requestRender?.();
      return;
    }

    import('cesium').then((Cesium) => {
      // Re-check in case props changed during dynamic import
      if (lat === null || lon === null) return;

      const entity = v.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        point: {
          pixelSize: 12,
          color: Cesium.Color.fromCssColorString('#E8A33D'), // Amber
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `Selected: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
          font: '10px "IBM Plex Mono", monospace',
          fillColor: Cesium.Color.WHITE,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      entityRef.current = entity;
      v.scene.requestRender?.();
    });

    return () => {
      if (entityRef.current) {
        try { v.entities.remove(entityRef.current); } catch {}
        entityRef.current = null;
      }
    };
  }, [viewer, lat, lon]);

  return null;
}
