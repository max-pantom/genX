import type { CanvasAction, RGBAColor } from "../types/actions";
import type { AgentInternalState, CanvasMetrics, RegionMetrics } from "../types/agent";
import { completeLlmBurstPlan, type BurstPlan } from "./organism-brain";
import { chatCompletion, extractJSON, type ChatMessage, type LLMConfig } from "./llm-client";
import { AGENT_SOUL } from "./soul";

export async function planBurstWithLLM(input: {
  llmConfig: LLMConfig;
  internal: AgentInternalState;
  metrics: CanvasMetrics;
}): Promise<BurstPlan> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        AGENT_SOUL,
        "You are the sole planner for the next drawing burst.",
        "Return JSON only. No prose outside JSON.",
        "Use the full canvas, avoid staying on one side, and prefer strong generative art over filler.",
        "This is a pixel organism. Prefer direct pixel actions, long pixel lines, dense pixel spray, and deliberate per-pixel structure.",
        "Use fillRegion sparingly. Favor setPixel, pixelLine, and pixelSpray.",
        'Schema: {"thought":"string","confidence":0.0,"mood":"calm|curious|destructive|refining|searching","dominantDrive":"order|chaos|novelty|coherence|exploration|preservation","regionId":"row-col","actions":[...]}',
        'Allowed action shapes: {"type":"setPixel","x":0,"y":0,"color":{"r":0,"g":0,"b":0,"a":255}}',
        'or {"type":"fillRegion","x":0,"y":0,"w":8,"h":8,"color":{"r":0,"g":0,"b":0,"a":255}}',
        'or {"type":"pixelLine","from":{"x":0,"y":0},"to":{"x":10,"y":10},"color":{"r":0,"g":0,"b":0,"a":255},"width":2,"jitter":0.2,"density":0.8}',
        'or {"type":"pixelSpray","points":[{"x":0,"y":0}],"color":{"r":0,"g":0,"b":0,"a":255},"size":4,"opacity":0.5,"scatter":0.4,"density":0.8}',
        "Return 8 to 18 actions.",
      ].join("\n\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        canvas: {
          width: input.metrics.canvasWidth,
          height: input.metrics.canvasHeight,
          density: input.metrics.density,
          contrast: input.metrics.contrast,
          entropy: input.metrics.entropy,
          focalStrength: input.metrics.focalStrength,
          balanceX: input.metrics.balanceX,
          balanceY: input.metrics.balanceY,
          dominantHues: input.metrics.dominantHues,
          summary: input.metrics.summary,
        },
        regions: input.metrics.regionMetrics.map((region) => ({
          id: region.id,
          x: region.x,
          y: region.y,
          w: region.w,
          h: region.h,
          emptiness: region.emptiness,
          contrast: region.contrast,
          entropy: region.entropy,
          focalWeight: region.focalWeight,
          dominantHue: region.dominantHue,
        })),
        internal: {
          mood: input.internal.mood,
          dominantDrive: input.internal.dominantDrive,
          thought: input.internal.currentThought,
          obsessions: input.internal.obsessions,
          grudges: input.internal.grudges,
          forbiddenRegions: input.internal.forbiddenRegions,
        },
      }),
    },
  ];

  const raw = await chatCompletion(input.llmConfig, messages);
  const parsed = extractJSON(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid LLM art plan");
  }

  const plan = parsed as Record<string, unknown>;
  const region = resolveRegion(plan.regionId, input.metrics.regionMetrics);
  const actions = sanitizeActions(plan.actions, input.metrics);

  if (actions.length === 0) {
    throw new Error("empty LLM art plan");
  }

  return completeLlmBurstPlan({
    internal: input.internal,
    metrics: input.metrics,
    critic: input.internal.critic,
    mood: isMood(plan.mood) ? plan.mood : input.internal.mood,
    dominantDrive: isDrive(plan.dominantDrive)
      ? plan.dominantDrive
      : input.internal.dominantDrive,
    region,
    actions,
    thought: typeof plan.thought === "string" ? plan.thought : "seeking a stronger image state",
    confidence: typeof plan.confidence === "number" ? clamp(plan.confidence, 0, 1) : 0.72,
  });
}

