import type { CanvasEngine } from "../engine/canvas-engine";
import { executeActionProgressive } from "../engine/action-executor";
import { observeCanvas } from "./canvas-observer";
import {
  createBurstMemory,
  planBurst,
  scoreBurst,
  unstableMemorySnapshot,
} from "./organism-brain";
import { useAgentStore } from "../store/agent-store";
import { useCanvasStore } from "../store/canvas-store";
import { chatCompletion, checkConnection, listModels, type ChatMessage } from "./llm-client";
import { updateTendencyProfile } from "./tendency-profile";
import { AGENT_SOUL } from "./soul";
import { planBurstWithLLM } from "./llm-plan";
import { introspectionPulse } from "./introspection";

let running = false;
let loopToken = 0;

export function startAgentLoop(engine: CanvasEngine) {
  if (running && useAgentStore.getState().state === "running") return;
  running = true;
  useAgentStore.getState().setState("running");
  scheduleNext(engine, true);
}

export function pauseAgentLoop() {
  running = false;
  useAgentStore.getState().setState("paused");
}

export function stopAgentLoop() {
  running = false;
  useAgentStore.getState().setState("idle");
}

export async function stepAgentBurst(engine: CanvasEngine) {
  const previousState = useAgentStore.getState().state;
  useAgentStore.getState().setState("observing");
  await runBurst(engine, true);
  if (useAgentStore.getState().state === "observing") {
    useAgentStore.getState().setState(previousState === "running" ? "running" : "paused");
  }
}

async function runBurst(engine: CanvasEngine, manual = false) {
  const token = ++loopToken;
  const store = useAgentStore.getState();
  const canvasStore = useCanvasStore.getState();

  if (!manual && (!running || store.state !== "running")) return;

  const before = observeCanvas(engine, canvasStore.history);

  store.addLog(introspectionPulse(store.internal, before), "thought");

  let plan;
  const llmConfig = await ensurePlannerConfig();
  const critic = store.internal.critic;
  if (llmConfig?.model) {
    try {
      plan = await planBurstWithLLM({
        llmConfig,
        internal: store.internal,
        metrics: before,
      });
      store.addLog("remote mind shaped this burst", "thought");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "unable to generate plan";
      store.addLog(`remote mind silent (${msg}) — instinct takes over`, "thought");
      plan = planBurst({
        internal: store.internal,
        config: store.config,
        metrics: before,
        critic,
      });
    }
  } else {
    store.addLog("no model endpoint — I dream with local nerves only", "thought");
    plan = planBurst({
      internal: store.internal,
      config: store.config,
      metrics: before,
      critic,
    });
  }

  store.addLog(plan.thought, "thought");
  store.addLog(`region ${plan.region.id} -> ${plan.actions.length} pixel actions`, "thought");

  engine.pushSnapshot();

  for (const action of plan.actions) {
    await executeActionProgressive(engine, action);
    useCanvasStore.getState().pushAction(action, "agent");
    store.addLog(action.type, "action");
  }

  const after = observeCanvas(engine, useCanvasStore.getState().history);
  let result = scoreBurst({
    before,
    after,
    dominantDrive: plan.dominantDrive,
    region: plan.region,
    actionCount: plan.actions.length,
  });

  const nextNegativeStreak =
    result.label === "hurt" ? store.internal.negativeStreak + 1 : 0;

  const memory = createBurstMemory(plan, result);
  const tendencyProfile = updateTendencyProfile(
    store.internal.tendencyProfile,
    memory,
    store.config.seedTheme
  );
  const unstableMemory = unstableMemorySnapshot(tendencyProfile);

  store.updateInternal({
    tick: store.internal.tick + 1,
    burstCount: store.internal.burstCount + 1,
    confidence: plan.confidence,
    mood: plan.mood,
    dominantDrive: plan.dominantDrive,
    drives: plan.drives,
    metrics: after,
    regionStates: plan.nextRegionStates,
    currentRegion: plan.region,
    negativeStreak: nextNegativeStreak,
    shortMemory: [...store.internal.shortMemory.slice(-49), memory],
    tendencyProfile,
    lastBurstResult: result,
    currentThought: result.reason,
    obsessions: unstableMemory.obsessions,
    grudges: unstableMemory.grudges,
    forbiddenRegions: unstableMemory.forbiddenRegions,
  });

  store.addLog(
    `${result.label}: ${result.reason}`,
    "critic"
  );

  if (
    useAgentStore.getState().ollamaConnected &&
    useAgentStore.getState().llmConfig.model &&
    useAgentStore.getState().internal.burstCount > 0 &&
    useAgentStore.getState().internal.burstCount % useAgentStore.getState().config.criticInterval === 0
  ) {
    void runSlowCritic(token);
  }

  if (!manual) {
    scheduleNext(engine);
  }
}

