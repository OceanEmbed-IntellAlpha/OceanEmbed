'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';

// ── Constants ────────────────────────────────────────────────────────────────
const FOOTPRINT_DEG = 2.0;
const MAX_DEPTH = 2000;
const VERT_EXAGGERATION = 500;
const MAX_EXTRUSION = MAX_DEPTH * VERT_EXAGGERATION;
const ANIM_DURATION_MS = 1200;

interface GlobeWaterColumnProps {
  viewer: unknown | null;
}

interface ColumnProfile {
  depths: number[];
  temperature: number[];
}

// ── Custom GLSL: Animated Ocean Surface ──────────────────────────────────────
const OCEAN_SURFACE_GLSL = `
  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 uv = materialInput.st;
    float t = uTime;

    // Multi-directional Gerstner-like waves
    float w1 = sin(uv.x * 18.0 + t * 1.6) * cos(uv.y * 14.0 + t * 1.1);
    float w2 = sin(uv.x * 32.0 - t * 2.2 + w1 * 1.5) * 0.5;
    float w3 = cos(uv.y * 26.0 + t * 0.9) * sin(uv.x * 12.0 - t * 0.7) * 0.3;
    float w4 = sin((uv.x + uv.y) * 20.0 + t * 1.3) * 0.25;
    float wave = (w1 + w2 + w3 + w4) * 0.35;

    // FBM turbulence
    float turb = fbm(uv * 8.0 + vec2(t * 0.3, t * 0.2)) * 0.4;
    wave += turb * 0.3;

    float waveN = clamp(wave * 0.5 + 0.5, 0.0, 1.0);

    // Color mixing (Cesium.Color uniform is vec4)
    vec3 color = mix(uDeepColor.rgb, uShallowColor.rgb, waveN);

    // Foam on wave peaks
    float foamMask = smoothstep(0.68, 0.85, waveN);
    color = mix(color, uFoamColor.rgb, foamMask * 0.6);

    // Specular shimmer
    float spec = pow(max(0.0, sin(uv.x * 60.0 + t * 3.0) * cos(uv.y * 50.0 - t * 2.5)), 8.0);
    color += vec3(0.15, 0.25, 0.3) * spec * 0.4;

    // Edge fade for smooth blending
    float edgeFade = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x)
                   * smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.92, uv.y);

    material.diffuse = color;
    material.alpha = uOpacity * edgeFade;
    material.specular = 0.5;
    material.shininess = 20.0;
    return material;
  }
`;

// ── Custom GLSL: Sonar Ping Ring ──────────────────────────────────────────────
const SONAR_PING_GLSL = `
  czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 uv = materialInput.st;

    float age = uTime - uBirthTime;
    float progress = age / uDuration;

    if (progress > 1.0 || progress < 0.0) {
      material.alpha = 0.0;
      return material;
    }

    vec2 center = uv - 0.5;
    float dist = length(center);

    // Expanding ring
    float ringRadius = progress * 0.5;
    float ringWidth = 0.02 * (1.0 - progress);
    float ring = smoothstep(ringWidth, 0.0, abs(dist - ringRadius));

    // Fade out as it expands
    float fadeOut = 1.0 - progress;
    fadeOut = fadeOut * fadeOut;

    material.diffuse = uColor.rgb;
    material.emission = uColor.rgb * ring * fadeOut * 3.0;
    material.alpha = ring * fadeOut * 0.8;
    return material;
  }
`;

const DEFAULT_COLORMAP = { name: 'thermal', opacity: 1 };

/**
 * GlobeWaterColumn — renders a fully animated 3D water prism on the Cesium globe.
 */