function resolveRegion(regionId: unknown, regions: RegionMetrics[]): RegionMetrics {
  if (typeof regionId === "string") {
    const match = regions.find((region) => region.id === regionId);
    if (match) return match;
  }

  return (
    [...regions].sort((a, b) => b.emptiness + b.focalWeight - (a.emptiness + a.focalWeight))[0] ??
    regions[0]!
  );
}

function sanitizeActions(actionsValue: unknown, metrics: CanvasMetrics): CanvasAction[] {
  if (!Array.isArray(actionsValue)) return [];
  return actionsValue
    .map((action) => sanitizeAction(action, metrics))
    .filter((action): action is CanvasAction => action !== null)
    .slice(0, 20);
}

function sanitizeAction(action: unknown, metrics: CanvasMetrics): CanvasAction | null {
  if (!action || typeof action !== "object") return null;
  const value = action as Record<string, unknown>;

  switch (value.type) {
    case "setPixel":
      if (!isColor(value.color)) return null;
      return {
        type: "setPixel",
        x: clampInt(value.x, 0, metrics.canvasWidth - 1),
        y: clampInt(value.y, 0, metrics.canvasHeight - 1),
        color: sanitizeColor(value.color),
      };

    case "fillRegion":
      if (!isColor(value.color)) return null;
      return {
        type: "fillRegion",
        x: clampInt(value.x, 0, metrics.canvasWidth - 1),
        y: clampInt(value.y, 0, metrics.canvasHeight - 1),
        w: clampInt(value.w, 1, Math.max(1, metrics.canvasWidth)),
        h: clampInt(value.h, 1, Math.max(1, metrics.canvasHeight)),
        color: sanitizeColor(value.color),
      };

    case "pixelLine":
      if (!isPoint(value.from) || !isPoint(value.to) || !isColor(value.color)) return null;
      return {
        type: "pixelLine",
        from: sanitizePoint(value.from, metrics),
        to: sanitizePoint(value.to, metrics),
        color: sanitizeColor(value.color),
        width: clampNumber(value.width, 1, 12),
        jitter: clampNumber(value.jitter, 0, 1),
        density: clampNumber(value.density, 0.05, 1),
      };

    case "pixelSpray":
      if (!Array.isArray(value.points) || !isColor(value.color)) return null;
      return {
        type: "pixelSpray",
        points: value.points
          .filter(isPoint)
          .map((point) => sanitizePoint(point, metrics))
          .slice(0, 48),
        color: sanitizeColor(value.color),
        size: clampNumber(value.size, 1, 12),
        opacity: clampNumber(value.opacity, 0.05, 1),
        scatter: clampNumber(value.scatter, 0, 1),
        density: clampNumber(value.density, 0.05, 1),
      };

    default:
      return null;
  }
}

function sanitizePoint(value: unknown, metrics: CanvasMetrics) {
  const point = value as { x: unknown; y: unknown };
  return {
    x: clampInt(point.x, 0, metrics.canvasWidth - 1),
    y: clampInt(point.y, 0, metrics.canvasHeight - 1),
  };
}

function sanitizeColor(value: unknown): RGBAColor {
  const color = value as Record<string, unknown>;
  return {
    r: clampInt(color.r, 0, 255),
    g: clampInt(color.g, 0, 255),
    b: clampInt(color.b, 0, 255),
    a: clampInt(color.a, 0, 255),
  };
}

function clampInt(value: unknown, min: number, max: number) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function clampNumber(value: unknown, min: number, max: number) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

function isPoint(value: unknown): value is { x: unknown; y: unknown } {
  return !!value && typeof value === "object" && "x" in value && "y" in value;
}

function isColor(value: unknown): value is RGBAColor {
  return (
    !!value &&
    typeof value === "object" &&
    "r" in value &&
    "g" in value &&
    "b" in value &&
    "a" in value
  );
}

function isMood(value: unknown): value is BurstPlan["mood"] {
  return ["calm", "curious", "destructive", "refining", "searching"].includes(String(value));
}

function isDrive(value: unknown): value is BurstPlan["dominantDrive"] {
  return ["order", "chaos", "novelty", "coherence", "exploration", "preservation"].includes(
    String(value)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
