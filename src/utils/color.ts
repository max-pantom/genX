export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) =>
        Math.max(0, Math.min(255, Math.round(c)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

export function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

export function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

export function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

// --- Color Harmony ---

export type HarmonyType =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "warm"
  | "cool";

export interface GeneratedPalette {
  background: string;
  primary: string;
  secondary: string;
  accent: string;
  dark: string;
  light: string;
  colors: string[];
}

export function generateHarmoniousPalette(
  harmony: HarmonyType = "complementary",
  seed?: number
): GeneratedPalette {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;
  const baseHue = rng();

  let hues: number[];
  switch (harmony) {
    case "complementary":
      hues = [baseHue, (baseHue + 0.5) % 1];
      break;
    case "analogous":
      hues = [
        (baseHue - 0.08 + 1) % 1,
        baseHue,
        (baseHue + 0.08) % 1,
      ];
      break;
    case "triadic":
      hues = [baseHue, (baseHue + 0.333) % 1, (baseHue + 0.666) % 1];
      break;
    case "split-complementary":
      hues = [baseHue, (baseHue + 0.42) % 1, (baseHue + 0.58) % 1];
      break;
    case "warm":
      hues = [
        rng() * 0.12,
        0.02 + rng() * 0.1,
        0.08 + rng() * 0.06,
      ];
      break;
    case "cool":
      hues = [
        0.5 + rng() * 0.15,
        0.55 + rng() * 0.1,
        0.45 + rng() * 0.12,
      ];
      break;
  }

  const primary = hslToHex(hues[0], 0.7 + rng() * 0.2, 0.5 + rng() * 0.1);
  const secondary = hslToHex(
    hues[1 % hues.length],
    0.5 + rng() * 0.3,
    0.45 + rng() * 0.15
  );
  const accent = hslToHex(
    hues[2 % hues.length] ?? (baseHue + 0.25) % 1,
    0.8 + rng() * 0.2,
    0.55 + rng() * 0.1
  );
  const dark = hslToHex(hues[0], 0.3 + rng() * 0.2, 0.1 + rng() * 0.1);
  const light = hslToHex(hues[0], 0.15 + rng() * 0.1, 0.88 + rng() * 0.08);
  const background = hslToHex(
    hues[0],
    0.08 + rng() * 0.1,
    0.92 + rng() * 0.05
  );

  const extras: string[] = [];
  for (let i = 0; i < 3; i++) {
    extras.push(
      hslToHex(
        hues[i % hues.length],
        0.4 + rng() * 0.4,
        0.3 + rng() * 0.4
      )
    );
  }

  return {
    background,
    primary,
    secondary,
    accent,
    dark,
    light,
    colors: [primary, secondary, accent, dark, light, ...extras],
  };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const DEFAULT_PALETTE = [
  "#1a1a1a",
  "#e8e8ec",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#78716c",
  "#6b7280",
];
