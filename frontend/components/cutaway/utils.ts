export const MAX_DEPTH = 11000;

export const ZONES = [
  {
    id: 'epipelagic',
    name: 'Epipelagic',
    alias: 'Sunlight Zone',
    depthRange: '0–200 m',
    minDepth: 0,
    maxDepth: 200,
    factor: 'Sunlight (photosynthesis)',
    accentHex: '#4CE0D2',
    glowRgb: '76, 224, 210',
    desc: 'Light-rich, photosynthetically active surface layer. Supports tuna, sharks, sea turtles, coral, dolphins, and phytoplankton.',
    representativeOrganisms: ['Tuna', 'Pelagic Sharks', 'Sea Turtles', 'Coral', 'Dolphins', 'Phytoplankton'],
    facts: ['Sunlight (photosynthesis)', 'Phytoplankton blooms', 'Warmest temperatures & high dissolved oxygen'],
  },
  {
    id: 'mesopelagic',
    name: 'Mesopelagic',
    alias: 'Twilight Zone',
    depthRange: '200–1,000 m',
    minDepth: 200,
    maxDepth: 1000,
    factor: 'Faint light (bioluminescence)',
    accentHex: '#38bdf8',
    glowRgb: '56, 189, 248',
    desc: 'Dimly lit thermocline region where downwelling sunlight vanishes. Organisms use bioluminescent counter-illumination to hide silhouettes.',
    representativeOrganisms: ['Lanternfish', 'Hatchetfish', 'Firefly Squid', 'Krill', 'Bristlemouths'],
    facts: ['Faint light (bioluminescence)', 'Massive diel vertical migration', 'Oxygen minimum zone & thermocline core'],
  },
  {
    id: 'bathypelagic',
    name: 'Bathypelagic',
    alias: 'Midnight Zone',
    depthRange: '1,000–4,000 m',
    minDepth: 1000,
    maxDepth: 4000,
    factor: 'Complete darkness, high pressure',
    accentHex: '#6366f1',
    glowRgb: '99, 102, 241',
    desc: 'Complete pitch darkness, freezing water (~4°C), and crushing hydrostatic pressure. Predators rely on glowing lures and cavernous jaws.',
    representativeOrganisms: ['Anglerfish', 'Giant Squid', 'Viperfish', 'Gulper Eel'],
    facts: ['Complete darkness, high pressure', 'Elastic bellies & disproportionate jaws', '100–400 atmospheres of hydrostatic pressure'],
  },
  {
    id: 'abyssopelagic',
    name: 'Abyssopelagic',
    alias: 'Abyssal Zone',
    depthRange: '4,000–6,000 m',
    minDepth: 4000,
    maxDepth: 6000,
    factor: 'Near-freezing, extreme pressure',
    accentHex: '#a855f7',
    glowRgb: '168, 85, 247',
    desc: 'Near-freezing (0–2°C) perpetual void overlying the abyssal ocean plains. Slow metabolisms and stilt-like benthic fin rays.',
    representativeOrganisms: ['Tripod Fish', 'Sea Pigs', 'Sea Spiders', 'Basket Stars'],
    facts: ['Near-freezing, extreme pressure', '400–600 atmospheres', 'Nutrient influx from descending marine snow'],
  },
  {
    id: 'hadopelagic',
    name: 'Hadopelagic',
    alias: 'Hadal Zone',
    depthRange: '6,000–11,000 m',
    minDepth: 6000,
    maxDepth: 11000,
    factor: 'Crushing pressure, trenches',
    accentHex: '#ec4899',
    glowRgb: '236, 72, 153',
    desc: 'The deepest ocean trenches on Earth (e.g. Mariana Trench, Java Trench). Organisms survive crushing pressure via piezolyte cellular stabilizers.',
    representativeOrganisms: ['Mariana Snailfish', 'Giant Tube Worms', 'Mariana Trench Shrimp', 'Hydrothermal Vent Chemotrophs'],
    facts: ['Crushing pressure, trenches', 'Exceeds 1,000 atmospheres', 'TMAO piezolyte stabilization in cell membranes'],
  },
] as const;

export type Zone = (typeof ZONES)[number];

export interface OrganismInfo {
  id: string;
  name: string;
  scientificName: string;
  zoneId: 'epipelagic' | 'mesopelagic' | 'bathypelagic' | 'abyssopelagic' | 'hadopelagic';
  zoneName: string;
  depthRange: string;
  targetDepth: number; // Suggested 3D camera depth
  icon: string;
  factor: string;
  desc: string;
  adaptations: string[];
  diet: string;
}

