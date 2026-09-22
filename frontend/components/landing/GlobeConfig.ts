// ─── Hero Globe Configuration ───────────────────────────────────────────────
// OceanEmbed: High-fidelity constants for 3D Earth, Satellite Scanning, Subsurface Depth Columns, and ARGO Floats.

/** NASA Blue Marble textures served from CDN */
export const TEXTURE_URLS = {
  earth: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
  specular: 'https://unpkg.com/three-globe/example/img/earth-water.png',
} as const;

/** Camera — orbital perspective angled towards the North Indian Ocean */
export const CAMERA = {
  fov: 46,
  near: 0.1,
  far: 100,
  position: [0, 1.25, 2.75] as [number, number, number],
} as const;

/** Orbit controls */
export const CONTROLS = {
  autoRotateSpeed: 0.12,
  enableZoom: false,
  minDistance: 2.2,
  maxDistance: 4.0,
  enableDamping: true,
  dampingFactor: 0.05,
  minPolarAngle: Math.PI * 0.28,
  maxPolarAngle: Math.PI * 0.72,
  idleTimeout: 2500,
} as const;

/** Earth sphere dimensions */
export const EARTH = {
  radius: 1,
  segments: 64,
  bumpScale: 0.015,
  specularShininess: 45,
  specularColor: '#00D2FF',
} as const;

/** Atmosphere limb glow (Photorealistic edge Fresnel, crisp planetary limb) */
export const ATMOSPHERE = {
  color: '#00D2FF',
  coreColor: '#E0F7FF',
  rimColor: '#38BDF8',
  outerPower: 4.2,      // High power concentrates glow strictly to the horizon edge
  corePower: 3.5,
  rimPower: 2.8,
  outerOpacity: 0.75,
  coreOpacity: 0.85,
  rimOpacity: 0.65,
  outerRadiusOffset: 0.14,
  coreRadiusOffset: 0.04,
  segments: 48,
} as const;

/** Standard Oceanographic Depth Levels (OceanEmbed 15-layer model) */
export const DEPTH_LEVELS = [
  { depth: 0,    label: '0m (SST)',        isMajor: true,  color: '#00D2FF' },
  { depth: 50,   label: '50m (Mixed)',     isMajor: false, color: '#38BDF8' },
  { depth: 100,  label: '100m (Sub-surf)', isMajor: true,  color: '#2DD4BF' },
  { depth: 200,  label: '200m (Thermocline)', isMajor: true, color: '#F59E0B' },
  { depth: 500,  label: '500m (Intermediate)', isMajor: true, color: '#818CF8' },
  { depth: 1000, label: '1000m (Deep)',    isMajor: true,  color: '#6366F1' },
  { depth: 2000, label: '2000m (Abyssal)', isMajor: true,  color: '#4338CA' },
] as const;

export interface SoundingStation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  sst: number;
  thermoclineDepth: number; // meters
  temps: number[]; // [0m, 50m, 100m, 200m, 500m, 1000m, 2000m]
}

/** North Indian Ocean Subsurface Sounding Stations */
export const SOUNDING_STATIONS: SoundingStation[] = [
  {
    id: 'STN-AS01',
    name: 'Arabian Sea Upwelling',
    region: 'Arabian Sea Basin',
    lat: 14.8,
    lng: 66.4,
    sst: 28.6,
    thermoclineDepth: 185,
    temps: [28.6, 26.2, 22.4, 15.8, 9.1, 5.4, 3.8],
  },
  {
    id: 'STN-BB02',
    name: 'Bay of Bengal Freshening',
    region: 'Central Bay of Bengal',
    lat: 13.5,
    lng: 88.2,
    sst: 29.4,
    thermoclineDepth: 160,
    temps: [29.4, 27.8, 24.1, 16.9, 9.8, 5.8, 3.9],
  },
  {
    id: 'STN-EQ03',
    name: 'Equatorial Thermocline Ridge',
    region: 'South Maldive Basin',
    lat: 1.5,
    lng: 76.8,
    sst: 28.9,
    thermoclineDepth: 140,
    temps: [28.9, 26.9, 21.0, 14.5, 8.4, 5.0, 3.7],
  },
  {
    id: 'STN-LS04',
    name: 'Lakshadweep Sea Gyre',
    region: 'Southeast Arabian Sea',
    lat: 8.8,
    lng: 72.5,
    sst: 29.1,
    thermoclineDepth: 175,
    temps: [29.1, 27.2, 23.0, 16.2, 9.3, 5.5, 3.8],
  },
];

export interface ArgoFloat {
  id: string;
  wmo: string;
  name: string;
  lat: number;
  lng: number;
  cycle: number;
  battery: number;
  depth: number; // current depth in meters
  status: 'PROFILING' | 'SURFACE_TX' | 'PARKING';
}

/** In-Situ ARGO Autonomous Profiling Floats */
export const ARGO_FLOATS: ArgoFloat[] = [
  { id: 'FLT-01', wmo: '2902741', name: 'INCOIS-Argo #741', lat: 12.2, lng: 68.8, cycle: 142, battery: 94, depth: 15, status: 'SURFACE_TX' },
  { id: 'FLT-02', wmo: '2903389', name: 'NIOT-Argo #389',   lat: 16.1, lng: 85.6, cycle: 88,  battery: 89, depth: 180, status: 'PROFILING' },
  { id: 'FLT-03', wmo: '2901944', name: 'INCOIS-Argo #944', lat: -1.8, lng: 74.2, cycle: 210, battery: 91, depth: 850, status: 'PROFILING' },
  { id: 'FLT-04', wmo: '2902105', name: 'Apex-Argo #105',   lat: 5.8,  lng: 81.5, cycle: 64,  battery: 96, depth: 0,   status: 'SURFACE_TX' },
  { id: 'FLT-05', wmo: '2903420', name: 'INCOIS-Argo #420', lat: 18.5, lng: 69.2, cycle: 176, battery: 88, depth: 420, status: 'PROFILING' },
];

/** Convert lat/lng to 3D position on a sphere of given radius */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

