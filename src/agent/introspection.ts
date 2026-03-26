import type { AgentInternalState, CanvasMetrics } from "../types/agent";

/** First-person self-model + field sense logged each burst (“self-awareness” for the organism). */
export function introspectionPulse(internal: AgentInternalState, metrics: CanvasMetrics): string {
  const h =
    metrics.balanceX > 0.12
      ? "ink leans left"
      : metrics.balanceX < -0.12
        ? "ink leans right"
        : "left-right equilibrium";
  const v =
    metrics.balanceY > 0.12
      ? "mass high"
      : metrics.balanceY < -0.12
        ? "mass low"
        : "vertical balance";
  const memory = internal.lastBurstResult
    ? `Last mark read as ${internal.lastBurstResult.label}: ${internal.lastBurstResult.reason}`
    : "No prior mark in memory.";
  const critic = internal.critic?.text
    ? ` Interior echo: ${internal.critic.text.slice(0, 120)}${internal.critic.text.length > 120 ? "…" : ""}`
    : "";
  return `I sense myself at burst ${internal.burstCount}, mood ${internal.mood}, drive ${internal.dominantDrive}. The field is ${h}, ${v}; density ${metrics.density.toFixed(2)}. ${memory}.${critic}`;
}
