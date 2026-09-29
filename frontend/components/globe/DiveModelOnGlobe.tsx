'use client';

import { useEffect, useRef, useState } from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { Target, Maximize, Layers } from 'lucide-react';

const getDepthZone = (depth: number) => {
  if (depth <= 10) return { name: 'SURFACE', desc: '0–10m', color: '#4CE0D2' };
  if (depth <= 30) return { name: 'NEAR SURFACE', desc: '10–30m', color: '#38BDF8' };
  if (depth <= 75) return { name: 'UPPER OCEAN', desc: '30–75m', color: '#0EA5E9' };
  if (depth <= 150) return { name: 'THERMOCLINE', desc: '75–150m', color: '#0284C7' };
  if (depth <= 300) return { name: 'UPPER DEEP', desc: '150–300m', color: '#2563EB' };
  if (depth <= 500) return { name: 'DEEP', desc: '300–500m', color: '#3B82F6' };
  if (depth <= 700) return { name: 'VERY DEEP', desc: '500–700m', color: '#60A5FA' };
  return { name: 'DEEP OCEAN', desc: '700–1000m', color: '#93C5FD' };
};

const DEPTH_ATMOSPHERE_LAYERS = [
  { d: 0,    r: 0,   g: 75,  b: 115, a: 0.16 }, // Surface (#004b73)
  { d: 10,   r: 0,   g: 58,  b: 92,  a: 0.24 }, // Near Surface (#003a5c)
  { d: 30,   r: 0,   g: 38,  b: 66,  a: 0.35 }, // Upper Ocean (#002642)
  { d: 75,   r: 0,   g: 21,  b: 41,  a: 0.48 }, // Thermocline (#001529)
  { d: 150,  r: 0,   g: 11,  b: 24,  a: 0.60 }, // Upper Deep (#000b18)
  { d: 300,  r: 0,   g: 5,   b: 13,  a: 0.72 }, // Deep (#00050d)
  { d: 500,  r: 0,   g: 2,   b: 6,   a: 0.82 }, // Very Deep (#000206)
  { d: 700,  r: 0,   g: 0,   b: 0,   a: 0.90 }, // Deep Ocean (#000000)
  { d: 1000, r: 0,   g: 0,   b: 0,   a: 0.96 }, // Abyss
];

function getContinuousAtmosphere(depth: number) {
  let idx = 0;
  let t = 0;
  for (let i = 0; i < DEPTH_ATMOSPHERE_LAYERS.length - 1; i++) {
    if (depth >= DEPTH_ATMOSPHERE_LAYERS[i].d && depth <= DEPTH_ATMOSPHERE_LAYERS[i + 1].d) {
      idx = i;
      t = (depth - DEPTH_ATMOSPHERE_LAYERS[i].d) / (DEPTH_ATMOSPHERE_LAYERS[i + 1].d - DEPTH_ATMOSPHERE_LAYERS[i].d);
      break;
    }
  }
  if (depth > 1000) {
    idx = DEPTH_ATMOSPHERE_LAYERS.length - 2;
    t = 1;
  }

  // Smoothstep blend between layer color stops
  const smoothT = t * t * (3 - 2 * t);

  const l1 = DEPTH_ATMOSPHERE_LAYERS[idx];
  const l2 = DEPTH_ATMOSPHERE_LAYERS[idx + 1];

  const r = Math.round(l1.r + (l2.r - l1.r) * smoothT);
  const g = Math.round(l1.g + (l2.g - l1.g) * smoothT);
  const b = Math.round(l1.b + (l2.b - l1.b) * smoothT);
  const a = l1.a + (l2.a - l1.a) * smoothT;

  const innerAlpha = Math.max(0.04, a * 0.3).toFixed(3);
  const midAlpha = a.toFixed(3);
  const outerAlpha = Math.min(0.97, a * 1.15).toFixed(3);

  return {
    background: `radial-gradient(ellipse at 50% 45%, rgba(${r}, ${g}, ${b}, ${innerAlpha}) 0%, rgba(${Math.round(r * 0.5)}, ${Math.round(g * 0.5)}, ${Math.round(b * 0.5)}, ${midAlpha}) 60%, rgba(2, 4, 10, ${outerAlpha}) 100%)`,
    pointerEvents: 'none' as const,
  };
}

