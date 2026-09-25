export const MAX_DEPTH = 2000;

export const ZONES = [
  {
    name: 'Epipelagic',
    alias: 'Sunlit Zone',
    minDepth: 0,
    maxDepth: 200,
    accentHex: '#4CE0D2',
    glowRgb: '76, 224, 210',
    desc: 'Light-rich, high-productivity surface layer. Home to 90 % of marine life.',
    facts: ['Phytoplankton blooms', 'Maximum UV exposure', 'Most biodiversity'],
  },
  {
    name: 'Mesopelagic',
    alias: 'Twilight Zone',
    minDepth: 200,
    maxDepth: 650,
    accentHex: '#3A9BD4',
    glowRgb: '58, 155, 212',
    desc: 'Dimly lit thermocline region with active diel vertical migration.',
    facts: ['Bioluminescence', 'Oxygen minimum zone', 'Carbon pump'],
  },
  {
    name: 'Bathypelagic',
    alias: 'Midnight Zone',
    minDepth: 650,
    maxDepth: 2000,
    accentHex: '#2254A0',
    glowRgb: '34, 84, 160',
    desc: 'Complete darkness, near-freezing temps, extreme pressure.',
    facts: ['No sunlight', '100 – 200 atm', 'Sparse cold-adapted fauna'],
  },
] as const;

export type Zone = (typeof ZONES)[number];

export interface Profile {
  depths: number[];
  temperature: number[];
  salinity: number[];
  tempRange: [number, number];
  salinityRange: [number, number];
}

/** Maps depth (metres) → normalised Y in scene space (2.5 = surface, -2.5 = seabed) */
export function yFromDepth(d: number): number {
  return 2.5 - 5 * (d / MAX_DEPTH);
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
  return ZONES.find((z) => depth >= z.minDepth && depth < z.maxDepth) ?? ZONES[2];
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
