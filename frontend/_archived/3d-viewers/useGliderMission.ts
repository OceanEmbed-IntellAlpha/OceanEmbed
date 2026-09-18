import { useMemo } from 'react';
import * as THREE from 'three';
import { GliderTelemetry, GliderMissionStage } from './useGliderStore';

export interface GliderProfilePoint {
  depth: number;
  temperature: number;
  salinity: number;
}

// Typical Indian Ocean / Arabian Sea CTD transect profile down to 1000m
export const GLIDER_PROFILE_DATA: GliderProfilePoint[] = [
  { depth: 0,    temperature: 29.6, salinity: 33.5 },
  { depth: 25,   temperature: 29.4, salinity: 33.6 },
  { depth: 50,   temperature: 28.7, salinity: 34.0 },
  { depth: 75,   temperature: 26.8, salinity: 34.6 },
  { depth: 100,  temperature: 24.2, salinity: 35.1 },
  { depth: 150,  temperature: 20.8, salinity: 35.3 },
  { depth: 200,  temperature: 17.5, salinity: 35.2 },
  { depth: 300,  temperature: 14.1, salinity: 35.1 },
  { depth: 400,  temperature: 11.9, salinity: 35.0 },
  { depth: 500,  temperature: 10.4, salinity: 34.9 },
  { depth: 600,  temperature: 9.3,  salinity: 34.8 },
  { depth: 700,  temperature: 8.5,  salinity: 34.8 },
  { depth: 800,  temperature: 7.9,  salinity: 34.8 },
  { depth: 900,  temperature: 7.4,  salinity: 34.8 },
  { depth: 1000, temperature: 7.1,  salinity: 34.8 },
];

// Sawtooth Trajectory Waypoints (Y = 1.35 is Surface 0m, Y = -1.78 is Deep Apex 1000m)
export const SAWTOOTH_WAYPOINTS = [
  new THREE.Vector3(-4.6, 1.35, 0),   // 1. Surface Fix & Satellite Uplink
  new THREE.Vector3(-3.4, 1.05, 0),   // 2. Dive broach
  new THREE.Vector3(-2.0, 0.30, 0),   // 3. Glide descent (200m)
  new THREE.Vector3(-0.6, -0.70, 0),  // 4. Glide descent (700m)
  new THREE.Vector3(0.5, -1.78, 0),   // 5. Deep Apex 1000m Seabed Inflection
  new THREE.Vector3(1.8, -0.70, 0),   // 6. Ascent climb (700m)
  new THREE.Vector3(3.2, 0.30, 0),    // 7. Ascent climb (200m)
  new THREE.Vector3(4.6, 1.35, 0),    // 8. Surface broach & telemetry download
];

export const GLIDER_TRAJECTORY_CURVE = new THREE.CatmullRomCurve3(
  SAWTOOTH_WAYPOINTS,
  false,
  'catmullrom',
  0.5
);

/**
 * Calculates mission stage metadata for a given normalized mission progress (0.0 to 1.0)
 */
export function getGliderMissionStage(prog: number): GliderMissionStage {
  if (prog < 0.14) {
    return {
      name: 'SURFACE TELEMETRY & GPS FIX',
      quote: 'Telemetry is accomplished with Iridium satellite communications. GPS fix acquired while surfaced.',
      isSurfaced: true,
      motorRunning: false,
      color: '#38bdf8',
    };
  }
  if (prog < 0.45) {
    return {
      name: 'GLIDE DESCENT — DIVE TO 1,000M',
      quote: 'While submerged the vehicle navigates using 3-axis compass, pressure sensor, and altimeter collecting vertical CTD profiles.',
      isSurfaced: false,
      motorRunning: true,
      color: '#0284c7',
    };
  }
  if (prog < 0.60) {
    return {
      name: 'DEEPWATER APEX (1,000M) — SEABED INFLECTION',
      quote: 'Apex depth of 1,000 meters reached. Pumping oil into external bladder (+350 cc) to reverse buoyancy for ascent.',
      isSurfaced: false,
      motorRunning: true,
      color: '#f59e0b',
    };
  }
  if (prog < 0.88) {
    return {
      name: 'ASCENT PROFILE — VERTICAL OCEAN PROFILING',
      quote: 'CTD sensor suite samples upper thermocline water column during positive-buoyancy upward glide.',
      isSurfaced: false,
      motorRunning: true,
      color: '#10b981',
    };
  }
  return {
    name: 'SURFACE ARRIVAL — DATA TRANSMISSION',
    quote: 'Vehicle surfaces tail-up, antenna raised above waves. Telemetry and ocean profile data transmitted to ground station.',
    isSurfaced: true,
    motorRunning: false,
    color: '#38bdf8',
  };
}

