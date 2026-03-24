import type { AgentDrives, SeedTheme } from "../types/agent";

const BASE_DRIVE_BIAS: AgentDrives = {
  order: 0.5,
  chaos: 0.5,
  novelty: 0.5,
  coherence: 0.5,
  exploration: 0.5,
  preservation: 0.5,
};

export const SEED_THEMES: SeedTheme[] = [
  {
    key: "none",
    label: "Unseeded",
    description: "Lets the system find its own balance.",
    paletteHint: ["#1a1a1a", "#e8e8ec", "#3b82f6", "#ef4444"],
    moodBias: "searching",
    driveBias: BASE_DRIVE_BIAS,
    background: "#f0f0ec",
  },
  {
    key: "ember",
    label: "Ember",
    description: "Warm contrast, volatile edges, controlled collapse.",
    paletteHint: ["#1b0c08", "#7c2d12", "#ef4444", "#facc15"],
    moodBias: "destructive",
    driveBias: { chaos: 0.72, novelty: 0.68, preservation: 0.3, order: 0.35 },
    background: "#f5ede2",
  },
  {
    key: "tidal",
    label: "Tidal",
    description: "Cool drift, layered atmosphere, slow correction.",
    paletteHint: ["#082032", "#2563eb", "#06b6d4", "#dbeafe"],
    moodBias: "calm",
    driveBias: { coherence: 0.72, preservation: 0.65, chaos: 0.28, novelty: 0.45 },
    background: "#edf5fb",
  },
  {
    key: "monolith",
    label: "Monolith",
    description: "Heavy form, sparse composition, preserved focal mass.",
    paletteHint: ["#111827", "#374151", "#9ca3af", "#f3f4f6"],
    moodBias: "refining",
    driveBias: { order: 0.76, preservation: 0.72, exploration: 0.25, chaos: 0.22 },
    background: "#ededeb",
  },
  {
    key: "bloom",
    label: "Bloom",
    description: "Color growth, asymmetric accents, curious expansion.",
    paletteHint: ["#1d4d4f", "#22c55e", "#ec4899", "#f97316"],
    moodBias: "curious",
    driveBias: { exploration: 0.74, novelty: 0.7, coherence: 0.42, order: 0.38 },
    background: "#f4f1e8",
  },
];

export function getSeedTheme(key: string | null | undefined): SeedTheme {
  return SEED_THEMES.find((theme) => theme.key === key) ?? SEED_THEMES[0];
}
