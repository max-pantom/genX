import type { BurstMemory, TendencyProfile } from "../types/agent";

const STORAGE_KEY = "genx.tendency-profile";

export function createDefaultTendencyProfile(): TendencyProfile {
  return {
    preferredTheme: "none",
    favoredRegions: {},
    favoredModes: { compose: 0, mutate: 0 },
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
      favoredModes: {
        compose: parsed.favoredModes?.compose ?? 0,
        mutate: parsed.favoredModes?.mutate ?? 0,
      },
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
      ...profile.favoredRegions,
      [memory.regionId]: clampRegionScore(
        profile.favoredRegions[memory.regionId] ?? 0,
        memory.score
      ),
    },
    favoredModes: {
      compose: profile.favoredModes.compose,
      mutate: profile.favoredModes.mutate,
    },
    successfulActionPairs: { ...profile.successfulActionPairs },
  };

  next.favoredModes[memory.mode] = clampModeScore(
    profile.favoredModes[memory.mode],
    memory.score
  );

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

function clampModeScore(previous: number, score: number) {
  return clamp(previous * 0.92 + score * 0.25, -1, 1.5);
}

function clampPairScore(previous: number, score: number) {
  return clamp(previous * 0.88 + score * 0.35, -1, 2);
}
