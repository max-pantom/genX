import type { CanvasAction, ComposeAction, MutateAction, Point } from "../types/actions";
import type {
  AgentConfig,
  AgentDrives,
  AgentInternalState,
  AgentMood,
  BurstMemory,
  BurstResult,
  CanvasMetrics,
  CriticNote,
  DriveName,
  RegionMetrics,
  RegionState,
  TendencyProfile,
} from "../types/agent";
import type { Mode } from "../types/canvas";
import { CANVAS_H, CANVAS_W } from "../engine/canvas-engine";
import { generateHarmoniousPalette, type GeneratedPalette } from "../utils/color";
import { getSeedTheme } from "./seed-themes";

export interface BurstPlan {
  mode: Mode;
  mood: AgentMood;
  dominantDrive: DriveName;
  drives: AgentDrives;
  region: RegionMetrics;
  actions: CanvasAction[];
  thought: string;
  confidence: number;
  nextRegionStates: RegionState[];
  nextModeCooldown: number;
}

export function createInitialInternalState(
  tendencyProfile: TendencyProfile,
  config: AgentConfig
): AgentInternalState {
  const seed = getSeedTheme(config.seedTheme);
  const drives = mergeDriveBias(baseDrives(), seed.driveBias);

  return {
    currentMode: "compose",
    confidence: 0.35,
    tick: 0,
    burstCount: 0,
    mood: seed.moodBias,
    dominantDrive: "order",
    drives,
    metrics: null,
    critic: null,
    regionStates: [],
    shortMemory: [],
    tendencyProfile,
    currentRegion: null,
    modeCooldown: 0,
    negativeStreak: 0,
    lastBurstResult: null,
    currentThought: "waiting for first observation",
  };
}

export function planBurst(input: {
  internal: AgentInternalState;
  config: AgentConfig;
  metrics: CanvasMetrics;
  critic: CriticNote | null;
}): BurstPlan {
  const drives = updateDrives(input.metrics, input.internal.drives, input.critic);
  const dominantDrive = selectDominantDrive(drives);
  const mood = selectMood(drives, input.metrics);
  const mode = selectMode(
    input.config,
    drives,
    input.metrics,
    input.internal.currentMode,
    input.internal.modeCooldown
  );
  const regionStates = evolveRegionStates(
    input.internal.regionStates,
    input.metrics.regionMetrics,
    input.internal.currentRegion?.id ?? null,
    input.internal.lastBurstResult?.score ?? 0,
    input.internal.burstCount
  );
  const region = selectRegion(
    input.metrics.regionMetrics,
    regionStates,
    input.internal.currentRegion,
    input.internal.tendencyProfile
  );
  const burstSize = selectBurstSize(input.config, mood, dominantDrive);
  const palette = paletteForPlan(input.config.seedTheme, input.internal.tendencyProfile);
  const actions =
    mode === "compose"
      ? buildComposeBurst(region, palette, burstSize, input.config, mood, dominantDrive, input.metrics)
      : buildMutateBurst(region, palette, burstSize, input.config, mood, dominantDrive, input.metrics);

  const nextRegionStates = regionStates.map((state) =>
    state.id === region.id
      ? { ...state, attention: clamp(state.attention + 0.2, 0, 1), neglect: 0 }
      : state
  );

  return {
    mode,
    mood,
    dominantDrive,
    drives,
    region,
    actions,
    thought: describePlan(mode, mood, dominantDrive, region, input.metrics),
    confidence: clamp(0.35 + input.metrics.focalStrength * 0.3 + input.metrics.paletteCohesion * 0.2, 0, 1),
    nextRegionStates,
    nextModeCooldown: mode === input.internal.currentMode ? Math.max(0, input.internal.modeCooldown - 1) : 2,
  };
}

export function scoreBurst(input: {
  before: CanvasMetrics;
  after: CanvasMetrics;
  dominantDrive: DriveName;
  mode: Mode;
  region: RegionMetrics;
  actionCount: number;
}): BurstResult {
  const score = scoreForDrive(input.dominantDrive, input.before, input.after);
  const label = score > 0.08 ? "helped" : score < -0.06 ? "hurt" : "neutral";
  const reason = describeBurstScore(input.dominantDrive, input.before, input.after, label);

  return {
    score,
    label,
    dominantDrive: input.dominantDrive,
    reason,
    beforeMetrics: input.before,
    afterMetrics: input.after,
    actionCount: input.actionCount,
    mode: input.mode,
    regionId: input.region.id,
    rolledBack: false,
  };
}

