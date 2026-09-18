'use client';

import { useEffect, useRef } from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useNearbyArgo } from '@/lib/api/queries';
import type { ArgoProfile } from '@/lib/api/types';

interface ArgoMarkerLayerProps {
  viewer: unknown | null;
  onMarkerClick?: (id: string, lat: number, lon: number, platform: string) => void;
  focusPlatform?: string | null;
}

const PLATFORM_COLOR = {
  argo: { r: 76, g: 224, b: 210 },    // biolume
  glider: { r: 232, g: 163, b: 61 },  // instrument-amber
  buoy: { r: 143, g: 165, b: 172 },   // foam-dim
};

export default function ArgoMarkerLayer({ viewer, onMarkerClick, focusPlatform }: ArgoMarkerLayerProps) {
  const { showArgoPoints, selectedLat, selectedLon, selectedDate, selectedFloatId, selectFloat, setSelectedPoint } = useExplorerStore();

  const { data: observations } = useNearbyArgo(
    showArgoPoints && selectedLat !== null && selectedLon !== null 
      ? { lat: selectedLat, lon: selectedLon, date: selectedDate } 
      : null
  );

  const entityMapRef = useRef<Map<string, unknown>>(new Map());
  const clickHandlerRef = useRef<unknown>(null);
  const cesiumRef = useRef<typeof import('cesium') | null>(null);

  // Keep refs up-to-date so the click handler closure never goes stale
  // Filter observations if focusPlatform is set
  const filteredArgoProfiles = observations?.filter((o: ArgoProfile) => 
    focusPlatform ? o.floatId === focusPlatform : true
  );

  const observationsRef = useRef(filteredArgoProfiles);
  const onMarkerClickRef = useRef(onMarkerClick);
  const selectFloatRef = useRef(selectFloat);
  const setSelectedPointRef = useRef(setSelectedPoint);
  useEffect(() => { observationsRef.current = filteredArgoProfiles; }, [filteredArgoProfiles]);
  useEffect(() => { onMarkerClickRef.current = onMarkerClick; }, [onMarkerClick]);
  useEffect(() => { selectFloatRef.current = selectFloat; }, [selectFloat]);
  useEffect(() => { setSelectedPointRef.current = setSelectedPoint; }, [setSelectedPoint]);

  // ── Initialize click handler once ──────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    import('cesium').then((Cesium) => {
      cesiumRef.current = Cesium;

      // Destroy any previous handler
      if (clickHandlerRef.current) {
        try { (clickHandlerRef.current as { destroy(): void }).destroy(); } catch {}
        clickHandlerRef.current = null;
      }

      const canvas = (viewer as { scene: { canvas: HTMLCanvasElement } }).scene?.canvas;
      if (!canvas) return;

      const handler = new Cesium.ScreenSpaceEventHandler(canvas);
      clickHandlerRef.current = handler;

      handler.setInputAction((click: { position: { x: number; y: number } }) => {
        try {
          const picked = (viewer as {
            scene: { pick(pos: unknown): unknown };
          }).scene.pick(click.position);

          if (picked) {
            // Cesium entity click — check it's a marker (has a point), not a grid tile
            const entity = (picked as { id?: { id?: string; point?: unknown } }).id;
            if (entity?.id && entity.point !== undefined) {
              // Use refs so we always get fresh values regardless of closure age
              const obs = observationsRef.current?.find((o: ArgoProfile) => o.floatId === entity.id!);
              if (obs) {
                const cb = onMarkerClickRef.current;
                if (cb) {
                  cb(entity.id!, obs.lat, obs.lon, 'argo');
                } else {
                  selectFloatRef.current(entity.id!);
                  setSelectedPointRef.current(obs.lat, obs.lon);
                }
              } else {
                // Float ID found but no obs data yet — still select it
                selectFloatRef.current(entity.id!);
              }
              return;
            }
          }
          // Non-marker clicks (empty globe / grid) are handled by CesiumStage's onGlobeClick
        } catch {
          // Swallow pick errors (e.g. during scene transitions)
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      // ── Cursor: pointer on hover over any float marker ──────────────────────────
      handler.setInputAction(
        (movement: { endPosition: { x: number; y: number } }) => {
          try {
            const picked = (viewer as {
              scene: { pick(pos: unknown): unknown };
            }).scene.pick(movement.endPosition);

            const isMarker =
              picked != null &&
              (picked as { id?: { point?: unknown } }).id?.point !== undefined;

            canvas.style.cursor = isMarker ? 'pointer' : 'default';
          } catch {
            canvas.style.cursor = 'default';
          }
        },
        Cesium.ScreenSpaceEventType.MOUSE_MOVE,
      );
    });

    return () => {
      if (clickHandlerRef.current) {
        try { (clickHandlerRef.current as { destroy(): void }).destroy(); } catch {}
        clickHandlerRef.current = null;
      }
      // Reset cursor so it doesn't stay as 'pointer' after unmount
      try {
        const c = (viewer as { scene: { canvas: HTMLCanvasElement } }).scene?.canvas;
        if (c) c.style.cursor = 'default';
      } catch {}
    };
    // selectFloat is intentionally excluded — we use selectFloatRef to avoid
    // destroying/recreating the handler on every render (Zustand doesn't memoize actions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  // ── Render/update entities when observations or selection changes ──────────
  useEffect(() => {
    if (!viewer || !observations) return;

    const v = viewer as {
      entities: {
        add(e: unknown): unknown;
        remove(e: unknown): void;
      };
      scene: { requestRender(): void };
    };

    if (!v.entities || typeof v.entities.add !== 'function') return;

    import('cesium').then((Cesium) => {
      // Remove old entities
      entityMapRef.current.forEach((entity) => {
        try { v.entities.remove(entity); } catch {}
      });
      entityMapRef.current.clear();

      filteredArgoProfiles?.forEach((obs: ArgoProfile) => {
        const isSelected = obs.floatId === selectedFloatId;
        const colors = PLATFORM_COLOR.argo;

        let color: import('cesium').Color;
        if (isSelected) {
          color = Cesium.Color.fromCssColorString('#4CE0D2');
        } else {
          color = new Cesium.Color(colors.r / 255, colors.g / 255, colors.b / 255, 0.9);
        }

        try {
          const entity = v.entities.add({
            id: obs.floatId,
            position: Cesium.Cartesian3.fromDegrees(obs.lon, obs.lat, 0),
            point: {
              pixelSize: isSelected ? 16 : 10,
              color,
              outlineColor: isSelected
                ? Cesium.Color.WHITE.withAlpha(0.9)
                : Cesium.Color.fromCssColorString('#050B14').withAlpha(0.6),
              outlineWidth: isSelected ? 2.5 : 1,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                obs.lon, obs.lat, 0,
                obs.lon, obs.lat, -1000, // Extrude line to 1000m
              ]),
              width: isSelected ? 1.5 : 1,
              material: new Cesium.PolylineDashMaterialProperty({
                color: color.withAlpha(isSelected ? 0.7 : 0.3),
                dashLength: 8,
              }),
            },
            // ── Label: always visible, white text styled by state ──────────
            label: {
              text: obs.floatId,
              font: isSelected
                ? '11px "IBM Plex Mono", monospace'
                : '9px "IBM Plex Mono", monospace',
              fillColor: isSelected
                ? Cesium.Color.WHITE                              // bright white when selected
                : Cesium.Color.WHITE.withAlpha(0.70),            // slightly dimmed white for others
              outlineColor: isSelected
                ? Cesium.Color.fromCssColorString('#050B14').withAlpha(0.95)  // deep abyss outline
                : Cesium.Color.fromCssColorString('#0B1D2E').withAlpha(0.85),
              outlineWidth: isSelected ? 2.5 : 1.5,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(isSelected ? 0 : 10, isSelected ? -22 : -16),
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              horizontalOrigin: isSelected
                ? Cesium.HorizontalOrigin.CENTER
                : Cesium.HorizontalOrigin.LEFT,
              scale: isSelected ? 1.15 : 0.9,
              translucencyByDistance: new Cesium.NearFarScalar(
                isSelected ? 1e4 : 5e5,
                1.0,
                isSelected ? 2e7 : 1.5e7,
                0.0,
              ),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              showBackground: isSelected,
              backgroundColor: Cesium.Color.fromCssColorString('#0B1D2E').withAlpha(0.80),
              backgroundPadding: new Cesium.Cartesian2(7, 4),
            },
          });
          entityMapRef.current.set(obs.floatId, entity);
        } catch (err) {
          console.warn('[ArgoMarkerLayer] Failed to add entity:', obs.floatId, err);
        }
      });

      try { v.scene.requestRender?.(); } catch {}
    });

    const currentMap = entityMapRef.current;
    return () => {
      currentMap.forEach((entity) => {
        try { v.entities.remove(entity); } catch {}
      });
      currentMap.clear();
    };
  }, [viewer, filteredArgoProfiles, selectedFloatId, focusPlatform, observations]);

  return null;
}