// ── Realistic Procedural Water GLSL ───────────────────────────────────────────
export const REALISTIC_OCEAN_GLSL = `
  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  vec2 fbm(vec2 p) {
    vec2 f = vec2(0.0);
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for(int i = 0; i < 4; i++) {
      f.x += a * noise(p);
      f.y += a * noise(p + 100.0);
      p = m * p;
      a *= 0.5;
    }
    return f;
  }

  czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 uv = materialInput.st * 12.0;
    float t = uTime * 0.8;

    vec2 p = uv;
    vec2 f = fbm(p - t * vec2(0.2, 0.3));
    p += f * 0.5;
    
    float wave = fbm(p * 2.0 + t * 0.5).x;
    float wave2 = fbm(p * 4.0 - t * 0.8).y;
    float finalWave = (wave + wave2) * 0.5;

    // Normal calculation via finite difference of fbm
    float dx = fbm(p + vec2(0.01, 0.0)).x - wave;
    float dy = fbm(p + vec2(0.0, 0.01)).y - wave2;
    vec3 normal = normalize(vec3(-dx * 15.0, 1.0, -dy * 15.0));
    
    // View vector
    vec3 viewDir = normalize(materialInput.positionToEyeEC);
    
    // Fresnel
    float fresnel = clamp(1.0 - dot(viewDir, normal), 0.0, 1.0);
    fresnel = pow(fresnel, 4.0);
    
    // Specular
    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.4)); // Sun direction
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 300.0) * 4.0; // Tighter, brighter specular

    // Realistic Ocean Color Palette
    vec3 deepBlue = vec3(0.01, 0.08, 0.22);
    vec3 shallowTeal = vec3(0.05, 0.35, 0.45);
    vec3 skyReflection = vec3(0.4, 0.6, 0.8);

    vec3 waterColor = mix(uDeepColor.rgb, uShallowColor.rgb, clamp(finalWave * 1.8, 0.0, 1.0));
    waterColor = mix(waterColor, skyReflection, fresnel * 0.9); // Sky reflection
    waterColor += vec3(1.0, 0.95, 0.8) * spec; // Warm sun specular

    // Foam at peaks
    float foamMask = smoothstep(0.68, 0.88, finalWave);
    waterColor = mix(waterColor, uFoamColor.rgb, foamMask * 0.7);

    // Edge fade
    float edgeFade = smoothstep(0.0, 0.1, materialInput.st.x) * smoothstep(1.0, 0.9, materialInput.st.x) *
                     smoothstep(0.0, 0.1, materialInput.st.y) * smoothstep(1.0, 0.9, materialInput.st.y);

    material.diffuse = waterColor;
    material.alpha = uOpacity * edgeFade;
    material.specular = 0.8;
    material.shininess = 50.0;
    return material;
  }
`;

