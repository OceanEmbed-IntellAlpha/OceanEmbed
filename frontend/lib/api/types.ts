// Surface input variables
export type SurfaceVariable = 'sst' | 'sss' | 'ssh' | 'currents' | 'winds';

// Model output
export type ModelOutput = 'subsurface_temperature' | 'ocean_embedding' | 'confidence';

// Explorer view mode
export type ExplorerMode = 'surface' | 'profile' | 'validation' | 'dive';

// The 15 standard depth levels (metres)
export const DEPTH_LEVELS = [0,5,10,20,30,50,75,100,125,150,200,300,500,700,1000] as const;
export type DepthLevel = typeof DEPTH_LEVELS[number];

// Surface field grid (e.g., SST heatmap over Indian Ocean)
export interface SurfaceField {
  variable: SurfaceVariable;
  date: string;           // ISO date
  bbox: [number,number,number,number]; // [lonMin,latMin,lonMax,latMax]
  lat: number[];
  lon: number[];
  grid: number[][];       // grid[latIdx][lonIdx]
  unit: string;
  colorRange: [number, number];
  u?: number[][];         // for currents/winds
  v?: number[][];
}

// OceanEmbed model prediction — 15-level subsurface profile
export interface SubsurfaceProfile {
  lat: number;
  lon: number;
  date: string;
  depths: typeof DEPTH_LEVELS[number][];   // [0,5,10,...,1000]
  temperature: number[];                   // reconstructed °C at each depth
  confidence?: number[];                   // optional uncertainty bounds
  source: 'model';
}

// Independent ARGO observation profile
export interface ArgoProfile {
  floatId: string;
  lat: number;
  lon: number;
  date: string;
  depths: number[];
  temperature: number[];
  salinity?: number[];
  qc: ('good'|'probably_good'|'bad')[];
  source: 'argo';
}

// Model vs ARGO validation matchup
export interface ValidationMatchup {
  lat: number;
  lon: number;
  date: string;
  depths: number[];
  modelTemp: number[];
  argoTemp: number[];
  delta: number[];           // modelTemp - argoTemp
  rmse: number;              // overall RMSE for this profile
  bias: number;              // mean bias
  correlation: number;       // Pearson r
}

// Regional validation summary
export interface RegionalValidation {
  region: 'north_indian_ocean' | 'bay_of_bengal' | 'arabian_sea';
  nProfiles: number;
  rmse: number;
  bias: number;
  correlation: number;
  rmseByDepth: { depth: number; rmse: number }[];
}

// Dataset metadata card
export interface DatasetCard {
  id: string;
  name: string;
  variable: string;
  resolution: string;
  temporal: string;
  role: 'input' | 'training_target' | 'validation';
  doi?: string;
  url?: string;
}
