// Scientific perceptually-uniform colormaps (never rainbow/jet)
// Each colormap is an array of [r, g, b] stops (0-255) for interpolation

export type ColormapName = 'viridis' | 'thermal' | 'cividis' | 'deep' | 'haline';

export interface ColormapStop {
  r: number;
  g: number;
  b: number;
}

export const COLORMAPS: Record<ColormapName, ColormapStop[]> = {
  // Viridis: dark purple → blue → green → yellow
  viridis: [
    { r: 68, g: 1, b: 84 },
    { r: 72, g: 40, b: 120 },
    { r: 62, g: 74, b: 137 },
    { r: 49, g: 104, b: 142 },
    { r: 38, g: 130, b: 142 },
    { r: 31, g: 158, b: 137 },
    { r: 53, g: 183, b: 121 },
    { r: 110, g: 206, b: 88 },
    { r: 181, g: 222, b: 43 },
    { r: 253, g: 231, b: 37 },
  ],

  // Thermal: dark blue → purple → red → orange → yellow
  thermal: [
    { r: 4, g: 35, b: 51 },
    { r: 23, g: 51, b: 122 },
    { r: 85, g: 59, b: 157 },
    { r: 129, g: 79, b: 143 },
    { r: 175, g: 95, b: 130 },
    { r: 211, g: 114, b: 111 },
    { r: 237, g: 139, b: 83 },
    { r: 251, g: 172, b: 52 },
    { r: 252, g: 210, b: 32 },
    { r: 245, g: 252, b: 76 },
  ],

  // Cividis: dark blue → blue-grey → yellow (colorblind-safe)
  cividis: [
    { r: 0, g: 32, b: 76 },
    { r: 0, g: 57, b: 109 },
    { r: 36, g: 80, b: 117 },
    { r: 65, g: 104, b: 123 },
    { r: 95, g: 127, b: 128 },
    { r: 123, g: 152, b: 131 },
    { r: 152, g: 176, b: 130 },
    { r: 183, g: 200, b: 124 },
    { r: 215, g: 226, b: 111 },
    { r: 253, g: 255, b: 82 },
  ],

  // Deep (oceanographic): dark → blue → teal → light
  deep: [
    { r: 37, g: 21, b: 74 },
    { r: 47, g: 42, b: 110 },
    { r: 42, g: 68, b: 137 },
    { r: 24, g: 96, b: 149 },
    { r: 7, g: 123, b: 150 },
    { r: 22, g: 150, b: 147 },
    { r: 62, g: 177, b: 136 },
    { r: 117, g: 200, b: 120 },
    { r: 182, g: 220, b: 107 },
    { r: 249, g: 240, b: 108 },
  ],

  // Haline (oceanographic): dark purple → blue → cyan → green → yellow
  haline: [
    { r: 42, g: 24, b: 108 },
    { r: 34, g: 48, b: 140 },
    { r: 11, g: 83, b: 158 },
    { r: 3, g: 119, b: 163 },
    { r: 5, g: 154, b: 156 },
    { r: 14, g: 186, b: 141 },
    { r: 50, g: 214, b: 115 },
    { r: 121, g: 233, b: 78 },
    { r: 198, g: 247, b: 48 },
    { r: 255, g: 255, b: 64 },
  ],
};

/**
 * Sample a colormap at position t ∈ [0, 1]
 * Returns CSS rgb() string
 */
export function sampleColormap(name: ColormapName, t: number): string {
  const stops = COLORMAPS[name];
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;

  if (i >= stops.length - 1) {
    const c = stops[stops.length - 1];
    return `rgb(${c.r},${c.g},${c.b})`;
  }

  const a = stops[i];
  const b = stops[i + 1];
  return `rgb(${Math.round(a.r + (b.r - a.r) * f)},${Math.round(a.g + (b.g - a.g) * f)},${Math.round(a.b + (b.b - a.b) * f)})`;
}

/**
 * Map a raw value to a colormap color given min/max range
 */
export function valueToColor(
  value: number,
  min: number,
  max: number,
  name: ColormapName = 'thermal'
): string {
  const t = max === min ? 0 : (value - min) / (max - min);
  return sampleColormap(name, t);
}

/**
 * Generate a CSS gradient string for a colormap (for legend rendering)
 */
export function colormapToGradient(name: ColormapName): string {
  const stops = COLORMAPS[name];
  const css = stops.map((c, i) => {
    const pct = Math.round((i / (stops.length - 1)) * 100);
    return `rgb(${c.r},${c.g},${c.b}) ${pct}%`;
  });
  return `linear-gradient(to right, ${css.join(', ')})`;
}