export default function DiveModelOnGlobe({ viewer }: { viewer: unknown | null }) {
  const { selectedLat: lat, selectedLon: lon, selectedDepth: depth } = useExplorerStore();
  
  const [cameraMode, setCameraMode] = useState<'chase' | 'fixed'>('chase');

  const modelEntityRef = useRef<unknown>(null);
  const oceanPrimitiveRef = useRef<unknown>(null);
  const animFrameRef = useRef<number | null>(null);
  const preRenderRef = useRef<(() => void) | null>(null);
  const cesiumRef = useRef<typeof import('cesium') | null>(null);

  // Re-run setup if lat/lon/mode changes
  useEffect(() => {
    if (!viewer || lat === null || lon === null) return;

    import('cesium').then((Cesium) => {
      cesiumRef.current = Cesium;
      const v = viewer as any;

      // Enable translucency so object is visible underwater
      try {
        if (v.scene.globe) {
          v.scene.globe.translucency.enabled = true;
          v.scene.globe.translucency.frontFaceAlphaByDistance = new Cesium.NearFarScalar(400.0, 0.2, 8000.0, 1.0);
        }
      } catch {}

      // 1. Create Ocean Patch
      const patchSize = 2.0;
      const surfaceMaterial = new Cesium.Material({
        fabric: {
          type: 'RealisticDiveOcean_' + Math.floor(Math.random() * 1000000),
          uniforms: {
            uTime: 0.0,
            uDeepColor: new Cesium.Color(0.01, 0.08, 0.22, 1.0),
            uShallowColor: new Cesium.Color(0.05, 0.35, 0.45, 1.0),
            uFoamColor: new Cesium.Color(0.9, 0.95, 1.0, 1.0),
            uOpacity: 0.4, // Lower opacity to clearly see the probe underneath!
          },
          source: REALISTIC_OCEAN_GLSL,
        },
      });

      const surfaceGeom = new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle: Cesium.Rectangle.fromDegrees(
            lon - patchSize, lat - patchSize,
            lon + patchSize, lat + patchSize
          ),
          height: -5,
          vertexFormat: Cesium.MaterialAppearance.MaterialSupport.ALL.vertexFormat,
        }),
      });

      oceanPrimitiveRef.current = v.scene.primitives.add(
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

      preRenderRef.current = () => {
        surfaceMaterial.uniforms.uTime = performance.now() / 1000.0;
      };
      v.scene.preRender.addEventListener(preRenderRef.current);

      // 2. Create the Dive Object (using the Argo model)
      const entity = v.entities.add({
        id: `__dive_probe_${Date.now()}`,
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        model: {
          uri: '/glider/argo_float.glb',
          scale: 8000,
          minimumPixelSize: 64,
          maximumScale: 16000,
          silhouetteColor: Cesium.Color.fromCssColorString('#4CE0D2').withAlpha(0.9),
          silhouetteSize: 4.0,
          color: Cesium.Color.WHITE,
          colorBlendMode: Cesium.ColorBlendMode.HIGHLIGHT,
          colorBlendAmount: 0.0,
        },
        // Path trace
        path: {
          resolution: 1,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.1,
            color: Cesium.Color.CYAN,
          }),
          width: 10,
          leadTime: 0,
          trailTime: 10,
        },
        // Cutaway view for chase camera - side profile looking into the water column
        viewFrom: new Cesium.Cartesian3(0, -120000, 60000), 
      });

      modelEntityRef.current = entity;

      if (cameraMode === 'chase') {
        v.trackedEntity = entity;
      } else {
        v.trackedEntity = undefined;
        // Fly back to fixed view over the column
        v.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.5, 200000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-65),
            roll: 0.0
          },
          duration: 1.5
        });
      }

      // 3. Animation Loop for Sinking
      let bobPhase = 0;
      let visualDepthM = useExplorerStore.getState().selectedDepth;
      let lastTime = performance.now();

      const animateBob = (time: number) => {
        if (!modelEntityRef.current || !cesiumRef.current) return;
        
        const delta = Math.min((time - lastTime) / 1000.0, 0.1);
        lastTime = time;

        bobPhase += 2.0 * delta;
        const bobHeight = Math.sin(bobPhase) * 600; 

        // Target depth comes directly from the store (updated by slider/wheel)
        const targetDepthM = useExplorerStore.getState().selectedDepth;
        visualDepthM += (targetDepthM - visualDepthM) * (delta * 4.0);

        const bobAmount = visualDepthM < 20 ? bobHeight : bobHeight * 0.1;
        const altitude = -visualDepthM * 50 + bobAmount;

        // Argo: slow horizontal drift with deep ocean currents
        const depthRatio = Math.min(1.0, visualDepthM / 2000.0);
        const lonOffset = depthRatio * 0.004;
        const latOffset = depthRatio * -0.002;

        const ent = modelEntityRef.current as { position: { setValue(v: unknown): void } };
        try {
          ent.position.setValue(
            cesiumRef.current!.Cartesian3.fromDegrees(lon + lonOffset, lat + latOffset, altitude)
          );
        } catch {}

        try { v.scene.requestRender?.(); } catch {}
        animFrameRef.current = requestAnimationFrame(animateBob);
      };

      animFrameRef.current = requestAnimationFrame(animateBob);
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (preRenderRef.current && viewer) {
        try { (viewer as any).scene.preRender.removeEventListener(preRenderRef.current); } catch {}
      }
      if (modelEntityRef.current && viewer) {
        try {
          const v = viewer as any;
          if (v.trackedEntity === modelEntityRef.current) {
            v.trackedEntity = undefined;
          }
          v.entities.remove(modelEntityRef.current);
        } catch {}
      }
      if (oceanPrimitiveRef.current && viewer) {
        try { (viewer as any).scene.primitives.remove(oceanPrimitiveRef.current); } catch {}
      }
    };
  }, [viewer, lat, lon, cameraMode]);

  if (lat === null || lon === null) return null;

  const zone = getDepthZone(depth);

  return (
    <>
      {/* ── Continuous Depth Atmosphere Overlay ────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-all duration-300 ease-out"
        style={getContinuousAtmosphere(depth)}
      />

      {/* ── Depth Layer HUD ────────────────────────────────────────────── */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center animate-fade-in-up">
        <div 
          className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border mb-2 transition-all duration-300"
          style={{
            borderColor: `${zone.color}40`,
            boxShadow: `0 0 15px ${zone.color}25`
          }}
        >
          <Layers size={14} style={{ color: zone.color }} />
          <span className="font-mono text-[11px] uppercase font-bold tracking-widest" style={{ color: zone.color }}>
            {zone.desc}
          </span>
        </div>
        <h2 
          className="font-mono text-3xl font-black uppercase tracking-[0.25em] drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all duration-300"
          style={{ color: '#ffffff' }}
        >
          {zone.name}
        </h2>
        <div 
          className="h-0.5 w-40 mt-2 rounded-full transition-all duration-300" 
          style={{
            background: `linear-gradient(to right, transparent, ${zone.color}, transparent)`
          }}
        />
      </div>

      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <div className="flex items-center gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-full border border-biolume/20 shadow-[0_0_15px_rgba(0,210,255,0.15)]">
          <button
          onClick={() => setCameraMode('chase')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-[10px] uppercase font-bold transition-all ${cameraMode === 'chase' ? 'bg-biolume text-black shadow-[0_0_10px_#00D2FF]' : 'text-foam hover:bg-white/10'}`}
        >
          <Target size={14} />
          Chase Camera
        </button>
        <button
          onClick={() => setCameraMode('fixed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-[10px] uppercase font-bold transition-all ${cameraMode === 'fixed' ? 'bg-biolume text-black shadow-[0_0_10px_#00D2FF]' : 'text-foam hover:bg-white/10'}`}
        >
          <Maximize size={14} />
          Fixed View
        </button>
      </div>
    </div>
    </>
  );
}
