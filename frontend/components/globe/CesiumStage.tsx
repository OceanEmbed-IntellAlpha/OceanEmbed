'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { BASE_URL } from '@/lib/api/queries';

interface CesiumStageProps {
  onViewerReady?: (viewer: unknown) => void;
  onGlobeClick?: (lat: number, lon: number) => void;
}

/**
 * CesiumStage — the full-bleed 3D ocean globe.
 * Initializes Cesium client-only, frames the Indian Ocean.
 */
export default function CesiumStage({ onViewerReady, onGlobeClick }: CesiumStageProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const { setCursor, cursorLat, cursorLon } = useExplorerStore();
  const handlerRef = useRef<unknown>(null);
  const onGlobeClickRef = useRef(onGlobeClick);
  const [isValidHover, setIsValidHover] = useState(false);

  const initCesium = useCallback(async () => {
    if (!containerRef.current || viewerRef.current) return;

    try {
      const Cesium = await import('cesium');
      // Import Cesium CSS
      try {
        // @ts-expect-error - CSS module typing not available for cesium widgets.css
        await import('cesium/Build/Cesium/Widgets/widgets.css');
      } catch {
        // CSS import may fail in some configs — not critical
      }

      // Configure Cesium assets path
      (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/cesium';

      // Configure Cesium Ion token (optional)
      const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
      if (token) {
        Cesium.Ion.defaultAccessToken = token;
      }

      // ─── Viewer init ─────────────────────────────────────────────────────────
      const viewer = new Cesium.Viewer(containerRef.current, {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        creditContainer: document.createElement('div'),
        requestRenderMode: false,
        shadows: false,
        useDefaultRenderLoop: true,
      });

      viewerRef.current = viewer;
      const scene = viewer.scene;

      // ─── Scene styling ────────────────────────────────────────────────────────
      try { scene.backgroundColor = Cesium.Color.fromCssColorString('#050B14'); } catch {}
      try { scene.fog.enabled = true; scene.fog.density = 0.0001; } catch {}
      try { if (scene.skyBox) scene.skyBox.show = false; } catch {}

      // ─── Lock Camera Zoom/Tilt ────────────────────────────────────────────────
      // Prevents user scrolling from breaking the HUD framing
      try {
        viewer.scene.screenSpaceCameraController.enableZoom = false;
        viewer.scene.screenSpaceCameraController.enableTilt = false;
      } catch {}

      // Style imagery layer for dark instrument look
      const layers = viewer.imageryLayers;
      if (layers && layers.length > 0) {
        const base = layers.get(0);
        if (base) {
          try { base.brightness = 0.45; } catch {}
          try { base.contrast = 1.2; } catch {}
          try { base.saturation = 0.5; } catch {}
        }
      }

      // Globe dark base color and limit rendering to target region
      try {
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#050B14');
        viewer.scene.globe.depthTestAgainstTerrain = false;
        
        // Restrict rendering and tile loading to only the North Indian Ocean
        viewer.scene.globe.cartographicLimitRectangle = Cesium.Rectangle.fromDegrees(45.0, 5.0, 105.0, 30.0);
      } catch (err) {
        console.warn('Failed to apply globe limit rectangle', err);
      }

      // ─── Camera: frame the North Indian Ocean ──────────────────────────────────────
      viewer.camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(45.0, 5.0, 105.0, 30.0),
        duration: 0,
      });

      // ─── Mouse coordinate tracking ────────────────────────────────────────────
      const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
      handlerRef.current = handler;

      handler.setInputAction((movement: { endPosition: { x: number; y: number } }) => {
        try {
          const cartesian = viewer.camera.pickEllipsoid(
            movement.endPosition as unknown as import('cesium').Cartesian2,
            scene.globe.ellipsoid
          );
          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const lat = Cesium.Math.toDegrees(cartographic.latitude);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);
            setCursor(parseFloat(lat.toFixed(4)), parseFloat(lon.toFixed(4)));
          } else {
            setCursor(null, null);
          }
        } catch {
          // Ignore mouse tracking errors
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      handler.setInputAction((movement: { position: { x: number; y: number } }) => {
        try {
          // Check if user clicked on an Argo marker (which has a point geometry).
          // Background grid tiles are rectangles, and raw globe clicks have no .id.
          const pickedObject = scene.pick(movement.position as unknown as import('cesium').Cartesian2);
          const isMarker = Cesium.defined(pickedObject) && 
                           Cesium.defined(pickedObject.id) && 
                           Cesium.defined(pickedObject.id.point);
          if (isMarker) return; // marker click handled elsewhere

          const cartesian = viewer.camera.pickEllipsoid(
            movement.position as unknown as import('cesium').Cartesian2,
            scene.globe.ellipsoid
          );
          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const lat = Cesium.Math.toDegrees(cartographic.latitude);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);
            
            // Prevent clicking on land by checking against the server API
            fetch(`${BASE_URL}/api/is-sea?lat=${lat}&lon=${lon}`)
              .then(res => res.json())
              .then(data => {
                if (data.isSea) {
                  onGlobeClickRef.current?.(lat, lon);
                } else {
                  console.log(`[CesiumStage] Ignored click on land at ${lat.toFixed(2)}, ${lon.toFixed(2)}`);
                }
              })
              .catch(err => {
                console.error('[CesiumStage] is-sea check failed', err);
                // Fallback to allowing click if server fails
                onGlobeClickRef.current?.(lat, lon);
              });
          }
        } catch (e) {
          console.error('[CesiumStage] Click handler error:', e);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      onViewerReady?.(viewer);
      console.log('[CesiumStage] Initialized successfully');

    } catch (err) {
      console.error('[CesiumStage] Failed to initialize Cesium:', err);
    }
  }, [setCursor, onViewerReady]); // Notice we don't need onGlobeClick here because it uses the ref

  useEffect(() => {
    // Keep the ref updated with the latest prop
    onGlobeClickRef.current = onGlobeClick;
  }, [onGlobeClick]);

  useEffect(() => {
    // Small delay to ensure DOM is fully mounted
    const timer = setTimeout(initCesium, 100);
    return () => {
      clearTimeout(timer);
      if (handlerRef.current) {
        try { (handlerRef.current as { destroy(): void }).destroy(); } catch {}
      }
      if (viewerRef.current) {
        try { (viewerRef.current as { destroy(): void }).destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [initCesium]);

  useEffect(() => {
    // Quick bounds check
    if (cursorLat === null || cursorLon === null || cursorLat < 5.0 || cursorLat > 30.0 || cursorLon < 45.0 || cursorLon > 105.0) {
      setIsValidHover(false);
      if (viewerRef.current) {
        // If cursor is entirely off the globe or out of bounds, use default or not-allowed
        (viewerRef.current as any).canvas.style.cursor = (cursorLat === null) ? 'default' : 'not-allowed';
      }
      return;
    }
    
    // Debounce backend is-sea check
    const timer = setTimeout(() => {
      fetch(`${BASE_URL}/api/is-sea?lat=${cursorLat}&lon=${cursorLon}`)
        .then(res => res.json())
        .then(data => {
          setIsValidHover(!!data.isSea);
          if (viewerRef.current) {
            (viewerRef.current as any).canvas.style.cursor = data.isSea ? 'crosshair' : 'not-allowed';
          }
        })
        .catch(() => {
          setIsValidHover(false);
          if (viewerRef.current) {
            (viewerRef.current as any).canvas.style.cursor = 'not-allowed';
          }
        });
    }, 150);

    return () => clearTimeout(timer);
  }, [cursorLat, cursorLon]);

  return (
    <div
      ref={containerRef}
      id="cesium-stage"
      className="absolute inset-0 w-full h-full"
      aria-label="3D Ocean Globe — INCOIS OceanRoot"
      role="application"
    />
  );
}