async function ensurePlannerConfig() {
  const store = useAgentStore.getState();
  const envModel = import.meta.env.VITE_MODEL_NAME?.trim();
  if (envModel) {
    if (!store.llmConfig.model) store.setLLMConfig({ model: envModel });
    return { ...useAgentStore.getState().llmConfig, model: envModel };
  }
  if (store.llmConfig.model) {
    return store.llmConfig;
  }

  const connected = await checkConnection(store.llmConfig.endpoint, store.llmConfig.apiKey);
  store.setOllamaConnected(connected);
  if (!connected) return null;

  const models = await listModels(store.llmConfig.endpoint, store.llmConfig.apiKey);
  store.setAvailableModels(models);
  if (models.length === 0) return null;

  store.setLLMConfig({ model: models[0] });
  return { ...useAgentStore.getState().llmConfig, model: models[0] };
}

async function runSlowCritic(token: number) {
  const store = useAgentStore.getState();
  const metrics = store.internal.metrics;
  if (!metrics) return;

  const memorySummary = store.internal.shortMemory
    .slice(-5)
    .map((entry) => `${entry.label} ${entry.regionId}: ${entry.reason}`)
    .join("\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        AGENT_SOUL,
        "You are evaluating the organism's own evolving canvas in real time.",
        "Use the metrics and recent bursts to push the next image state toward stronger generative art.",
      ].join("\n\n"),
    },
    {
      role: "user",
      content: [
        `Mood: ${store.internal.mood}`,
        `Dominant drive: ${store.internal.dominantDrive}`,
        `Metrics: density=${metrics.density.toFixed(2)}, contrast=${metrics.contrast.toFixed(2)}, entropy=${metrics.entropy.toFixed(2)}, focal=${metrics.focalStrength.toFixed(2)}, repetition=${metrics.repetition.toFixed(2)}, cohesion=${metrics.paletteCohesion.toFixed(2)}`,
        `Summary: ${metrics.summary}`,
        "Recent bursts:",
        memorySummary || "none",
        "Give the next artistic correction as the organism's interior voice.",
      ].join("\n"),
    },
  ];

  try {
    const text = await chatCompletion(store.llmConfig, messages);
    if (token !== loopToken) return;

    useAgentStore.getState().setCritic({
      text: text.trim(),
      timestamp: Date.now(),
      confidence: 0.62,
    });
    useAgentStore.getState().addLog(`critic: ${text.trim()}`, "critic");
  } catch (error) {
    const message = error instanceof Error ? error.message : "critic unavailable";
    useAgentStore.getState().addLog(`critic offline: ${message}`, "critic");
  }
}

function scheduleNext(engine: CanvasEngine, immediate = false) {
  if (!running) return;
  const preset = useAgentStore.getState().config.speedPreset;
  const delay =
    immediate
      ? 10
      : preset === "slow"
      ? 220
      : preset === "realtime"
      ? 60
      : 18;

  window.setTimeout(() => {
    if (!running) return;
    void runBurst(engine);
  }, delay);
}