export function createBurstMemory(
  plan: BurstPlan,
  result: BurstResult
): BurstMemory {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    mode: plan.mode,
    mood: plan.mood,
    dominantDrive: plan.dominantDrive,
    regionId: plan.region.id,
    score: result.score,
    label: result.label,
    reason: result.reason,
    actionTypes: plan.actions.map((action) => action.type),
  };
}

function updateDrives(
  metrics: CanvasMetrics,
  previous: AgentDrives,
  critic: CriticNote | null
): AgentDrives {
  const criticBoost = critic?.text.toLowerCase() ?? "";

  return {
    order: clamp(0.2 + (1 - metrics.density) * 0.45 + previous.order * 0.35 - metrics.entropy * 0.18 + criticWeight(criticBoost, ["structure", "anchor", "clarity"]), 0, 1),
    chaos: clamp(0.15 + metrics.symmetry * 0.2 + metrics.paletteCohesion * 0.1 + previous.chaos * 0.3 + criticWeight(criticBoost, ["chaos", "distort", "rupture"]), 0, 1),
    novelty: clamp(0.2 + metrics.repetition * 0.55 + previous.novelty * 0.3 + criticWeight(criticBoost, ["novel", "surprise", "variation"]), 0, 1),
    coherence: clamp(0.2 + metrics.entropy * 0.45 + Math.abs(metrics.balanceX) * 0.15 + Math.abs(metrics.balanceY) * 0.15 + previous.coherence * 0.28 + criticWeight(criticBoost, ["cohere", "stabilize", "focus"]), 0, 1),
    exploration: clamp(0.2 + average(metrics.regionMetrics.map((region) => region.emptiness)) * 0.45 + previous.exploration * 0.3 + criticWeight(criticBoost, ["explore", "expand"]), 0, 1),
    preservation: clamp(0.15 + metrics.focalStrength * 0.55 + metrics.paletteCohesion * 0.15 + previous.preservation * 0.35 + criticWeight(criticBoost, ["preserve", "protect", "hold"]), 0, 1),
  };
}

function selectDominantDrive(drives: AgentDrives): DriveName {
  return (Object.entries(drives).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "order") as DriveName;
}

function selectMood(drives: AgentDrives, metrics: CanvasMetrics): AgentMood {
  if (drives.chaos > 0.72 && metrics.entropy < 0.6) return "destructive";
  if (drives.coherence > 0.62) return "refining";
  if (drives.exploration > 0.68) return "searching";
  if (drives.novelty > 0.64) return "curious";
  return "calm";
}

function selectMode(
  config: AgentConfig,
  drives: AgentDrives,
  metrics: CanvasMetrics,
  currentMode: Mode,
  modeCooldown: number
): Mode {
  if (config.modePreference !== "auto") return config.modePreference;
  if (modeCooldown > 0) return currentMode;
  if (metrics.density < 0.18 || drives.order > drives.novelty + 0.08) return "compose";
  if (metrics.entropy < 0.48 && drives.novelty + drives.chaos > drives.order + drives.coherence) return "mutate";
  return metrics.focalStrength < 0.22 ? "compose" : "mutate";
}

function evolveRegionStates(
  current: RegionState[],
  regions: RegionMetrics[],
  previousRegionId: string | null,
  lastScore: number,
  burstCount: number
) {
  return regions.map((region) => {
    const existing = current.find((entry) => entry.id === region.id);
    const wasPrevious = previousRegionId === region.id;

    return {
      id: region.id,
      attention: clamp((existing?.attention ?? 0) * 0.9 + (wasPrevious ? 0.22 : 0), 0, 1),
      neglect: clamp((existing?.neglect ?? 0) + (wasPrevious ? 0 : 0.08), 0, 1),
      successScore: clamp((existing?.successScore ?? 0) * 0.85 + (wasPrevious ? lastScore * 0.35 : 0), -1, 1),
      lastVisitedBurst: wasPrevious ? burstCount : (existing?.lastVisitedBurst ?? -1),
    };
  });
}

function selectRegion(
  regions: RegionMetrics[],
  regionStates: RegionState[],
  currentRegion: RegionMetrics | null,
  tendencyProfile: TendencyProfile
) {
  if (currentRegion) {
    const state = regionStates.find((entry) => entry.id === currentRegion.id);
    if (state && state.attention > 0.36 && state.neglect < 0.2) {
      return regions.find((region) => region.id === currentRegion.id) ?? currentRegion;
    }
  }

  return [...regions]
    .sort((a, b) => regionPriority(b, regionStates, tendencyProfile) - regionPriority(a, regionStates, tendencyProfile))[0] ?? regions[0];
}

