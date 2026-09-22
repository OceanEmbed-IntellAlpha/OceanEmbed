import { useMemo } from 'react';
import * as THREE from 'three';
import { ArgoTelemetry, ArgoMissionStage } from './useArgoStore';

export interface ArgoProfilePoint {
  depth: number;
  temperature: number;
  salinity: number;
  oxygen: number;
}

// Typical Northern Indian Ocean / Arabian Sea Argo CTD profile down to 2,000m
export const ARGO_PROFILE_DATA: ArgoProfilePoint[] = [
  { depth: 0,    temperature: 29.4, salinity: 34.2, oxygen: 215 },
  { depth: 50,   temperature: 28.8, salinity: 34.5, oxygen: 210 },
  { depth: 100,  temperature: 25.1, salinity: 35.1, oxygen: 185 },
  { depth: 200,  temperature: 18.4, salinity: 35.5, oxygen: 110 },
  { depth: 400,  temperature: 13.8, salinity: 35.2, oxygen: 75 },
  { depth: 600,  temperature: 10.2, salinity: 35.0, oxygen: 62 },  // Oxygen Minimum Zone (OMZ)
  { depth: 800,  temperature: 7.9,  salinity: 34.9, oxygen: 80 },
  { depth: 1000, temperature: 6.4,  salinity: 34.8, oxygen: 115 }, // Neutral Drift Parking Depth
  { depth: 1200, temperature: 5.1,  salinity: 34.7, oxygen: 135 },
  { depth: 1500, temperature: 3.6,  salinity: 34.7, oxygen: 155 },
  { depth: 1800, temperature: 2.6,  salinity: 34.7, oxygen: 170 },
  { depth: 2000, temperature: 2.1,  salinity: 34.7, oxygen: 180 }, // Bathypelagic Apex
];

// 3D Trajectory Waypoints calibrated for 2,000m depth scale:
// Y = 1.35 is Surface (0m)
// Y = -0.21 is Parking Drift (1,000m)
// Y = -1.78 is Bathypelagic Apex (2,000m)
export const ARGO_TRAJECTORY_WAYPOINTS = [
  new THREE.Vector3(-4.6, 1.35, 0),   // 1. Surface Satellite Uplink & GPS Fix (0m)
  new THREE.Vector3(-3.8, 1.15, 0),   // 2. Buoyancy contraction dive initiation
  new THREE.Vector3(-2.8, -0.21, 0),  // 3. Arrival at 1,000m Parking Depth
  new THREE.Vector3(-1.1, -0.21, 0),  // 4. Neutral isobaric drift with deep ocean currents
  new THREE.Vector3(0.5, -0.21, 0),   // 5. Multi-day isobaric parking drift continuation
  new THREE.Vector3(1.8, -0.21, 0),   // 6. Drift completion, dive command initiated
  new THREE.Vector3(2.6, -1.78, 0),   // 7. Dive to Bathypelagic Profile Apex (2,000m)
  new THREE.Vector3(3.4, -0.21, 0),   // 8. Continuous vertical CTD profiling ascent (passing 1,000m)
  new THREE.Vector3(4.0, 0.72, 0),    // 9. Continuous vertical CTD profiling ascent (passing 200m photic)
  new THREE.Vector3(4.6, 1.35, 0),    // 10. Surface broach, antenna raised & data packet upload (0m)
];

export const ARGO_TRAJECTORY_CURVE = new THREE.CatmullRomCurve3(
  ARGO_TRAJECTORY_WAYPOINTS,
  false,
  'catmullrom',
  0.35
);

/**
 * Calculates authentic Argo mission stage metadata for a given normalized progress (0.0 to 1.0)
 */