export const OCEAN_ORGANISM_CATALOG: OrganismInfo[] = [
  // ── Sunlight (Epipelagic) ──────────────────────────────────────────────────
  {
    id: 'tuna-shoal',
    name: 'Yellowfin & Skipjack Tuna',
    scientificName: 'Thunnus albacares',
    zoneId: 'epipelagic',
    zoneName: 'Sunlight (Epipelagic)',
    depthRange: '0–200 m',
    targetDepth: 20,
    icon: '🐟',
    factor: 'Sunlight (photosynthesis)',
    desc: 'High-speed apex schooling pelagic predators with fusiform hydrodynamic bodies and silver counter-shading.',
    adaptations: ['Counter-shading silver belly & navy back', 'High-efficiency ram-ventilation', 'Endothermic counter-current heat exchangers'],
    diet: 'Squid, flying fish, sardines, macro-zooplankton',
  },
  {
    id: 'pelagic-shark',
    name: 'Oceanic Pelagic Shark',
    scientificName: 'Carcharhinus falciformis',
    zoneId: 'epipelagic',
    zoneName: 'Sunlight (Epipelagic)',
    depthRange: '0–200 m',
    targetDepth: 35,
    icon: '🦈',
    factor: 'Sunlight (photosynthesis)',
    desc: 'Silky, streamlined open-ocean apex predator patrolling the sunlit mixed layer for migrating schools.',
    adaptations: ['Ampullae of Lorenzini electroreceptors', 'Dermal denticles minimizing drag', 'Continuous oceanic cruising kinematics'],
    diet: 'Tuna shoals, squids, pelagic teleosts',
  },
  {
    id: 'sea-turtle',
    name: 'Green Sea Turtle',
    scientificName: 'Chelonia mydas',
    zoneId: 'epipelagic',
    zoneName: 'Sunlight (Epipelagic)',
    depthRange: '0–80 m',
    targetDepth: 15,
    icon: '🐢',
    factor: 'Sunlight (photosynthesis)',
    desc: 'Graceful marine reptile gliding with large wing-like pectoral flippers through the upper sunlit photic zone.',
    adaptations: ['Hydrodynamic teardrop carapace', 'Salt glands behind eyes', 'Breath-holding dive endurance exceeding 2 hours'],
    diet: 'Seagrass, pelagic jellyfish, macro-algae',
  },
  {
    id: 'moon-jelly',
    name: 'Moon Jellyfish Swarm',
    scientificName: 'Aurelia aurita',
    zoneId: 'epipelagic',
    zoneName: 'Sunlight (Epipelagic)',
    depthRange: '20–150 m',
    targetDepth: 75,
    icon: '🪼',
    factor: 'Sunlight (photosynthesis)',
    desc: 'Translucent gelatinous bells rhythmically pulsing across the seasonal mixed layer and upper thermocline.',
    adaptations: ['95% water content minimizing metabolic costs', 'Cnidocyte stinging cells on oral tentacles', 'Statocysts for gravity sensing'],
    diet: 'Phytoplankton, copepods, fish eggs',
  },

  // ── Twilight (Mesopelagic) ─────────────────────────────────────────────────
  {
    id: 'lanternfish',
    name: 'Photophore Lanternfish',
    scientificName: 'Myctophum punctatum',
    zoneId: 'mesopelagic',
    zoneName: 'Twilight (Mesopelagic)',
    depthRange: '200–1,000 m',
    targetDepth: 500,
    icon: '✨',
    factor: 'Faint light (bioluminescence)',
    desc: 'The most abundant vertebrates on Earth by biomass. Possess ventral photophores that match downwelling twilight.',
    adaptations: ['Ventral photophore counter-illumination', 'Enlarged spherical twilight eyes', 'Diel vertical migration to surface at night'],
    diet: 'Copepods, euphausiids, zooplankton',
  },
  {
    id: 'firefly-squid',
    name: 'Bioluminescent Firefly Squid',
    scientificName: 'Watasenia scintillans',
    zoneId: 'mesopelagic',
    zoneName: 'Twilight (Mesopelagic)',
    depthRange: '200–800 m',
    targetDepth: 350,
    icon: '🦑',
    factor: 'Faint light (bioluminescence)',
    desc: 'Equipped with hundreds of bright turquoise photophores on tentacles and eyes to communicate and lure prey.',
    adaptations: ['Color vision adapted to detect bioluminescent blue light', 'Luciferin-luciferase reaction photophores', 'Jet-propulsion escape bursts'],
    diet: 'Small mesopelagic fish, amphipods, krill',
  },
  {
    id: 'hatchetfish',
    name: 'Deep-Sea Hatchetfish',
    scientificName: 'Argyropelecus hemigymnus',
    zoneId: 'mesopelagic',
    zoneName: 'Twilight (Mesopelagic)',
    depthRange: '200–1,000 m',
    targetDepth: 400,
    icon: '🪓',
    factor: 'Faint light (bioluminescence)',
    desc: 'Ultra-thin, mirror-scaled blade body with large tubular eyes pointed permanently upward to scan silhouettes.',
    adaptations: ['Tubular binocular eyes with yellow filters', 'Directional downward light organs matching downwelling sunlight', 'Ultra-compressed blade cross-section'],
    diet: 'Copepods, ostracods, larval fish',
  },

  // ── Midnight (Bathypelagic) ────────────────────────────────────────────────
  {
    id: 'anglerfish',
    name: 'Black Seadevil Anglerfish',
    scientificName: 'Melanocetus johnsonii',
    zoneId: 'bathypelagic',
    zoneName: 'Midnight (Bathypelagic)',
    depthRange: '1,000–4,000 m',
    targetDepth: 700,
    icon: '🎣',
    factor: 'Complete darkness, high pressure',
    desc: 'Solitary deep ambush predator possessing an esca (bioluminescent lure) housing symbiotic glowing bacteria.',
    adaptations: ['Symbiotic bioluminescent esca lure', 'Elastic expandable stomach holding prey twice its size', 'Non-reflective pitch-black skin pigment'],
    diet: 'Deep squids, bristlemouths, lanternfish',
  },
  {
    id: 'gulper-eel',
    name: 'Pelican Gulper Eel',
    scientificName: 'Eurypharynx pelecanoides',
    zoneId: 'bathypelagic',
    zoneName: 'Midnight (Bathypelagic)',
    depthRange: '1,000–4,000 m',
    targetDepth: 900,
    icon: '🐉',
    factor: 'Complete darkness, high pressure',
    desc: 'Iconic deep-sea eel with an enormous, loosely-hinged pouch mouth and a whip-like tail tip that glows red and blue.',
    adaptations: ['Cavernous pelican-pouch jaw', 'Bioluminescent caudal organ flashing pink/blue', 'Extremely reduced skeleton minimizing density'],
    diet: 'Crustaceans, squid, small deep fish',
  },

  // ── Abyssal (Abyssopelagic) ────────────────────────────────────────────────
  {
    id: 'tripod-fish',
    name: 'Abyssal Tripod Fish',
    scientificName: 'Bathypterois grallator',
    zoneId: 'abyssopelagic',
    zoneName: 'Abyssal (Abyssopelagic)',
    depthRange: '4,000–6,000 m',
    targetDepth: 1000,
    icon: '🔭',
    factor: 'Near-freezing, extreme pressure',
    desc: 'Perches on three extraordinarily elongated fin rays upon the soft sediment, facing into currents to intercept food.',
    adaptations: ['Elongated pelvic and caudal ray stilts exceeding 1 meter', 'Long tactile pectoral rays sensing minute water vibrations', 'Degenerated eyes compensated by mechanoreceptors'],
    diet: 'Benthopelagic copepods, mysids, detritus',
  },

  // ── Hadal (Hadopelagic) ────────────────────────────────────────────────────
  {
    id: 'hadal-snailfish',
    name: 'Mariana Hadal Snailfish',
    scientificName: 'Pseudoliparis swirei',
    zoneId: 'hadopelagic',
    zoneName: 'Hadal (Hadopelagic)',
    depthRange: '6,000–11,000 m',
    targetDepth: 1000,
    icon: '👻',
    factor: 'Crushing pressure, trenches',
    desc: 'The deepest living vertebrate ever observed. Ghostly translucent body with flexible bones and high TMAO piezolyte levels.',
    adaptations: ['High cellular TMAO piezolyte stabilization', 'Cartilaginous uncalcified skull', 'Absence of gas swim-bladder preventing rupture'],
    diet: 'Hadal amphipods, polychaetes, trench isopods',
  },
];