function regionPriority(
  region: RegionMetrics,
  regionStates: RegionState[],
  tendencyProfile: TendencyProfile
) {
  const state = regionStates.find((entry) => entry.id === region.id);
  const tendency = tendencyProfile.favoredRegions[region.id] ?? 0;
  return (
    region.emptiness * 0.28 +
    region.focalWeight * 0.32 +
    (state?.neglect ?? 0) * 0.25 +
    (state?.successScore ?? 0) * 0.1 +
    tendency * 0.12 -
    (state?.attention ?? 0) * 0.18
  );
}

function selectBurstSize(config: AgentConfig, mood: AgentMood, dominantDrive: DriveName) {
  const span = config.burstMax - config.burstMin;
  const base = config.burstMin + Math.round(span * config.intensity);
  const moodBias = mood === "destructive" ? 1 : mood === "calm" ? -1 : 0;
  const driveBias = dominantDrive === "novelty" || dominantDrive === "chaos" ? 1 : 0;
  return clamp(base + moodBias + driveBias, config.burstMin, config.burstMax);
}

function paletteForPlan(
  seedThemeKey: AgentConfig["seedTheme"],
  tendencyProfile: TendencyProfile
) {
  const seed = getSeedTheme(seedThemeKey);
  const harmony = seed.key === "ember" ? "warm" : seed.key === "tidal" ? "cool" : seed.key === "bloom" ? "triadic" : seed.key === "monolith" ? "analogous" : "split-complementary";
  const palette = generateHarmoniousPalette(harmony);
  const colors = [...seed.paletteHint, ...palette.colors].slice(0, 8);
  return {
    ...palette,
    colors,
    background: seed.background,
    driftBias: tendencyProfile.paletteDriftBias,
  };
}

function buildComposeBurst(
  region: RegionMetrics,
  palette: GeneratedPalette & { driftBias: number },
  burstSize: number,
  config: AgentConfig,
  mood: AgentMood,
  dominantDrive: DriveName,
  metrics: CanvasMetrics
): ComposeAction[] {
  const actions: ComposeAction[] = [];

  if (metrics.density < 0.05) {
    actions.push({ type: "fillCanvas", color: palette.background });
  }

  while (actions.length < burstSize) {
    const roll = Math.random();
    if (roll < 0.35) actions.push(drawRect(region, palette, config, dominantDrive));
    else if (roll < 0.62) actions.push(drawCircle(region, palette, config, mood));
    else if (roll < 0.8) actions.push(drawLine(region, palette, config));
    else actions.push(drawBrush(region, palette, config, dominantDrive));
  }

  return actions;
}

function buildMutateBurst(
  region: RegionMetrics,
  palette: GeneratedPalette & { driftBias: number },
  burstSize: number,
  config: AgentConfig,
  mood: AgentMood,
  dominantDrive: DriveName,
  metrics: CanvasMetrics
): MutateAction[] {
  const actions: MutateAction[] = [];

  while (actions.length < burstSize) {
    const roll = Math.random();
    if (roll < 0.22) actions.push(noiseRegion(region, config, mood));
    else if (roll < 0.42) actions.push(smearRegion(region, config));
    else if (roll < 0.58) actions.push(colorShift(region, config, dominantDrive, palette.driftBias));
    else if (roll < 0.72) actions.push(glitchRegion(region, config, metrics));
    else if (roll < 0.88) actions.push(decayRegion(region, config, dominantDrive));
    else actions.push(ditherRegion(region));
  }

  return actions;
}

function drawRect(
  region: RegionMetrics,
  palette: GeneratedPalette,
  config: AgentConfig,
  dominantDrive: DriveName
): ComposeAction {
  const size = 40 + Math.random() * 180 * config.intensity;
  const w = size * (dominantDrive === "order" ? 1.15 : 0.6 + Math.random());
  const h = size * (dominantDrive === "order" ? 0.7 + Math.random() * 0.6 : 0.55 + Math.random());
  const center = randomPointInRegion(region, 0.1);

  return {
    type: "drawRect",
    x: clamp(center.x - w / 2, 0, CANVAS_W - w),
    y: clamp(center.y - h / 2, 0, CANVAS_H - h),
    w,
    h,
    color: pickColor(palette, dominantDrive),
    fill: Math.random() > 0.18,
  };
}

