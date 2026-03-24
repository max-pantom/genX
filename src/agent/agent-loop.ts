import type { CanvasEngine } from "../engine/canvas-engine";
import { executeAction } from "../engine/action-executor";
import { observeCanvas } from "./canvas-observer";
import {
  createBurstMemory,
  planBurst,
  scoreBurst,
} from "./organism-brain";
import { useAgentStore } from "../store/agent-store";
import { useCanvasStore } from "../store/canvas-store";
import { chatCompletion, type ChatMessage } from "./llm-client";
import { updateTendencyProfile } from "./tendency-profile";

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
  const plan = planBurst({
    internal: store.internal,
    config: store.config,
    metrics: before,
    critic: store.internal.critic,
  });

  store.addLog(plan.thought, "thought");
  store.addLog(`region ${plan.region.id} -> ${plan.actions.length} pixel actions`, "thought");

  engine.pushSnapshot();

  for (const action of plan.actions) {
    executeAction(engine, action);
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

  let rolledBack = false;
  const nextNegativeStreak =
    result.label === "hurt" ? store.internal.negativeStreak + 1 : 0;

  if (result.score < -0.12 && nextNegativeStreak >= 2) {
    engine.undo();
    useCanvasStore.getState().rewindHistory(plan.actions.length);
    rolledBack = true;
    result = { ...result, rolledBack: true, label: "hurt", reason: `${result.reason}; rollback triggered` };
    store.addLog("rollback after repeated damage", "thought");
  }

  const memory = createBurstMemory(plan, result);
  const tendencyProfile = updateTendencyProfile(
    store.internal.tendencyProfile,
    memory,
    store.config.seedTheme
  );

  store.updateInternal({
    tick: store.internal.tick + 1,
    burstCount: store.internal.burstCount + 1,
    confidence: plan.confidence,
    mood: plan.mood,
    dominantDrive: plan.dominantDrive,
    drives: plan.drives,
    metrics: rolledBack ? before : after,
    regionStates: plan.nextRegionStates,
    currentRegion: plan.region,
    negativeStreak: rolledBack ? 0 : nextNegativeStreak,
    shortMemory: [...store.internal.shortMemory.slice(-49), memory],
    tendencyProfile,
    lastBurstResult: result,
    currentThought: result.reason,
  });

  store.addLog(
    `${result.label}: ${result.reason}`,
    result.rolledBack ? "thought" : "critic"
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
      content:
        "You are a concise visual critic for an autonomous drawing organism. Respond in 1-2 short sentences. Focus on composition, variation, focal control, and restraint.",
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
        "Give one strategic adjustment and one warning.",
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
      ? 50
      : preset === "slow"
      ? 1500
      : preset === "realtime"
      ? 700
      : 150;

  window.setTimeout(() => {
    if (!running) return;
    void runBurst(engine);
  }, delay);
}
