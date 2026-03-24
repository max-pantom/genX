import type { CanvasEngine } from "../engine/canvas-engine";
import { rgbToHsl } from "../utils/color";
import type { ActionRecord } from "../types/actions";
import type { CanvasMetrics, RegionMetrics } from "../types/agent";

const GRID_SIZE = 5;
const SAMPLE_STEP = 8;
const BACKGROUND = [240, 240, 236];

const HUE_NAMES: Array<[number, string]> = [
  [0.0, "red"],
  [0.08, "orange"],
  [0.14, "yellow"],
  [0.22, "yellow-green"],
  [0.33, "green"],
  [0.47, "cyan"],
  [0.55, "blue"],
  [0.7, "purple"],
  [0.8, "magenta"],
  [0.92, "pink"],
  [1.0, "red"],
];

interface RegionAccumulator {
  density: number;
  brightness: number;
  edgeActivity: number;
  hueCounts: Map<string, number>;
  brightValues: number[];
  samples: number;
}

export function observeCanvas(
  engine: CanvasEngine,
  history: ActionRecord[]
): CanvasMetrics {
  return analyzeImageData(engine.imageData.data, engine.width, engine.height, history);
}

export function analyzeImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  history: ActionRecord[]
): CanvasMetrics {
  const cellW = Math.floor(width / GRID_SIZE);
  const cellH = Math.floor(height / GRID_SIZE);
  const regionAccumulators: RegionAccumulator[] = Array.from(
    { length: GRID_SIZE * GRID_SIZE },
    () => ({
      density: 0,
      brightness: 0,
      edgeActivity: 0,
      hueCounts: new Map(),
      brightValues: [],
      samples: 0,
    })
  );

  const globalBrightValues: number[] = [];
  const globalHueCounts = new Map<string, number>();
  let densitySum = 0;
  let brightnessSum = 0;
  let edgeSum = 0;
  let sampleCount = 0;
  let leftWeight = 0;
  let rightWeight = 0;
  let topWeight = 0;
  let bottomWeight = 0;

  for (let y = 0; y < height; y += SAMPLE_STEP) {
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const bright = (r + g + b) / 3 / 255;
      const bgDist = backgroundDistance(r, g, b);
      const density = clamp(bgDist / 255, 0, 1);
      const edge = sampleEdgeActivity(data, width, height, x, y);
      const regionIndex =
        Math.min(GRID_SIZE - 1, Math.floor(y / cellH)) * GRID_SIZE +
        Math.min(GRID_SIZE - 1, Math.floor(x / cellW));
      const region = regionAccumulators[regionIndex];

      region.samples += 1;
      region.density += density;
      region.brightness += bright;
      region.edgeActivity += edge;
      region.brightValues.push(bright);

      globalBrightValues.push(bright);
      densitySum += density;
      brightnessSum += bright;
      edgeSum += edge;
      sampleCount += 1;

      if (density > 0.05) {
        const [hue, sat] = rgbToHsl(r, g, b);
        if (sat > 0.12) {
          const name = hueName(hue);
          increment(globalHueCounts, name);
          increment(region.hueCounts, name);
        }
        if (x < width / 2) leftWeight += density;
        else rightWeight += density;
        if (y < height / 2) topWeight += density;
        else bottomWeight += density;
      }
    }
  }

  const regionMetrics = regionAccumulators.map((region, index) =>
    finalizeRegionMetrics(region, index, cellW, cellH)
  );

  const density = sampleCount > 0 ? densitySum / sampleCount : 0;
  const avgBrightness = sampleCount > 0 ? brightnessSum / sampleCount : 0;
  const contrast = normalizeStdDev(globalBrightValues);
  const entropy = regionMetrics.reduce((sum, region) => sum + region.entropy, 0) / regionMetrics.length;
  const edgeActivity = sampleCount > 0 ? edgeSum / sampleCount : 0;
  const paletteCohesion = 1 - Math.min(1, dominantHueSpread(globalHueCounts) / 4);
  const symmetry = estimateSymmetry(data, width, height);
  const focalStrength = estimateFocalStrength(regionMetrics);
  const repetition = estimateRepetition(history, regionMetrics);
  const dominantHues = [...globalHueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);

  const balanceX = normalizedBalance(leftWeight, rightWeight);
  const balanceY = normalizedBalance(topWeight, bottomWeight);

  return {
    canvasWidth: width,
    canvasHeight: height,
    density,
    contrast,
    entropy,
    focalStrength,
    paletteCohesion,
    symmetry,
    repetition,
    edgeActivity,
    avgBrightness,
    dominantHues,
    balanceX,
    balanceY,
    regionMetrics,
    summary: buildSummary({
      density,
      contrast,
      entropy,
      focalStrength,
      repetition,
      dominantHues,
      regionMetrics,
    }),
  };
}