function drawCircle(
  region: RegionMetrics,
  palette: GeneratedPalette,
  config: AgentConfig,
  mood: AgentMood
): ComposeAction {
  const center = randomPointInRegion(region, 0.18);
  return {
    type: "drawCircle",
    x: center.x,
    y: center.y,
    radius: 18 + Math.random() * 90 * config.intensity * (mood === "calm" ? 0.8 : 1.15),
    color: pickColor(palette, mood === "destructive" ? "chaos" : "preservation"),
    fill: Math.random() > 0.1,
  };
}

function drawLine(region: RegionMetrics, palette: GeneratedPalette, config: AgentConfig): ComposeAction {
  const start = randomPointInRegion(region, 0.05);
  const end = randomPointInRegion(region, 0.18);
  return {
    type: "drawLine",
    from: start,
    to: end,
    color: pickColor(palette, "order"),
    width: 2 + Math.random() * 14 * config.intensity,
  };
}

function drawBrush(
  region: RegionMetrics,
  palette: GeneratedPalette,
  config: AgentConfig,
  dominantDrive: DriveName
): ComposeAction {
  const points: Point[] = [];
  let cursor = randomPointInRegion(region, 0.12);
  points.push(cursor);

  const pointCount = 4 + Math.floor(Math.random() * 6);
  for (let index = 0; index < pointCount; index++) {
    cursor = {
      x: clamp(cursor.x + (Math.random() - 0.5) * region.w * 0.25, 0, CANVAS_W),
      y: clamp(cursor.y + (Math.random() - 0.5) * region.h * 0.25, 0, CANVAS_H),
    };
    points.push(cursor);
  }

  return {
    type: "brushStroke",
    points,
    color: pickColor(palette, dominantDrive),
    size: 3 + Math.random() * 18 * config.intensity,
    opacity: 0.3 + Math.random() * 0.55,
  };
}

function noiseRegion(region: RegionMetrics, config: AgentConfig, mood: AgentMood): MutateAction {
  return {
    type: "noiseRegion",
    ...shrinkRegion(region, mood === "destructive" ? 0.1 : 0.2),
    amount: 0.05 + Math.random() * 0.18 * config.intensity,
    monochrome: mood !== "curious",
  };
}

function smearRegion(region: RegionMetrics, config: AgentConfig): MutateAction {
  return {
    type: "smearRegion",
    ...shrinkRegion(region, 0.12),
    angle: Math.random() * Math.PI * 2,
    strength: 2 + Math.random() * 9 * config.intensity,
  };
}

function colorShift(
  region: RegionMetrics,
  config: AgentConfig,
  dominantDrive: DriveName,
  driftBias: number
): MutateAction {
  return {
    type: "colorShift",
    ...shrinkRegion(region, 0.1),
    hueShift: (Math.random() - 0.5) * 0.12 * config.intensity * driftBias,
    satShift: (dominantDrive === "novelty" ? 0.06 : 0.025) * (Math.random() > 0.5 ? 1 : -1),
    lightShift: (Math.random() - 0.5) * 0.05 * config.intensity,
  };
}

function glitchRegion(region: RegionMetrics, config: AgentConfig, metrics: CanvasMetrics): MutateAction {
  return {
    type: "glitchRegion",
    ...shrinkRegion(region, 0.08),
    intensity: 0.12 + Math.random() * 0.25 * config.intensity * (metrics.repetition > 0.5 ? 1.2 : 0.9),
  };
}

function decayRegion(region: RegionMetrics, config: AgentConfig, dominantDrive: DriveName): MutateAction {
  return {
    type: "decayRegion",
    ...shrinkRegion(region, 0.1),
    amount: 0.08 + Math.random() * 0.18 * config.intensity * (dominantDrive === "chaos" ? 1.15 : 0.85),
  };
}

function ditherRegion(region: RegionMetrics): MutateAction {
  return {
    type: "ditherRegion",
    ...shrinkRegion(region, 0.16),
    level: 3 + Math.floor(Math.random() * 3),
  };
}

function describePlan(
  mode: Mode,
  mood: AgentMood,
  dominantDrive: DriveName,
  region: RegionMetrics,
  metrics: CanvasMetrics
) {
  const target =
    metrics.focalStrength < 0.2
      ? "establishing a focal anchor"
      : metrics.repetition > 0.55
      ? "breaking repetition"
      : mode === "compose"
      ? "building structure"
      : "disturbing the surface";

  return `${mood} and ${dominantDrive}-driven, ${target} in region ${region.id}`;
}

