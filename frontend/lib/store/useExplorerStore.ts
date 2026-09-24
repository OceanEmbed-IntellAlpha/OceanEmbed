import { create } from 'zustand';
import type { ExplorerMode, DepthLevel, DEPTH_LEVELS } from '../api/types';

export interface ExplorerState {
  // Location
  selectedLat: number | null;
  selectedLon: number | null;
  cursorLat: number | null;
  cursorLon: number | null;
  selectedFloatId: string | null;

  // Time
  selectedDate: string;           // 'YYYY-MM-DD'

  // Depth
  selectedDepth: DepthLevel;      // one of DEPTH_LEVELS

  // Active surface layers (toggles)
  showSST: boolean;
  showSSS: boolean;
  showSSH: boolean;
  showCurrents: boolean;
  showWinds: boolean;

  // Active model output layer
  showSubsurfaceTemp: boolean;
  showEmbedding: boolean;
  showConfidence: boolean;

  // Observations
  showArgoPoints: boolean;

  // Base map layer
  baseLayer: 'ocean' | 'satellite' | 'bathymetry';

  // Explorer mode
  mode: ExplorerMode;

  // 3D Ocean Column & Zoom Transition
  columnVizOpen: boolean;
  zoomPhase: 'idle' | 'zooming' | 'blended';

  // Panels
  profileOpen: boolean;
  validationOpen: boolean;

  // Playback (time animation)
  isPlaying: boolean;
  playSpeed: 1 | 2 | 4;

  setSelectedPoint: (lat: number | null, lon: number | null) => void;
  clearSelectedPoint: () => void;
  setColumnVizOpen: (open: boolean) => void;
  setZoomPhase: (phase: 'idle' | 'zooming' | 'blended') => void;
  selectFloat: (id: string | null) => void;
  setCursor: (lat: number | null, lon: number | null) => void;
  setDate: (date: string) => void;
  setDepth: (depth: DepthLevel) => void;
  setMode: (mode: ExplorerMode) => void;
  toggleLayer: (layer: keyof Omit<ExplorerState, 'mode' | 'baseLayer' | 'selectedLat' | 'selectedLon' | 'cursorLat' | 'cursorLon' | 'selectedDate' | 'selectedDepth' | 'profileOpen' | 'validationOpen' | 'isPlaying' | 'playSpeed' | 'columnVizOpen' | 'zoomPhase'>) => void;
  setBaseLayer: (layer: 'ocean' | 'satellite' | 'bathymetry') => void;
  setProfileOpen: (open: boolean) => void;
  setValidationOpen: (open: boolean) => void;
  setPlayback: (playing: boolean, speed?: 1 | 2 | 4) => void;
  resetView: () => void;
}

const DEFAULT_STATE = {
  selectedLat: null,
  selectedLon: null,
  cursorLat: null,
  cursorLon: null,
  selectedFloatId: null,
  selectedDate: '2023-12-01',
  selectedDepth: 0 as DepthLevel,
  
  showSST: true,
  showSSS: false,
  showSSH: false,
  showCurrents: false,
  showWinds: false,
  
  showSubsurfaceTemp: true,
  showEmbedding: false,
  showConfidence: false,
  
  showArgoPoints: true,
  
  baseLayer: 'ocean' as const,
  mode: 'surface' as ExplorerMode,
  
  columnVizOpen: false,
  zoomPhase: 'idle' as const,

  profileOpen: false,
  validationOpen: false,
  
  isPlaying: false,
  playSpeed: 1 as const,
};

export const useExplorerStore = create<ExplorerState>()((set) => ({
  ...DEFAULT_STATE,

  setSelectedPoint: (lat, lon) => set({ 
    selectedLat: lat, 
    selectedLon: lon, 
    profileOpen: (lat !== null && lon !== null),
    columnVizOpen: (lat !== null && lon !== null),
    zoomPhase: (lat !== null && lon !== null) ? 'zooming' : 'idle',
  }),
  clearSelectedPoint: () => set({
    selectedLat: null,
    selectedLon: null,
    profileOpen: false,
    columnVizOpen: false,
    zoomPhase: 'idle',
  }),
  setColumnVizOpen: (open) => set({ columnVizOpen: open }),
  setZoomPhase: (phase) => set({ zoomPhase: phase }),
  selectFloat: (id) => set({ selectedFloatId: id }),
  setCursor: (lat, lon) => set({ cursorLat: lat, cursorLon: lon }),
  setDate: (date) => set({ selectedDate: date }),
  setDepth: (depth) => set({ selectedDepth: depth }),
  setMode: (mode) => set({ mode }),
  
  toggleLayer: (layer) => set((state) => {
    const isTurningOn = !state[layer as keyof ExplorerState];
    const newState = { [layer]: isTurningOn } as Partial<ExplorerState>;
    
    // Make surface variables mutually exclusive since they share the same heatmap layer
    const surfaceLayers = ['showSST', 'showSSS', 'showSSH', 'showCurrents', 'showWinds'];
    if (surfaceLayers.includes(layer as string) && isTurningOn) {
      surfaceLayers.forEach(l => {
        if (l !== layer) newState[l as keyof ExplorerState] = false;
      });
      // Also turn off subsurface temp if turning on a different surface layer
      if (layer !== 'showSST') newState.showSubsurfaceTemp = false;
    }
    
    return newState;
  }),
  setBaseLayer: (layer) => set({ baseLayer: layer }),
  
  setProfileOpen: (open) => set({ profileOpen: open, selectedLat: open ? undefined : null, selectedLon: open ? undefined : null }),
  setValidationOpen: (open) => set({ validationOpen: open }),
  
  setPlayback: (playing, speed) => set((state) => ({ isPlaying: playing, playSpeed: speed ?? state.playSpeed })),
  
  resetView: () => set({ ...DEFAULT_STATE }),
}));