/**
 * Calculates real-time telemetry given normalized mission time (0.0 to 1.0)
 */
export function calculateGliderTelemetry(missionTime: number): GliderTelemetry {
  const t = Math.max(0, Math.min(1, missionTime));

  // Depth factor: 0 at t=0, 1 at t=0.5, 0 at t=1.0
  const depthProgress = t <= 0.5 ? t * 2 : (1 - t) * 2;
  const currentDepth = depthProgress * 1000;

  // Interpolate CTD readings
  const maxIdx = GLIDER_PROFILE_DATA.length - 1;
  const rawIdx = depthProgress * maxIdx;
  const i0 = Math.floor(rawIdx);
  const i1 = Math.min(i0 + 1, maxIdx);
  const frac = rawIdx - i0;

  const p0 = GLIDER_PROFILE_DATA[i0];
  const p1 = GLIDER_PROFILE_DATA[i1];

  const temperature = p0.temperature + (p1.temperature - p0.temperature) * frac;
  const salinity = p0.salinity + (p1.salinity - p0.salinity) * frac;

  // Hydrodynamic kinematics
  let pitch: number;
  let displacement: number;
  let batteryShiftMM: number;

  if (t < 0.14) {
    pitch = 8; // Tail raised for antenna uplink
    displacement = 350; // Maximum positive buoyancy
    batteryShiftMM = -80.0; // Aft battery mass
  } else if (t < 0.45) {
    pitch = -18.5; // Negative glide pitch
    displacement = -350; // Negative buoyancy
    batteryShiftMM = 75.0; // Forward battery mass
  } else if (t <= 0.58) {
    // Inflection transition
    const blend = (t - 0.45) / 0.13;
    pitch = -18.5 + blend * 36.5;
    displacement = -350 + blend * 700;
    batteryShiftMM = 75.0 - blend * 155.0;
  } else if (t < 0.88) {
    pitch = 18.0; // Positive climb pitch
    displacement = 350; // Positive buoyancy
    batteryShiftMM = -75.0; // Aft battery mass
  } else {
    pitch = 8.0; // Surfaced attitude
    displacement = 350;
    batteryShiftMM = -80.0;
  }

  const velocity = Math.abs(pitch) > 10 ? 0.38 : 0.22;
  const batteryLevel = Number((98 - t * 0.8).toFixed(1));

  return {
    depth: Math.round(currentDepth * 10) / 10,
    pitch: Math.round(pitch * 10) / 10,
    velocity,
    temperature: Math.round(temperature * 100) / 100,
    salinity: Math.round(salinity * 100) / 100,
    displacement: Math.round(displacement),
    batteryShiftMM: Math.round(batteryShiftMM * 10) / 10,
    batteryLevel,
    cycleIndex: 1,
  };
}

export function useGliderMission() {
  return useMemo(
    () => ({
      profile: GLIDER_PROFILE_DATA,
      maxDepth: 1000,
      transectLocation: 'Arabian Sea — INCOIS Shelf Transect (15.4°N, 73.2°E)',
      trajectoryCurve: GLIDER_TRAJECTORY_CURVE,
    }),
    []
  );
}
