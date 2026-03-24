export type AgentState = "idle" | "running" | "paused" | "observing";

export type AgentMood =
  | "calm"
  | "curious"
  | "destructive"
  | "refining"
  | "searching";

export type DriveName =
  | "order"
  | "chaos"
  | "novelty"
  | "coherence"
  | "exploration"
  | "preservation";

export type BurstScoreLabel = "helped" | "neutral" | "hurt";

export type SpeedPreset = "slow" | "realtime" | "hyper";

export type SeedThemeKey =
  | "none"
  | "ember"
  | "tidal"
  | "monolith"
  | "bloom";

export interface AgentDrives {
  order: number;
  chaos: number;
  novelty: number;
  coherence: number;
  exploration: number;
  preservation: number;
}

export interface CanvasMetrics {
  canvasWidth: number;
  canvasHeight: number;
  density: number;
  contrast: number;
  entropy: number;
  focalStrength: number;
  paletteCohesion: number;
  symmetry: number;
  repetition: number;
  edgeActivity: number;
  avgBrightness: number;
  dominantHues: string[];
  balanceX: number;
  balanceY: number;
  regionMetrics: RegionMetrics[];
  summary: string;
}

export interface RegionMetrics {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  density: number;
  emptiness: number;
  contrast: number;
  entropy: number;
  edgeActivity: number;
  brightness: number;
  focalWeight: number;
  dominantHue: string;
}

export interface RegionState {
  id: string;
  attention: number;
  neglect: number;
  successScore: number;
  lastVisitedBurst: number;
}

export interface BurstResult {
  score: number;
  label: BurstScoreLabel;
  dominantDrive: DriveName;
  reason: string;
  beforeMetrics: CanvasMetrics;
  afterMetrics: CanvasMetrics;
  actionCount: number;
  regionId: string;
  rolledBack: boolean;
}

export interface CriticNote {
  text: string;
  timestamp: number;
  confidence: number;
}

export interface BurstMemory {
  id: string;
  timestamp: number;
  mood: AgentMood;
  dominantDrive: DriveName;
  regionId: string;
  score: number;
  label: BurstScoreLabel;
  reason: string;
  actionTypes: string[];
}

export interface TendencyProfile {
  preferredTheme: SeedThemeKey;
  favoredRegions: Record<string, number>;
  paletteDriftBias: number;
  successfulActionPairs: Record<string, number>;
  totalBursts: number;
}

export interface SeedTheme {
  key: SeedThemeKey;
  label: string;
  description: string;
  paletteHint: string[];
  moodBias: AgentMood;
  driveBias: Partial<AgentDrives>;
  background: string;
}

export interface AgentConfig {
  autonomy: number;
  intensity: number;
  speedPreset: SpeedPreset;
  burstMin: number;
  burstMax: number;
  criticInterval: number;
  seedTheme: SeedThemeKey;
}

export interface LLMConfig {
  endpoint: string;
  model: string;
  apiKey: string;
}

export interface AgentInternalState {
  confidence: number;
  tick: number;
  burstCount: number;
  mood: AgentMood;
  dominantDrive: DriveName;
  drives: AgentDrives;
  metrics: CanvasMetrics | null;
  critic: CriticNote | null;
  regionStates: RegionState[];
  shortMemory: BurstMemory[];
  tendencyProfile: TendencyProfile;
  currentRegion: RegionMetrics | null;
  negativeStreak: number;
  lastBurstResult: BurstResult | null;
  currentThought: string;
}
