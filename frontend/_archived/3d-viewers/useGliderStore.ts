import { create } from 'zustand';

export type GliderViewMode = 'exterior' | 'cutaway' | 'exploded' | 'mission';
export type GliderCameraMode = 'wide' | 'chase';
export type GliderDiurnalMode = 'auto' | 'noon' | 'sunset' | 'night';

export interface GliderTelemetry {
  depth: number;          // meters (0 - 1000)
  pitch: number;          // degrees (-20 to +20)
  velocity: number;       // knots / m/s
  temperature: number;    // °C
  salinity: number;       // PSU
  displacement: number;   // cc (+/- 350)
  batteryShiftMM: number; // mm (+/- 80)
  batteryLevel: number;   // %
  cycleIndex: number;     // 1 to 5
}

export interface GliderMissionStage {
  name: string;
  quote: string;
  isSurfaced: boolean;
  motorRunning: boolean;
  color: string;
}

interface GliderState {
  viewMode: GliderViewMode;
  setViewMode: (mode: GliderViewMode) => void;

  // Labels & Selection
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  toggleLabels: () => void;
  selectedPart: string | null;
  setSelectedPart: (part: string | null) => void;
  hoveredPart: string | null;
  setHoveredPart: (part: string | null) => void;

  // Camera mode (wide cutaway vs 3D chase follow)
  cameraMode: GliderCameraMode;
  setCameraMode: (mode: GliderCameraMode) => void;
  cameraResetTrigger: number;
  triggerCameraReset: () => void;

  // Mission timeline & playback
  missionTime: number;
  setMissionTime: (time: number) => void;
  missionPlaying: boolean;
  setMissionPlaying: (playing: boolean) => void;
  missionSpeed: number;
  setMissionSpeed: (speed: number) => void;

  // Diurnal cycle
  diurnalMode: GliderDiurnalMode;
  setDiurnalMode: (mode: GliderDiurnalMode) => void;

  // Mission stage
  missionStage: GliderMissionStage;
  setMissionStage: (stage: GliderMissionStage) => void;

  // Live telemetry
  telemetry: GliderTelemetry;
  setTelemetry: (data: Partial<GliderTelemetry>) => void;
}

const DEFAULT_TELEMETRY: GliderTelemetry = {
  depth: 0,
  pitch: 0,
  velocity: 0.38,
  temperature: 29.4,
  salinity: 33.5,
  displacement: 350,
  batteryShiftMM: -80,
  batteryLevel: 98,
  cycleIndex: 1,
};

const DEFAULT_STAGE: GliderMissionStage = {
  name: 'SURFACE TELEMETRY & GPS FIX',
  quote: 'Telemetry is accomplished with Iridium satellite communications. GPS fix acquired while surfaced.',
  isSurfaced: true,
  motorRunning: false,
  color: '#38d9f5',
};

export const useGliderStore = create<GliderState>((set) => ({
  viewMode: 'exterior',
  setViewMode: (mode) => set({ viewMode: mode }),

  showLabels: true,
  setShowLabels: (show) => set({ showLabels: show }),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),

  selectedPart: null,
  setSelectedPart: (part) => set({ selectedPart: part }),

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
  setTelemetry: (data) =>
    set((state) => ({ telemetry: { ...state.telemetry, ...data } })),
}));
