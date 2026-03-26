import type { BurstMemory, TendencyProfile } from "../types/agent";

const STORAGE_KEY = "genx.tendency-profile";

export function createDefaultTendencyProfile(): TendencyProfile {
  return {
    preferredTheme: "none",
    favoredRegions: {},
    obsessedRegions: {},
    grudgeRegions: {},
    forbiddenRegions: {},
    paletteDriftBias: 0.5,
    successfulActionPairs: {},
    totalBursts: 0,
  };
}

export function loadTendencyProfile(): TendencyProfile {
  if (typeof window === "undefined") return createDefaultTendencyProfile();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultTendencyProfile();
    const parsed = JSON.parse(raw) as Partial<TendencyProfile>;
    return {
      ...createDefaultTendencyProfile(),
      ...parsed,
      favoredRegions: parsed.favoredRegions ?? {},
      obsessedRegions: parsed.obsessedRegions ?? {},
      grudgeRegions: parsed.grudgeRegions ?? {},
      forbiddenRegions: parsed.forbiddenRegions ?? {},
      successfulActionPairs: parsed.successfulActionPairs ?? {},
    };
  } catch {
    return createDefaultTendencyProfile();
  }
}

export function saveTendencyProfile(profile: TendencyProfile) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage errors; persistence is a soft enhancement.
  }
}

export function updateTendencyProfile(
  profile: TendencyProfile,
  memory: BurstMemory,
  nextTheme: TendencyProfile["preferredTheme"]
): TendencyProfile {
  const decayedFavored: Record<string, number> = {};
  for (const [id, score] of Object.entries(profile.favoredRegions)) {
    const nextScore = score * 0.94;
    if (Math.abs(nextScore) > 0.02) decayedFavored[id] = nextScore;
  }
  const decayedObsessions: Record<string, number> = {};
  for (const [id, score] of Object.entries(profile.obsessedRegions)) {
    const nextScore = score * 0.965;
    if (Math.abs(nextScore) > 0.04) decayedObsessions[id] = nextScore;
  }
  const decayedGrudges: Record<string, number> = {};
  for (const [id, score] of Object.entries(profile.grudgeRegions)) {
    const nextScore = score * 0.97;
    if (Math.abs(nextScore) > 0.04) decayedGrudges[id] = nextScore;
  }
  const decayedForbidden: Record<string, number> = {};
  for (const [id, score] of Object.entries(profile.forbiddenRegions)) {
    const nextScore = score * 0.98;
    if (Math.abs(nextScore) > 0.06) decayedForbidden[id] = nextScore;
  }

  const next = {
    ...profile,
    preferredTheme: nextTheme,
    totalBursts: profile.totalBursts + 1,
    paletteDriftBias: clamp(
      profile.paletteDriftBias + (memory.score > 0 ? 0.02 : -0.015),
      0.1,
      0.9
    ),
    favoredRegions: {
      ...decayedFavored,
      [memory.regionId]: clampRegionScore(
        decayedFavored[memory.regionId] ?? 0,
        memory.score
      ),
    },
    obsessedRegions: {
      ...decayedObsessions,
      [memory.regionId]: clampObsessScore(
        decayedObsessions[memory.regionId] ?? 0,
        memory.label === "helped" ? memory.score + 0.2 : -0.08
      ),
    },
    grudgeRegions: {
      ...decayedGrudges,
      [memory.regionId]: clampGrudgeScore(
        decayedGrudges[memory.regionId] ?? 0,
        memory.label === "hurt" ? Math.abs(memory.score) + 0.2 : -0.04
      ),
    },
    forbiddenRegions: {
      ...decayedForbidden,
      [memory.regionId]: clampForbiddenScore(
        decayedForbidden[memory.regionId] ?? 0,
        memory.label === "hurt" && memory.score < -0.12 ? 0.32 : -0.02
      ),
    },
    successfulActionPairs: { ...profile.successfulActionPairs },
  };

  for (let i = 0; i < memory.actionTypes.length - 1; i++) {
    const key = `${memory.actionTypes[i]}->${memory.actionTypes[i + 1]}`;
    next.successfulActionPairs[key] = clampPairScore(
      profile.successfulActionPairs[key] ?? 0,
      memory.score
    );
  }

  return next;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampRegionScore(previous: number, score: number) {
  return clamp(previous * 0.9 + score * 0.3, -1, 1.5);
}

function clampPairScore(previous: number, score: number) {
  return clamp(previous * 0.88 + score * 0.35, -1, 2);
}

function clampObsessScore(previous: number, score: number) {
  return clamp(previous * 0.92 + score * 0.42, -1, 3);
}

function clampGrudgeScore(previous: number, score: number) {
  return clamp(previous * 0.93 + score * 0.4, -1, 3);
}

function clampForbiddenScore(previous: number, score: number) {
  return clamp(previous * 0.95 + score, 0, 2);
}
