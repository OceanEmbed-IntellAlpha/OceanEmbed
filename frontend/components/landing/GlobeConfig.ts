// ─── Hero Globe Configuration ───────────────────────────────────────────────
// All tunable constants for the landing-page 3D Earth.

/** NASA Blue Marble textures served from the three-globe example CDN */
export const TEXTURE_URLS = {
  earth: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
  /** Used as a specular map — bright = shiny ocean, dark = matte land */
  specular: 'https://unpkg.com/three-globe/example/img/earth-water.png',
} as const;

/** Camera — creates the "looking at Earth from orbit" perspective */
export const CAMERA = {
  fov: 50,
  near: 0.1,
  far: 100,
  /** [x, y, z] — camera near Earth-level for dramatic horizon perspective */
  position: [0, 1.4, 2.8] as [number, number, number],
} as const;

/** Orbit controls */
export const CONTROLS = {
  autoRotateSpeed: 0.15,
  enableZoom: true,
  minDistance: 2.2,
  maxDistance: 4.5,
  /** Damping for inertia */
  enableDamping: true,
  dampingFactor: 0.06,
  /** Limit vertical orbit so the viewer can't flip under the Earth */
  minPolarAngle: Math.PI * 0.25,
  maxPolarAngle: Math.PI * 0.75,
  /** Time (ms) of inactivity before auto-rotate resumes */
  idleTimeout: 3000,
} as const;

/** Earth sphere */
export const EARTH = {
  radius: 1,
  segments: 48,         // was 128 — cuts triangle count by ~86%
  bumpScale: 0.018,
  /** How shiny the oceans are (Three.js shininess value) */
  specularShininess: 30, // less GPU lighting work
  specularColor: '#00e5ff',
} as const;

/** Cloud layer (procedural — no external texture needed) */
export const CLOUDS = {
  radiusOffset: 0.004,
  opacity: 0.12,
  rotationSpeed: -0.06,
  segments: 80,
  color: '#ffffff',
} as const;

/** Atmosphere outward glow configuration
 * Radiates outward from the Earth's rim into space with intense, luminous cyan aura.
 */
export const ATMOSPHERE = {
  // Broad outer glow radiating into space (electric ocean cyan)
  color: '#00e5ff',
  // Bright core highlight right along the horizon edge (white/cyan)
  coreColor: '#e0f7ff',
  // Falloff exponents (lower = reaches further into space)
  outerPower: 1.15,
  corePower: 2.2,
  // Opacity levels
  outerOpacity: 0.85,
  coreOpacity: 0.95,
  // Radii: extends outwards into space
  outerRadiusOffset: 0.28,
  coreRadiusOffset: 0.09,
  segments: 40,         // was 96 — 3 atmosphere meshes × 40 segs is still smooth
  // Inner limb / Fresnel horizon glow
  rimColor: '#38bdf8',
  rimPower: 3.0,
  rimOpacity: 0.65,
} as const;

/** Subtle ocean data points */
export const DATA_POINTS: Array<{ lat: number; lng: number }> = [
  // Indian Ocean — primary focus
  { lat: 15.0, lng: 73.0 },
  { lat: 10.0, lng: 80.0 },
  { lat: 5.0, lng: 75.0 },
  { lat: -5.0, lng: 70.0 },
  { lat: 12.0, lng: 90.0 },
  { lat: 0.0, lng: 85.0 },
  { lat: -10.0, lng: 60.0 },
  { lat: 20.0, lng: 65.0 },
  { lat: -15.0, lng: 80.0 },
  { lat: 8.0, lng: 68.0 },
  { lat: -8.0, lng: 55.0 },
  { lat: 18.0, lng: 88.0 },
  // Pacific
  { lat: 25.0, lng: -140.0 },
  { lat: -10.0, lng: -170.0 },
  { lat: 35.0, lng: 160.0 },
  { lat: -30.0, lng: -120.0 },
  { lat: 0.0, lng: -150.0 },
  { lat: 15.0, lng: 170.0 },
  // Atlantic
  { lat: 40.0, lng: -30.0 },
  { lat: 10.0, lng: -25.0 },
  { lat: -20.0, lng: -10.0 },
  { lat: 55.0, lng: -20.0 },
  { lat: -35.0, lng: 5.0 },
  { lat: 25.0, lng: -50.0 },
  // Southern Ocean
  { lat: -50.0, lng: 30.0 },
  { lat: -55.0, lng: -60.0 },
  { lat: -45.0, lng: 120.0 },
  // Arctic / North
  { lat: 70.0, lng: 10.0 },
  { lat: 65.0, lng: -40.0 },
  // Scattered
  { lat: -25.0, lng: 100.0 },
  { lat: 30.0, lng: 130.0 },
  { lat: -40.0, lng: -40.0 },
  { lat: 5.0, lng: -90.0 },
  { lat: -15.0, lng: 45.0 },
  { lat: 45.0, lng: -60.0 },
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
