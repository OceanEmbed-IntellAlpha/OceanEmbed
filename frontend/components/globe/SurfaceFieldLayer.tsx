'use client';

import { useEffect, useRef } from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSurfaceField } from '@/lib/api/queries';
import { valueToColor } from '@/lib/cesium/colormaps';
import type { ColormapName } from '@/lib/cesium/colormaps';
import type { SurfaceVariable } from '@/lib/api/types';

interface ModelFieldLayerProps {
  viewer: unknown | null;
}

/**
 * ModelFieldLayer — renders the temperature/salinity model field
 * as colored rectangles on the Cesium globe surface.
 * Uses scientific colormaps (thermal/viridis/cividis).
 */
export default function SurfaceFieldLayer({ viewer }: ModelFieldLayerProps) {
  const { showSST, showSSS, showSSH, showCurrents, showWinds, showSubsurfaceTemp, showEmbedding, showThermalAnomaly, selectedDate, selectedDepth } = useExplorerStore();
  const entityIdsRef = useRef<unknown[]>([]);

  // Determine active variable to fetch.
  let activeVariable: string | null = null;
  if (showSST) activeVariable = 'sst';
  else if (showSSS) activeVariable = 'sss';
  else if (showSSH) activeVariable = 'ssh';
  else if (showCurrents) activeVariable = 'currents';
  else if (showWinds) activeVariable = 'winds';
  else if (showSubsurfaceTemp) activeVariable = 'subsurface_temp';
  else if (showEmbedding) activeVariable = 'embedding';
  else if (showThermalAnomaly) activeVariable = 'thermal_anomaly';

  const depthParam = (activeVariable === 'subsurface_temp' || activeVariable === 'thermal_anomaly') ? selectedDepth : 0;
  const queryParams = activeVariable ? { variable: activeVariable as any, date: selectedDate, depth: depthParam } : null;
  const { data: field } = useSurfaceField(queryParams);

  useEffect(() => {
    if (!viewer) return;

    const v = viewer as {
      entities: {
        add: (e: unknown) => unknown;
        remove: (e: unknown) => void;
      };
      scene: { requestRender: () => void };
      isDestroyed?: () => boolean;
    };

    // Always clear existing entities on update (synchronously, before any async work)
    entityIdsRef.current.forEach((e) => v.entities.remove(e));
    entityIdsRef.current = [];

    if (!field) return;

    // Cancellation flag — prevents async callbacks from writing after cleanup
    let cancelled = false;

    // Draw base scalar grid if visible
    if (activeVariable) {
      const { lat, lon, grid, colorRange } = field;
      const [min, max] = colorRange && colorRange.length === 2 && colorRange[1] > colorRange[0]
        ? colorRange
        : [0.0, 1.0];
      
      // Select colormap based on variable
      let cmName: ColormapName = 'thermal';
      if (activeVariable === 'sss') cmName = 'haline';
      else if (activeVariable === 'ssh') cmName = 'viridis';
      else if (activeVariable === 'currents') cmName = 'deep';
      else if (activeVariable === 'winds') cmName = 'cividis';
      else if (activeVariable === 'subsurface_temp') cmName = 'thermal';
      else if (activeVariable === 'embedding') cmName = 'viridis';
      else if (activeVariable === 'thermal_anomaly') cmName = 'thermal_anomaly';
      
      const opacity = 0.6;

      import('cesium').then((Cesium) => {
        if (cancelled) return;

        // Use stride to create the chunky "voxel/box" aesthetic the user prefers,
        // reducing the 124x100 grid to visually larger blocks like the mock data.
        const stride = 2; 

        for (let i = 0; i < lat.length; i += stride) {
          const prevI = Math.max(0, i - stride);
          const nextI = Math.min(lat.length - 1, i + stride);
          const south = i > 0 ? (lat[i] + lat[prevI]) / 2 : lat[i] - (lat[nextI] - lat[i]) / 2;
          const north = i < lat.length - 1 ? (lat[i] + lat[nextI]) / 2 : lat[i] + (lat[i] - lat[prevI]) / 2;

          for (let j = 0; j < lon.length; j += stride) {
            if (cancelled) break;
            const value = grid[i][j];
            if (value === null || value === undefined) continue;

            const prevJ = Math.max(0, j - stride);
            const nextJ = Math.min(lon.length - 1, j + stride);
            const west = j > 0 ? (lon[j] + lon[prevJ]) / 2 : lon[j] - (lon[nextJ] - lon[j]) / 2;
            const east = j < lon.length - 1 ? (lon[j] + lon[nextJ]) / 2 : lon[j] + (lon[j] - lon[prevJ]) / 2;

            const color = valueToColor(value, min, max, cmName);
            // valueToColor always returns rgb(r,g,b) — safe to parse
            const match = color.match(/\d+/g);
            if (!match) continue;
            const [r, g, b] = match.map(Number);

            const entity = v.entities.add({
              rectangle: {
                coordinates: Cesium.Rectangle.fromDegrees(west, south, east, north),
                height: 0,
                extrudedHeight: (activeVariable === 'sst' || showSubsurfaceTemp) && selectedDepth > 0 ? -selectedDepth : undefined,
                material: new Cesium.ColorMaterialProperty(
                  new Cesium.Color(r / 255, g / 255, b / 255, opacity)
                ),
                outline: false,
              },
            });

            entityIdsRef.current.push(entity);
          }
        }
        if (!cancelled) v.scene.requestRender?.();
      });
    }

    return () => {
      // Signal async callbacks to abort
      cancelled = true;
      // Remove all entities that were synchronously registered
      if (v && (!v.isDestroyed || !v.isDestroyed())) {
        entityIdsRef.current.forEach((e) => v.entities.remove(e));
      }
      entityIdsRef.current = [];
    };
  }, [viewer, field, activeVariable, showCurrents, selectedDepth, showSubsurfaceTemp]);

  return null; // Globe-layer component — renders into Cesium, not React DOM
}
