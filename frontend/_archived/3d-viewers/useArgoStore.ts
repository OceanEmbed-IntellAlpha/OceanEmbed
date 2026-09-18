import { create } from 'zustand';
import { ArgoSystem } from '@/lib/data/argoRegistry';

export type ArgoViewMode = 'exterior' | 'cutaway' | 'exploded' | 'mission';
// Backwards compatibility alias
export type ViewMode = ArgoViewMode | 'EXPLORE' | 'INSIDE' | 'SYSTEMS' | 'MECHANISM' | 'MISSION' | 'SENSORS';

export type ArgoCameraMode = 'wide' | 'chase';
export type ArgoDiurnalMode = 'auto' | 'noon' | 'sunset' | 'night';
export type SystemFilter = ArgoSystem | 'ALL';

export interface ArgoTelemetry {
  depth: number;          // meters (0 - 2,000)
  temperature: number;    // °C
  salinity: number;       // PSU
  pressure: number;       // dbar
  displacement: number;   // cc (+/- 250)
  batteryLevel: number;   // %
  cycleIndex: number;     // 1 to 250
}

export interface ArgoMissionStage {
  name: string;
  quote: string;
  isSurfaced: boolean;
  motorRunning: boolean;
  color: string;
}

interface ArgoState {
  viewMode: ArgoViewMode;
  setViewMode: (mode: ArgoViewMode | string) => void;

  // 3D Component Labels & Inspection
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  toggleLabels: () => void;
  selectedPart: string | null;
  setSelectedPart: (part: string | null) => void;
  hoveredPart: string | null;
  setHoveredPart: (part: string | null) => void;

  // Camera Framing & Mode
  cameraMode: ArgoCameraMode;
  setCameraMode: (mode: ArgoCameraMode) => void;
  cameraResetTrigger: number;
  triggerCameraReset: () => void;

  // 10-Day Mission Timeline & Playback
  missionTime: number;
  setMissionTime: (time: number) => void;
  missionPlaying: boolean;
  setMissionPlaying: (playing: boolean) => void;
  missionSpeed: number;
  setMissionSpeed: (speed: number) => void;

  // Diurnal Celestial Mode
  diurnalMode: ArgoDiurnalMode;
  setDiurnalMode: (mode: ArgoDiurnalMode) => void;

  // Mission stage & live telemetry
  missionStage: ArgoMissionStage;
  setMissionStage: (stage: ArgoMissionStage) => void;
  telemetry: ArgoTelemetry;
  setTelemetry: (data: Partial<ArgoTelemetry> | number, ...legacyArgs: any[]) => void;

  // Legacy compatibility fields
  focusedComponent: string | null;
  focusedComponentPos: [number, number, number] | null;
  setFocusedComponent: (componentId: string | null, pos?: [number, number, number] | null) => void;
  selectedSystem: SystemFilter;
  setSelectedSystem: (system: SystemFilter) => void;
  activeFlow: 'MEASUREMENT' | 'MOVEMENT' | 'POWER' | null;
  setActiveFlow: (flow: 'MEASUREMENT' | 'MOVEMENT' | 'POWER' | null) => void;
  pistonPosition: number;
  setPistonPosition: (pos: number) => void;
  mechanismAutoPump: boolean;
  setMechanismAutoPump: (auto: boolean) => void;
  currentDepth: number;
  currentTemp: number;
  currentSalinity: number;
  currentPressure: number;
  bgcMode: boolean;
  setBgcMode: (mode: boolean) => void;
  currentOxygen: number;
  currentChlorophyll: number;
  currentPh: number;
}

const DEFAULT_TELEMETRY: ArgoTelemetry = {
  depth: 0,
  temperature: 29.4,
  salinity: 34.2,
  pressure: 0,
  displacement: 250,
  batteryLevel: 95.4,
  cycleIndex: 142,
};

const DEFAULT_STAGE: ArgoMissionStage = {
  name: 'SURFACE TRANSMISSION & GPS FIX',
  quote: 'Float floats vertically at surface with antenna elevated. GPS location acquired and 10-day CTD profile data transmitted via Iridium.',
  isSurfaced: true,
  motorRunning: false,
  color: '#38bdf8',
};