export interface Profile {
  depths: number[];
  temperature: number[];
  salinity: number[];
  tempRange: [number, number];
  salinityRange: [number, number];
}

/** Maps depth (metres) → normalised Y in scene space (2.5 = surface, -2.5 = seabed) */
export function yFromDepth(d: number): number {
  return 2.5 - 5 * (d / 2000);
}

/** Linear interpolation through a depth profile */
export function interpolate(depths: readonly number[], values: readonly number[], target: number): number {
  if (!depths.length) return 0;
  if (target <= depths[0]) return values[0];
  if (target >= depths[depths.length - 1]) return values[values.length - 1];
  for (let i = 0; i < depths.length - 1; i++) {
    if (target >= depths[i] && target <= depths[i + 1]) {
      const t = (target - depths[i]) / (depths[i + 1] - depths[i]);
      return values[i] + t * (values[i + 1] - values[i]);
    }
  }
  return values[0];
}

export function getZone(depth: number): Zone {
  if (depth < 200) return ZONES[0];  // Epipelagic
  if (depth < 700) return ZONES[1];  // Mesopelagic
  if (depth < 4000) return ZONES[2]; // Bathypelagic
  if (depth < 6000) return ZONES[3]; // Abyssopelagic
  return ZONES[4];                   // Hadopelagic
}

/** Maps a normalised 0..1 value to a CSS hsl colour string */
export function valueToHsl(t: number, variable: 'temperature' | 'salinity'): string {
  const c = Math.max(0, Math.min(1, t));
  if (variable === 'temperature') {
    const hue = Math.round(240 - c * 240);
    return `hsl(${hue},85%,58%)`;
  } else {
    const hue = Math.round(280 - c * 100);
    return `hsl(${hue},75%,55%)`;
  }
}