export function getArgoMissionStage(prog: number): ArgoMissionStage {
  const t = Math.max(0, Math.min(1, prog));

  if (t < 0.08) {
    return {
      name: 'SURFACE TRANSMISSION & GPS FIX',
      quote: 'Float floats vertically at surface with antenna elevated. GPS location acquired and 10-day CTD profile data transmitted via Iridium.',
      isSurfaced: true,
      motorRunning: false,
      color: '#38bdf8',
    };
  }
  if (t < 0.22) {
    return {
      name: 'DESCENT TO PARKING DEPTH (1,000M)',
      quote: 'Hydraulic engine retracts external oil bladder (-250 cc). Float steadily descends to the 1,000-meter neutral isobaric parking depth.',
      isSurfaced: false,
      motorRunning: true,
      color: '#0284c7',
    };
  }
  if (t < 0.65) {
    return {
      name: 'SUBSURFACE ISOBARIC DRIFT (1,000M)',
      quote: 'Float neutrally drifts with deep ocean currents at 1,000m for 8–9 days, tracking subsurface current velocity without motor propulsion.',
      isSurfaced: false,
      motorRunning: false,
      color: '#0369a1',
    };
  }
  if (t < 0.78) {
    return {
      name: 'DESCENT TO BATHYPELAGIC APEX (2,000M)',
      quote: 'Micro-pump draws remaining oil to increase density. Float descends from 1,000m to the 2,000-meter bathypelagic apex before ascent profiling.',
      isSurfaced: false,
      motorRunning: true,
      color: '#f59e0b',
    };
  }
  if (t < 0.94) {
    return {
      name: 'ASCENDING CTD PROFILE (2,000M → 0M)',
      quote: 'Buoyancy engine inflates external bladder (+250 cc). Float ascends at ~10 cm/s while CTD sensor continuously samples conductivity, temperature, and pressure.',
      isSurfaced: false,
      motorRunning: true,
      color: '#10b981',
    };
  }
  return {
    name: 'SURFACE BROACH & DATA UPLINK',
    quote: 'Vehicle broaches ocean surface, antenna raised above wave crests. Transmission cycle initiated to downlink profiles to shore data centers.',
    isSurfaced: true,
    motorRunning: false,
    color: '#38bdf8',
  };
}

/**
 * Calculates authentic real-time telemetry given normalized mission time (0.0 to 1.0)
 */
export function calculateArgoTelemetry(missionTime: number): ArgoTelemetry {
  const t = Math.max(0, Math.min(1, missionTime));

  let currentDepth = 0;
  let displacement = 250; // cc

  if (t < 0.08) {
    // Phase 1: Surface
    currentDepth = 0;
    displacement = 250;
  } else if (t < 0.22) {
    // Phase 2: Descent 0m -> 1,000m
    const frac = (t - 0.08) / (0.22 - 0.08);
    currentDepth = frac * 1000;
    displacement = -250;
  } else if (t < 0.65) {
    // Phase 3: Isobaric neutral drift at 1,000m
    currentDepth = 1000;
    displacement = 0; // Neutral density
  } else if (t < 0.78) {
    // Phase 4: Descent 1,000m -> 2,000m
    const frac = (t - 0.65) / (0.78 - 0.65);
    currentDepth = 1000 + frac * 1000;
    displacement = -250;
  } else if (t < 0.94) {
    // Phase 5: Ascending profile 2,000m -> 0m
    const frac = (t - 0.78) / (0.94 - 0.78);
    currentDepth = 2000 * (1 - frac);
    displacement = 250; // Positive buoyancy
  } else {
    // Phase 6: Surface broach
    currentDepth = 0;
    displacement = 250;
  }

  // Interpolate CTD readings from depth
  let temperature = 29.4;
  let salinity = 34.2;

  for (let i = 0; i < ARGO_PROFILE_DATA.length - 1; i++) {
    const d0 = ARGO_PROFILE_DATA[i].depth;
    const d1 = ARGO_PROFILE_DATA[i + 1].depth;
    if (currentDepth >= d0 && currentDepth <= d1) {
      const frac = (currentDepth - d0) / (d1 - d0);
      temperature = ARGO_PROFILE_DATA[i].temperature + (ARGO_PROFILE_DATA[i + 1].temperature - ARGO_PROFILE_DATA[i].temperature) * frac;
      salinity = ARGO_PROFILE_DATA[i].salinity + (ARGO_PROFILE_DATA[i + 1].salinity - ARGO_PROFILE_DATA[i].salinity) * frac;
      break;
    }
  }

  // Pressure: roughly 1.01 dbar per meter depth
  const pressure = Math.round(currentDepth * 1.01);
  const batteryLevel = Number((95.4 - t * 0.4).toFixed(1));

  return {
    depth: Math.round(currentDepth * 10) / 10,
    temperature: Math.round(temperature * 100) / 100,
    salinity: Math.round(salinity * 100) / 100,
    pressure,
    displacement,
    batteryLevel,
    cycleIndex: 142,
  };
}

export function useArgoMission() {
  return useMemo(
    () => ({
      profile: ARGO_PROFILE_DATA,
      maxDepth: 2000,
      transectLocation: 'Arabian Sea — INCOIS Deep Apex Profile (12.8°N, 68.4°E)',
      trajectoryCurve: ARGO_TRAJECTORY_CURVE,
    }),
    []
  );
}