function finalizeRegionMetrics(
  region: RegionAccumulator,
  index: number,
  cellW: number,
  cellH: number
): RegionMetrics {
  const gx = index % GRID_SIZE;
  const gy = Math.floor(index / GRID_SIZE);
  const density = region.samples > 0 ? region.density / region.samples : 0;
  const brightness = region.samples > 0 ? region.brightness / region.samples : 0;
  const edgeActivity = region.samples > 0 ? region.edgeActivity / region.samples : 0;
  const contrast = normalizeStdDev(region.brightValues);
  const entropy = clamp(contrast * 0.55 + edgeActivity * 0.45, 0, 1);
  const focalWeight = clamp(
    density * 0.45 + contrast * 0.25 + edgeActivity * 0.3,
    0,
    1
  );

  return {
    id: `${gy}-${gx}`,
    x: gx * cellW,
    y: gy * cellH,
    w: cellW,
    h: cellH,
    density,
    emptiness: 1 - density,
    contrast,
    entropy,
    edgeActivity,
    brightness,
    focalWeight,
    dominantHue: dominantHue(region.hueCounts),
  };
}

function buildSummary(input: {
  density: number;
  contrast: number;
  entropy: number;
  focalStrength: number;
  repetition: number;
  dominantHues: string[];
  regionMetrics: RegionMetrics[];
}) {
  const strongestRegion = [...input.regionMetrics].sort(
    (a, b) => b.focalWeight - a.focalWeight
  )[0];
  const emptiestRegion = [...input.regionMetrics].sort(
    (a, b) => b.emptiness - a.emptiness
  )[0];

  const parts = [
    input.density < 0.15
      ? "Canvas is sparse."
      : input.density < 0.4
      ? "Canvas is establishing structure."
      : "Canvas is materially occupied.",
    input.focalStrength < 0.22
      ? "No dominant focal area yet."
      : `Focal pull is strongest in region ${strongestRegion?.id ?? "unknown"}.`,
    input.repetition > 0.62
      ? "Recent behavior is repetitive."
      : "Recent behavior still has variation.",
    input.entropy > 0.58
      ? "Texture and disorder are high."
      : "Texture remains controlled.",
  ];

  if (input.dominantHues.length > 0) {
    parts.push(`Dominant hues: ${input.dominantHues.join(", ")}.`);
  }
  if (emptiestRegion) {
    parts.push(`Most open zone: ${emptiestRegion.id}.`);
  }

  return parts.join(" ");
}

function estimateFocalStrength(regionMetrics: RegionMetrics[]) {
  const sorted = [...regionMetrics].sort((a, b) => b.focalWeight - a.focalWeight);
  if (sorted.length < 2) return sorted[0]?.focalWeight ?? 0;
  return clamp(sorted[0].focalWeight - sorted[1].focalWeight * 0.55, 0, 1);
}

function estimateRepetition(history: ActionRecord[], regionMetrics: RegionMetrics[]) {
  const recent = history.slice(-12);
  if (recent.length === 0) return 0;
  const actionTypeDiversity = new Set(recent.map((entry) => entry.action.type)).size / recent.length;
  const focalSpread =
    [...regionMetrics]
      .sort((a, b) => b.focalWeight - a.focalWeight)
      .slice(0, 3)
      .reduce((sum, region) => sum + region.id.split("-").reduce((n, part) => n + Number(part), 0), 0) /
    20;

  return clamp(1 - actionTypeDiversity * 0.75 - focalSpread * 0.25, 0, 1);
}

function estimateSymmetry(data: Uint8ClampedArray, width: number, height: number) {
  let horizontalDiff = 0;
  let verticalDiff = 0;
  let samples = 0;

  for (let y = 0; y < height; y += SAMPLE_STEP * 2) {
    for (let x = 0; x < width / 2; x += SAMPLE_STEP * 2) {
      const left = getBrightness(data, width, x, y);
      const right = getBrightness(data, width, width - x - 1, y);
      const top = getBrightness(data, width, y, x);
      const bottom = getBrightness(data, width, y, height - x - 1);

      horizontalDiff += Math.abs(left - right);
      verticalDiff += Math.abs(top - bottom);
      samples += 1;
    }
  }

  if (samples === 0) return 0;
  return clamp(1 - (horizontalDiff + verticalDiff) / samples / 2, 0, 1);
}

function sampleEdgeActivity(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
) {
  const current = getBrightness(data, width, x, y);
  const right = getBrightness(data, width, Math.min(width - 1, x + SAMPLE_STEP), y);
  const down = getBrightness(data, width, x, Math.min(height - 1, y + SAMPLE_STEP));
  return clamp((Math.abs(current - right) + Math.abs(current - down)) * 1.8, 0, 1);
}

function getBrightness(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const i = (Math.floor(y) * width + Math.floor(x)) * 4;
  return (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
}

function dominantHueSpread(counts: Map<string, number>) {
  return Math.max(0, counts.size - 1);
}

function dominantHue(counts: Map<string, number>) {
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";
}

function backgroundDistance(r: number, g: number, b: number) {
  return (
    Math.abs(r - BACKGROUND[0]) +
    Math.abs(g - BACKGROUND[1]) +
    Math.abs(b - BACKGROUND[2])
  );
}

function normalizedBalance(a: number, b: number) {
  const total = a + b;
  if (total <= 0) return 0;
  return (a - b) / total;
}

function normalizeStdDev(values: number[]) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return clamp(Math.sqrt(variance) * 3.5, 0, 1);
}

function hueName(h: number): string {
  for (let i = 0; i < HUE_NAMES.length - 1; i++) {
    if (h >= HUE_NAMES[i][0] && h < HUE_NAMES[i + 1][0]) return HUE_NAMES[i][1];
  }
  return "red";
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