// Mode normalization helper
function normalizeMode(mode: string): ArgoViewMode {
  const m = mode.toLowerCase();
  if (m === 'explore') return 'exterior';
  if (m === 'inside') return 'cutaway';
  if (m === 'mechanism' || m === 'systems') return 'cutaway';
  if (m === 'sensors') return 'mission';
  if (m === 'mission') return 'mission';
  if (m === 'exploded') return 'exploded';
  if (m === 'cutaway') return 'cutaway';
  return 'exterior';
}

export const useArgoStore = create<ArgoState>((set) => ({
  viewMode: 'exterior',
  setViewMode: (mode) => {
    const normalized = normalizeMode(mode);
    set({
      viewMode: normalized,
      selectedPart: null,
      focusedComponent: null,
    });
  },

  showLabels: true,
  setShowLabels: (show) => set({ showLabels: show }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),

  selectedPart: null,
  setSelectedPart: (part) => set({ selectedPart: part, focusedComponent: part }),

  hoveredPart: null,
  setHoveredPart: (part) => set({ hoveredPart: part }),

  cameraMode: 'wide',
  setCameraMode: (mode) => set({ cameraMode: mode }),
  cameraResetTrigger: 0,
  triggerCameraReset: () => set((s) => ({ cameraResetTrigger: s.cameraResetTrigger + 1 })),

  missionTime: 0,
  setMissionTime: (time) => set({ missionTime: time }),

  missionPlaying: false,
  setMissionPlaying: (playing) => set({ missionPlaying: playing }),

  missionSpeed: 1,
  setMissionSpeed: (speed) => set({ missionSpeed: speed }),

  diurnalMode: 'auto',
  setDiurnalMode: (mode) => set({ diurnalMode: mode }),

  missionStage: DEFAULT_STAGE,
  setMissionStage: (stage) => set({ missionStage: stage }),

  telemetry: DEFAULT_TELEMETRY,
  setTelemetry: (data, ...legacyArgs) => {
    if (typeof data === 'number') {
      // Legacy signature: (depth, temp, salinity, pressure, ox?, chl?, ph?)
      const depth = data;
      const temp = legacyArgs[0] ?? 20;
      const sal = legacyArgs[1] ?? 35;
      const pres = legacyArgs[2] ?? depth * 1.01;
      const ox = legacyArgs[3] ?? 150;
      const chl = legacyArgs[4] ?? 0;
      const ph = legacyArgs[5] ?? 8.1;
      set((state) => ({
        currentDepth: depth,
        currentTemp: temp,
        currentSalinity: sal,
        currentPressure: pres,
        currentOxygen: ox,
        currentChlorophyll: chl,
        currentPh: ph,
        telemetry: {
          ...state.telemetry,
          depth,
          temperature: temp,
          salinity: sal,
          pressure: pres,
        },
      }));
    } else {
      set((state) => {
        const next = { ...state.telemetry, ...data };
        return {
          telemetry: next,
          currentDepth: next.depth,
          currentTemp: next.temperature,
          currentSalinity: next.salinity,
          currentPressure: next.pressure,
        };
      });
    }
  },

  // Legacy compatibility implementations
  focusedComponent: null,
  focusedComponentPos: null,
  setFocusedComponent: (componentId, pos = null) =>
    set({ focusedComponent: componentId, focusedComponentPos: pos, selectedPart: componentId }),

  selectedSystem: 'ALL',
  setSelectedSystem: (system) => set({ selectedSystem: system }),

  activeFlow: null,
  setActiveFlow: (flow) => set({ activeFlow: flow }),

  pistonPosition: 0.5,
  setPistonPosition: (pos) => set({ pistonPosition: pos }),

  mechanismAutoPump: true,
  setMechanismAutoPump: (auto) => set({ mechanismAutoPump: auto }),

  currentDepth: 0,
  currentTemp: 29.4,
  currentSalinity: 34.2,
  currentPressure: 0,

  bgcMode: false,
  setBgcMode: (mode) => set({ bgcMode: mode }),
  currentOxygen: 215,
  currentChlorophyll: 0.8,
  currentPh: 8.1,
}));