function describeBurstScore(
  dominantDrive: DriveName,
  before: CanvasMetrics,
  after: CanvasMetrics,
  label: BurstResult["label"]
) {
  const deltaDensity = after.density - before.density;
  const deltaFocal = after.focalStrength - before.focalStrength;
  const deltaEntropy = after.entropy - before.entropy;

  if (label === "helped") {
    if (dominantDrive === "order") return `structure improved by ${formatDelta(deltaDensity)} density`;
    if (dominantDrive === "preservation") return `focal strength held and rose by ${formatDelta(deltaFocal)}`;
    if (dominantDrive === "novelty") return `variation increased without collapse`;
    return `state shifted in the intended direction`;
  }

  if (label === "hurt") {
    if (dominantDrive === "coherence") return `entropy rose by ${formatDelta(deltaEntropy)} and fragmented the image`;
    if (dominantDrive === "order") return `structure failed to consolidate`;
    return `burst pushed the canvas away from the current pressure`;
  }

  return "burst produced a marginal change";
}

function scoreForDrive(
  drive: DriveName,
  before: CanvasMetrics,
  after: CanvasMetrics
) {
  switch (drive) {
    case "order":
      return (after.density - before.density) * 0.5 + (after.focalStrength - before.focalStrength) * 0.35 - (after.entropy - before.entropy) * 0.15;
    case "chaos":
      return (after.entropy - before.entropy) * 0.45 + (after.edgeActivity - before.edgeActivity) * 0.35 + (after.repetition - before.repetition) * -0.1;
    case "novelty":
      return (after.repetition - before.repetition) * -0.55 + (after.contrast - before.contrast) * 0.2 + (after.entropy - before.entropy) * 0.15;
    case "coherence":
      return (after.paletteCohesion - before.paletteCohesion) * 0.4 + (before.entropy - after.entropy) * 0.35 + (before.repetition - after.repetition) * -0.05;
    case "exploration":
      return (average(after.regionMetrics.map((region) => region.emptiness)) - average(before.regionMetrics.map((region) => region.emptiness))) * -0.45 + (after.balanceX - before.balanceX) * -0.05 + (after.balanceY - before.balanceY) * -0.05;
    case "preservation":
      return (after.focalStrength - before.focalStrength) * 0.45 + (after.paletteCohesion - before.paletteCohesion) * 0.2 + (before.entropy - after.entropy) * 0.2;
    default:
      return 0;
  }
}

function randomPointInRegion(region: RegionMetrics, paddingRatio: number) {
  const padX = region.w * paddingRatio;
  const padY = region.h * paddingRatio;
  return {
    x: clamp(region.x + padX + Math.random() * Math.max(8, region.w - padX * 2), 0, CANVAS_W),
    y: clamp(region.y + padY + Math.random() * Math.max(8, region.h - padY * 2), 0, CANVAS_H),
  };
}

function shrinkRegion(region: RegionMetrics, paddingRatio: number) {
  const padX = region.w * paddingRatio;
  const padY = region.h * paddingRatio;
  return {
    x: Math.floor(clamp(region.x + padX, 0, CANVAS_W - 1)),
    y: Math.floor(clamp(region.y + padY, 0, CANVAS_H - 1)),
    w: Math.max(24, Math.floor(region.w - padX * 2)),
    h: Math.max(24, Math.floor(region.h - padY * 2)),
  };
}

function pickColor(palette: GeneratedPalette, drive: DriveName) {
  switch (drive) {
    case "order":
      return palette.primary;
    case "chaos":
      return palette.accent;
    case "novelty":
      return palette.colors[Math.floor(Math.random() * palette.colors.length)] ?? palette.accent;
    case "coherence":
      return palette.secondary;
    case "exploration":
      return palette.light;
    case "preservation":
      return palette.dark;
    default:
      return palette.primary;
  }
}

function baseDrives(): AgentDrives {
  return {
    order: 0.5,
    chaos: 0.32,
    novelty: 0.4,
    coherence: 0.45,
    exploration: 0.42,
    preservation: 0.38,
  };
}

function mergeDriveBias(base: AgentDrives, bias: Partial<AgentDrives>) {
  return {
    order: bias.order ?? base.order,
    chaos: bias.chaos ?? base.chaos,
    novelty: bias.novelty ?? base.novelty,
    coherence: bias.coherence ?? base.coherence,
    exploration: bias.exploration ?? base.exploration,
    preservation: bias.preservation ?? base.preservation,
  };
}

function criticWeight(text: string, words: string[]) {
  return words.some((word) => text.includes(word)) ? 0.08 : 0;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