export default function GlobeWaterColumn({ viewer }: GlobeWaterColumnProps) {
  const { selectedLat: focusLat, selectedLon: focusLon, selectedDate: date, selectedDepth: depth } = useExplorerStore();
  const variable = 'temperature';
  const colormap = DEFAULT_COLORMAP;

  // Refs
  const primitivesRef = useRef<unknown[]>([]);
  const materialsRef = useRef<unknown[]>([]);
  const preRenderRef = useRef<(() => void) | null>(null);
  const animFrameRef = useRef<number>(0);
  const profileRef = useRef<ColumnProfile | null>(null);
  const currentExtrusionRef = useRef<number>(0);
  const isOpenRef = useRef(false);
  const cesiumRef = useRef<typeof import('cesium') | null>(null);
  const sonarIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stable refs
  const focusLatRef = useRef(focusLat);
  const focusLonRef = useRef(focusLon);
  const depthRef = useRef(depth);
  const variableRef = useRef(variable);
  const colormapRef = useRef(colormap);
  const viewerRef = useRef(viewer);

  const dateRef = useRef(date);
  useEffect(() => { focusLatRef.current = focusLat; }, [focusLat]);
  useEffect(() => { focusLonRef.current = focusLon; }, [focusLon]);
  useEffect(() => { dateRef.current = date; }, [date]);
  useEffect(() => { depthRef.current = depth; }, [depth]);
  useEffect(() => { viewerRef.current = viewer; }, [viewer]);

  // ── Fetch profile ───────────────────────────────────────────────────────
  const fetchProfile = useCallback(async (lat: number, lon: number): Promise<ColumnProfile | null> => {
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, date: dateRef.current })
      });
      const data = await res.json();
      if (!data.depths || data.depths.length === 0) return null;
      return { depths: data.depths, temperature: data.temperature };
    } catch { return null; }
  }, []);

  // ── Clear everything ────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    const v = viewerRef.current as {
      scene: {
        primitives: { remove(p: unknown): void; contains(p: unknown): boolean };
        preRender: { removeEventListener(fn: () => void): void };
      };
      entities: { remove(e: unknown): void };
    } | null;
    if (!v) return;

    primitivesRef.current.forEach((p) => {
      try {
        if ('rectangle' in (p as object) || 'polyline' in (p as object) || 'label' in (p as object) || 'position' in (p as object)) {
          v.entities.remove(p);
        } else if (v.scene.primitives.contains(p)) {
          v.scene.primitives.remove(p);
        }
      } catch { /* already removed */ }
    });
    primitivesRef.current = [];
    materialsRef.current = [];

    if (preRenderRef.current) {
      try { v.scene.preRender.removeEventListener(preRenderRef.current); } catch {}
      preRenderRef.current = null;
    }

    if (sonarIntervalRef.current) {
      clearInterval(sonarIntervalRef.current);
      sonarIntervalRef.current = null;
    }
  }, []);

  // ── Build the complete animated water column ────────────────────────────
  const buildColumn = useCallback((lat: number, lon: number, extrusion: number) => {
    if (!viewerRef.current || !cesiumRef.current || extrusion <= 0) return;

    const Cesium = cesiumRef.current;
    const v = viewerRef.current as {
      scene: {
        primitives: { add(p: unknown): unknown; remove(p: unknown): void; contains(p: unknown): boolean };
        preRender: { addEventListener(fn: () => void): void; removeEventListener(fn: () => void): void };
        requestRender(): void;
        globe: { ellipsoid: unknown };
      };
      entities: { add(e: unknown): unknown; remove(e: unknown): void };
    };

    // Clear previous
    clearAll();

    const halfDeg = FOOTPRINT_DEG / 2;
    const west = lon - halfDeg;
    const east = lon + halfDeg;
    const south = lat - halfDeg;
    const north = lat + halfDeg;

    // ════════════════════════════════════════════════════════════════════════
    // 1. ANIMATED WAVY OCEAN SURFACE
    // ════════════════════════════════════════════════════════════════════════
    const surfaceMaterial = new Cesium.Material({
      fabric: {
        type: 'OceanSurfaceAnim_' + Math.floor(Math.random() * 1000000),
        uniforms: {
          uTime: 0.0,
          uDeepColor: new Cesium.Color(0.01, 0.12, 0.30, 1.0),
          uShallowColor: new Cesium.Color(0.10, 0.65, 0.60, 1.0),
          uFoamColor: new Cesium.Color(0.85, 0.95, 0.98, 1.0),
          uOpacity: 0.78,
        },
        source: OCEAN_SURFACE_GLSL,
      },
    });
    materialsRef.current.push(surfaceMaterial);

    const surfaceGeom = new Cesium.GeometryInstance({
      geometry: new Cesium.RectangleGeometry({
        rectangle: Cesium.Rectangle.fromDegrees(west, south, east, north),
        height: 500,
        vertexFormat: Cesium.MaterialAppearance.MaterialSupport.ALL.vertexFormat,
      }),
    });

    const surfacePrim = v.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: surfaceGeom,
        appearance: new Cesium.MaterialAppearance({
          material: surfaceMaterial,
          translucent: true,
          flat: false,
        }),
        asynchronous: false,
      })
    );
    primitivesRef.current.push(surfacePrim);

    // ════════════════════════════════════════════════════════════════════════
    // 2. SURFACE LOCATION FOOTPRINT & GLOW OUTLINE
    // ════════════════════════════════════════════════════════════════════════
    const edgeColor = Cesium.Color.fromCssColorString('#4CE0D2');

    const topEdge = v.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          west, south, 200, east, south, 200,
          east, north, 200, west, north, 200,
          west, south, 200,
        ]),
        width: 3,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.3,
          color: edgeColor.withAlpha(0.7),
        }),
      },
    });
    primitivesRef.current.push(topEdge);

    // ════════════════════════════════════════════════════════════════════════
    // 3. 3D VOLUMETRIC COLUMN BODY
    // ════════════════════════════════════════════════════════════════════════
    // Translucent glowing block that extrudes down to the current animation depth
    const bodyMat = new Cesium.Material({
      fabric: {
        type: 'Color',
        uniforms: {
          color: new Cesium.Color(0.1, 0.6, 0.7, 0.15) // Deep cyan, highly transparent
        }
      }
    });
    materialsRef.current.push(bodyMat);

    const bodyGeom = new Cesium.GeometryInstance({
      geometry: new Cesium.RectangleGeometry({
        rectangle: Cesium.Rectangle.fromDegrees(west, south, east, north),
        height: 0,
        extrudedHeight: -extrusion,
        vertexFormat: Cesium.MaterialAppearance.MaterialSupport.ALL.vertexFormat
      })
    });

    const bodyPrim = v.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: bodyGeom,
        appearance: new Cesium.MaterialAppearance({
          material: bodyMat,
          translucent: true,
          flat: true
        }),
        asynchronous: false
      })
    );
    primitivesRef.current.push(bodyPrim);

    // ════════════════════════════════════════════════════════════════════════
    // 4. VERTICAL GLOWING CORNER EDGES
    // ════════════════════════════════════════════════════════════════════════
    const corners = [
      [west, south], [east, south], [east, north], [west, north]
    ];
    
    corners.forEach(([cLon, cLat]) => {
      const edge = v.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights([
            cLon, cLat, 0,
            cLon, cLat, -extrusion
          ]),
          width: 3,
          material: new Cesium.PolylineDashMaterialProperty({
            color: edgeColor.withAlpha(0.6),
            dashLength: 15
          })
        }
      });
      primitivesRef.current.push(edge);
    });

    // ════════════════════════════════════════════════════════════════════════
    // 7. SONAR PING RINGS
    // ════════════════════════════════════════════════════════════════════════
    const spawnPing = () => {
      if (!cesiumRef.current || !viewerRef.current) return;
      const CesiumMod = cesiumRef.current;
      const viewer = viewerRef.current as typeof v;
      const curDepth = depthRef.current;
      const pingH = -(curDepth * VERT_EXAGGERATION);
      if (Math.abs(pingH) > currentExtrusionRef.current) return;

      const pingMat = new CesiumMod.Material({
        fabric: {
          type: 'SonarPingAnim_' + Math.floor(Math.random() * 1000000),
          uniforms: {
            uTime: 0.0,
            uBirthTime: performance.now() / 1000,
            uColor: new CesiumMod.Color(0.298, 0.878, 0.824, 1.0),
            uDuration: 2.5,
          },
          source: SONAR_PING_GLSL,
        },
      });
      materialsRef.current.push(pingMat);

      const pingSize = FOOTPRINT_DEG * 0.8;
      const pingGeom = new CesiumMod.GeometryInstance({
        geometry: new CesiumMod.RectangleGeometry({
          rectangle: CesiumMod.Rectangle.fromDegrees(
            lon - pingSize / 2, lat - pingSize / 2,
            lon + pingSize / 2, lat + pingSize / 2
          ),
          height: pingH + 100,
          vertexFormat: CesiumMod.MaterialAppearance.MaterialSupport.ALL.vertexFormat,
        }),
      });

      const pingPrim = viewer.scene.primitives.add(
        new CesiumMod.Primitive({
          geometryInstances: pingGeom,
          appearance: new CesiumMod.MaterialAppearance({
            material: pingMat,
            translucent: true,
            flat: true,
          }),
          asynchronous: false,
        })
      );
      primitivesRef.current.push(pingPrim);

      setTimeout(() => {
        try {
          if (viewer.scene.primitives.contains(pingPrim)) {
            viewer.scene.primitives.remove(pingPrim);
          }
          const idx = primitivesRef.current.indexOf(pingPrim);
          if (idx >= 0) primitivesRef.current.splice(idx, 1);
          const matIdx = materialsRef.current.indexOf(pingMat);
          if (matIdx >= 0) materialsRef.current.splice(matIdx, 1);
        } catch {}
      }, 2600);
    };

    sonarIntervalRef.current = setInterval(spawnPing, 3000);
    setTimeout(spawnPing, 500);

    // ════════════════════════════════════════════════════════════════════════
    // 8. ANIMATION LOOP — update all shader uniforms every frame
    // ════════════════════════════════════════════════════════════════════════
    const startTime = performance.now() / 1000;

    const onPreRender = () => {
      const now = performance.now() / 1000;
      const elapsed = now - startTime;

      materialsRef.current.forEach((mat) => {
        try {
          const m = mat as { uniforms: { uTime: number } };
          if (m.uniforms && 'uTime' in m.uniforms) {
            m.uniforms.uTime = elapsed;
          }
        } catch {}
      });
    };

    v.scene.preRender.addEventListener(onPreRender);
    preRenderRef.current = onPreRender;

    v.scene.requestRender();
  }, [clearAll]);

  // ── Main effect: open/close ─────────────────────────────────────────────
  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;

    const init = async () => {
      if (!cesiumRef.current) {
        cesiumRef.current = await import('cesium');
      }

      const isOpen = focusLat !== null && focusLon !== null;

      if (isOpen && !isOpenRef.current) {
        isOpenRef.current = true;
        const profile = await fetchProfile(focusLat!, focusLon!);
        if (cancelled) return;
        profileRef.current = profile;

        const startTime = performance.now();
        const animateOpen = (now: number) => {
          if (cancelled) return;
          const t = Math.min((now - startTime) / ANIM_DURATION_MS, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          const ext = MAX_EXTRUSION * eased;
          currentExtrusionRef.current = ext;
          buildColumn(focusLat!, focusLon!, ext);
          if (t < 1) {
            animFrameRef.current = requestAnimationFrame(animateOpen);
          }
        };
        animFrameRef.current = requestAnimationFrame(animateOpen);

      } else if (!isOpen && isOpenRef.current) {
        isOpenRef.current = false;
        const startTime = performance.now();
        const startExt = currentExtrusionRef.current;
        const savedLat = focusLatRef.current ?? 0;
        const savedLon = focusLonRef.current ?? 0;

        const animateClose = (now: number) => {
          if (cancelled) return;
          const t = Math.min((now - startTime) / (ANIM_DURATION_MS * 0.5), 1);
          const eased = t * t;
          const ext = startExt * (1 - eased);
          currentExtrusionRef.current = ext;
          if (ext > 5000) {
            buildColumn(savedLat, savedLon, ext);
          } else {
            clearAll();
            profileRef.current = null;
          }
          if (t < 1 && ext > 5000) {
            animFrameRef.current = requestAnimationFrame(animateClose);
          }
        };
        animFrameRef.current = requestAnimationFrame(animateClose);
      }
    };

    init();
    return () => { cancelled = true; cancelAnimationFrame(animFrameRef.current); };
  }, [viewer, focusLat, focusLon, fetchProfile, buildColumn, clearAll]);

  // ── Rebuild when depth, variable, or colormap changes ───────────────────
  useEffect(() => {
    if (!viewer || !isOpenRef.current || focusLat === null || focusLon === null) return;
    if (currentExtrusionRef.current >= MAX_EXTRUSION * 0.95) {
      buildColumn(focusLat, focusLon, currentExtrusionRef.current);
    }
  }, [viewer, depth, variable, colormap, focusLat, focusLon, buildColumn]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearAll();
    };
  }, [clearAll]);

  return null;
}
