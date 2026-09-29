'use client';

import React, { useEffect, useRef } from 'react';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { useSurfaceField } from '@/lib/api/queries';

interface FlowAnimationLayerProps {
  viewer: unknown | null;
}

interface Particle {
  lon: number;
  lat: number;
  speed: number;
  age: number;
  maxAge: number;
  history: { lon: number; lat: number }[];
}

export default function FlowAnimationLayer({ viewer }: FlowAnimationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { showCurrents, showWinds, selectedDate } = useExplorerStore();

  const isCurrents = showCurrents;
  const isWinds = showWinds;
  const isFlowActive = isCurrents || isWinds;

  const activeVariable = isCurrents ? 'currents' : isWinds ? 'winds' : null;
  const queryParams = activeVariable ? { variable: activeVariable as any, date: selectedDate } : null;
  const { data: field } = useSurfaceField(queryParams);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !viewer || !isFlowActive || !field || !field.u || !field.v) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let isCancelled = false;

    const v = viewer as {
      scene: {
        camera: { position: unknown };
        globe: { ellipsoid: unknown };
        context: unknown;
      };
      isDestroyed?: () => boolean;
    };

    import('cesium').then((Cesium) => {
      if (isCancelled || (v.isDestroyed && v.isDestroyed())) return;

      const scene = v.scene as any;
      const camera = scene.camera;
      const ellipsoid = scene.globe.ellipsoid;

      // Scratch Cesium objects to prevent garbage collection spikes in 60fps loop
      const scratchCartesian = new Cesium.Cartesian3();
      const scratchNormal = new Cesium.Cartesian3();
      const scratchCamToPt = new Cesium.Cartesian3();
      const scratchScreen = new Cesium.Cartesian2();

      const { lat: lats, lon: lons } = field;
      const uGrid = field.u;
      const vGrid = field.v;
      if (!uGrid || !vGrid) return;

      const latMin = lats[0];
      const latMax = lats[lats.length - 1];
      const lonMin = lons[0];
      const lonMax = lons[lons.length - 1];
      const nLats = lats.length;
      const nLons = lons.length;

      // Extract valid spawn points over ocean water
      const validPoints: { lon: number; lat: number; speed: number }[] = [];
      for (let i = 0; i < nLats; i++) {
        for (let j = 0; j < nLons; j++) {
          const uVal = uGrid[i]?.[j];
          const vVal = vGrid[i]?.[j];
          if (uVal !== null && vVal !== null && uVal !== undefined && vVal !== undefined) {
            const spd = Math.sqrt(uVal * uVal + vVal * vVal);
            if (spd > (isWinds ? 0.5 : 0.03)) {
              validPoints.push({ lon: lons[j], lat: lats[i], speed: spd });
            }
          }
        }
      }

      if (validPoints.length === 0) return;

      // Bilinear vector interpolation
      const sampleVector = (lon: number, lat: number) => {
        if (lon < lonMin || lon > lonMax || lat < latMin || lat > latMax) return null;

        const x = ((lon - lonMin) / (lonMax - lonMin)) * (nLons - 1);
        const y = ((lat - latMin) / (latMax - latMin)) * (nLats - 1);

        const j0 = Math.floor(x);
        const j1 = Math.min(nLons - 1, j0 + 1);
        const fx = x - j0;

        const i0 = Math.floor(y);
        const i1 = Math.min(nLats - 1, i0 + 1);
        const fy = y - i0;

        const u00 = uGrid[i0]?.[j0];
        const u01 = uGrid[i0]?.[j1];
        const u10 = uGrid[i1]?.[j0];
        const u11 = uGrid[i1]?.[j1];

        const v00 = vGrid[i0]?.[j0];
        const v01 = vGrid[i0]?.[j1];
        const v10 = vGrid[i1]?.[j0];
        const v11 = vGrid[i1]?.[j1];

        if (
          u00 == null || u01 == null || u10 == null || u11 == null ||
          v00 == null || v01 == null || v10 == null || v11 == null
        ) {
          return null;
        }

        const u = (1 - fy) * ((1 - fx) * u00 + fx * u01) + fy * ((1 - fx) * u10 + fx * u11);
        const v = (1 - fy) * ((1 - fx) * v00 + fx * v01) + fy * ((1 - fx) * v10 + fx * v11);
        const speed = Math.sqrt(u * u + v * v);

        return { u, v, speed };
      };

      const particleCount = isWinds ? 2200 : 1800;
      const maxHistory = isWinds ? 20 : 14;
      const speedScale = isWinds ? 0.022 : 0.085;

      const resetParticle = (p: Particle) => {
        const pt = validPoints[Math.floor(Math.random() * validPoints.length)];
        p.lon = pt.lon + (Math.random() - 0.5) * 0.25;
        p.lat = pt.lat + (Math.random() - 0.5) * 0.25;
        p.speed = pt.speed;
        p.age = Math.floor(Math.random() * (isWinds ? 40 : 50));
        p.maxAge = (isWinds ? 60 : 70) + Math.floor(Math.random() * 60);
        p.history = [{ lon: p.lon, lat: p.lat }];
      };

      const particles: Particle[] = [];
      for (let k = 0; k < particleCount; k++) {
        const p: Particle = { lon: 0, lat: 0, speed: 0, age: 0, maxAge: 100, history: [] };
        resetParticle(p);
        particles.push(p);
      }

      let lastW = 0;
      let lastH = 0;

      const render = () => {
        if (isCancelled) return;

        const clientW = canvas.clientWidth;
        const clientH = canvas.clientHeight;

        if (clientW === 0 || clientH === 0) {
          animFrameId = requestAnimationFrame(render);
          return;
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (clientW !== lastW || clientH !== lastH) {
          canvas.width = clientW * dpr;
          canvas.height = clientH * dpr;
          lastW = clientW;
          lastH = clientH;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, clientW, clientH);

        const cameraPos = camera.position;

        for (let k = 0; k < particles.length; k++) {
          const p = particles[k];
          p.age++;

          const vec = sampleVector(p.lon, p.lat);
          if (!vec || p.age >= p.maxAge || vec.speed < (isWinds ? 0.2 : 0.015)) {
            resetParticle(p);
            continue;
          }

          p.speed = vec.speed;
          const cosLat = Math.max(0.15, Math.cos((p.lat * Math.PI) / 180));
          p.lon += (vec.u / cosLat) * speedScale;
          p.lat += vec.v * speedScale;

          p.history.push({ lon: p.lon, lat: p.lat });
          if (p.history.length > maxHistory) {
            p.history.shift();
          }

          if (p.history.length < 2) continue;

          // Project history points to screen
          const screenPoints: { x: number; y: number }[] = [];
          for (let m = 0; m < p.history.length; m++) {
            const hPt = p.history[m];
            Cesium.Cartesian3.fromDegrees(hPt.lon, hPt.lat, 200, ellipsoid, scratchCartesian);

            // Ellipsoid horizon occlusion check
            ellipsoid.geodeticSurfaceNormal(scratchCartesian, scratchNormal);
            Cesium.Cartesian3.subtract(scratchCartesian, cameraPos, scratchCamToPt);
            if (Cesium.Cartesian3.dot(scratchNormal, scratchCamToPt) >= 0) {
              // Back hemisphere (behind globe horizon)
              continue;
            }

            const winCoord = Cesium.SceneTransforms.worldToWindowCoordinates(scene, scratchCartesian, scratchScreen);
            if (winCoord) {
              screenPoints.push({ x: winCoord.x, y: winCoord.y });
            }
          }

          if (screenPoints.length < 2) continue;

          // Draw streamline
          ctx.beginPath();
          ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
          for (let m = 1; m < screenPoints.length; m++) {
            ctx.lineTo(screenPoints[m].x, screenPoints[m].y);
          }

          const headPt = screenPoints[screenPoints.length - 1];

          if (isWinds) {
            // Wind Streamlines: Golden Amber to Cyan-White
            const normSpd = Math.min(p.speed / 14.0, 1.0);
            let strokeColor = `rgba(56, 189, 248, ${0.4 + normSpd * 0.5})`;
            if (normSpd > 0.6) {
              strokeColor = `rgba(249, 115, 22, ${0.6 + normSpd * 0.4})`;
            } else if (normSpd > 0.3) {
              strokeColor = `rgba(251, 191, 36, ${0.5 + normSpd * 0.4})`;
            }

            ctx.lineWidth = 1.4 + normSpd * 1.2;
            ctx.strokeStyle = strokeColor;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Head particle dot
            ctx.beginPath();
            ctx.arc(headPt.x, headPt.y, 1.4 + normSpd * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = normSpd > 0.6 ? '#FFAA33' : normSpd > 0.3 ? '#FDE047' : '#BAE6FD';
            ctx.fill();
          } else {
            // Ocean Currents: Glowing Bioluminescent Cyan / Turquoise
            const normSpd = Math.min(p.speed / 1.2, 1.0);
            let strokeColor = `rgba(6, 182, 212, ${0.4 + normSpd * 0.5})`;
            if (normSpd > 0.6) {
              strokeColor = `rgba(224, 254, 255, ${0.7 + normSpd * 0.3})`;
            } else if (normSpd > 0.25) {
              strokeColor = `rgba(0, 240, 255, ${0.5 + normSpd * 0.45})`;
            }

            ctx.lineWidth = 1.6 + normSpd * 1.4;
            ctx.strokeStyle = strokeColor;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Head particle droplet
            ctx.beginPath();
            ctx.arc(headPt.x, headPt.y, 1.6 + normSpd * 1.0, 0, Math.PI * 2);
            ctx.fillStyle = normSpd > 0.5 ? '#E0F2FE' : '#00F0FF';
            ctx.shadowColor = '#00F0FF';
            ctx.shadowBlur = normSpd > 0.5 ? 6 : 3;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        animFrameId = requestAnimationFrame(render);
      };

      animFrameId = requestAnimationFrame(render);
    });

    return () => {
      isCancelled = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (canvas) {
        const ctx2 = canvas.getContext('2d');
        if (ctx2) ctx2.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [viewer, isFlowActive, field, isWinds]);

  if (!isFlowActive) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10 w-full h-full"
        style={{ mixBlendMode: 'screen' }}
      />
      {/* Dynamic Flow HUD Badge */}
      <div className="pointer-events-none absolute top-14 right-6 z-20 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWinds ? 'bg-amber-400' : 'bg-cyan-400'}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isWinds ? 'bg-amber-400' : 'bg-cyan-400'}`} />
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-white/90">
          <span className={isWinds ? 'text-amber-300 font-bold' : 'text-cyan-300 font-bold'}>
            {isWinds ? 'ERA5 10m Neutral Winds' : 'Copernicus Surface Currents'}
          </span>
          <span className="text-white/40">•</span>
          <span className="text-white/60">
            {isWinds ? '2,200 Streamlines' : '1,800 Streamlines'}
          </span>
          <span className="text-white/40">•</span>
          <span className={isWinds ? 'text-amber-400/90' : 'text-cyan-400/90'}>
            60 FPS Flow
          </span>
        </div>
      </div>
    </>
  );
}
