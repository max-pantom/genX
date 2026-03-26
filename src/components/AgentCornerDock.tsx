import { useCallback, useEffect } from "react";
import type { CanvasEngine } from "../engine/canvas-engine";
import { useAgentStore } from "../store/agent-store";
import { checkConnection, listModels } from "../agent/llm-client";
import { llmConfigFromEnv } from "../lib/llm-env";
import { pauseAgentLoop, startAgentLoop } from "../agent/agent-loop";
import { cn } from "../lib/utils";

interface AgentCornerDockProps {
  engine: CanvasEngine | null;
}

function formatActionLine(text: string): string {
  return text.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

export function AgentCornerDock({ engine }: AgentCornerDockProps) {
  const logs = useAgentStore((s) => s.logs);
  const state = useAgentStore((s) => s.state);
  const llmConfig = useAgentStore((s) => s.llmConfig);
  const ollamaConnected = useAgentStore((s) => s.ollamaConnected);
  const availableModels = useAgentStore((s) => s.availableModels);
  const setOllamaConnected = useAgentStore((s) => s.setOllamaConnected);
  const setAvailableModels = useAgentStore((s) => s.setAvailableModels);
  const setLLMConfig = useAgentStore((s) => s.setLLMConfig);

  const refreshLlm = useCallback(async () => {
    const env = llmConfigFromEnv();
    const endpoint = llmConfig.endpoint || env.endpoint;
    const apiKey = llmConfig.apiKey?.trim() || env.apiKey?.trim();
    const connected = await checkConnection(endpoint, apiKey);
    setOllamaConnected(connected);
    if (!connected) {
      setAvailableModels([]);
      return;
    }
    const models = await listModels(endpoint, apiKey);
    setAvailableModels(models);
    if (!llmConfig.model && models.length > 0) {
      setLLMConfig({ model: models[0] });
    }
  }, [
    llmConfig.endpoint,
    llmConfig.apiKey,
    llmConfig.model,
    setAvailableModels,
    setLLMConfig,
    setOllamaConnected,
  ]);

  useEffect(() => {
    void refreshLlm();
  }, [refreshLlm]);

  const actionLines = logs.filter((l) => l.type === "action").slice(-3);
  const latestThought = [...logs].reverse().find((log) => log.type === "thought");
  const canToggleRun = !!engine && state !== "observing";
  const statusLabel = !engine
    ? "canvas loading"
    : state === "running"
    ? "running"
    : state === "observing"
    ? "thinking"
    : ollamaConnected
    ? "idle · hub ok"
    : "idle · local mind";

  return (
    <div className="pointer-events-auto absolute bottom-24 right-4 z-30 flex w-[min(18rem,calc(100vw-2rem))] flex-col gap-2 rounded-2xl border border-white/12 bg-[#060d1c]/92 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
          Agent
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "size-2 rounded-full",
              state === "running" || ollamaConnected ? "bg-emerald-400" : "bg-amber-400"
            )}
          />
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/50">
            {statusLabel}
          </span>
        </div>
      </div>
      <input
        type="text"
        value={llmConfig.endpoint}
        onChange={(event) => setLLMConfig({ endpoint: event.target.value })}
        placeholder="http://localhost:11434"
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/82 outline-none placeholder:text-white/25"
      />
      {availableModels.length > 0 ? (
        <select
          value={llmConfig.model}
          onChange={(event) => setLLMConfig({ model: event.target.value })}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/82 outline-none"
        >
          {availableModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={llmConfig.model}
          onChange={(event) => setLLMConfig({ model: event.target.value })}
          placeholder="model (optional · VITE_MODEL_NAME)"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/82 outline-none placeholder:text-white/25"
        />
      )}
      {latestThought && (
        <p className="rounded-xl border border-violet-400/20 bg-violet-500/[0.07] px-3 py-2 text-[10px] leading-snug text-violet-100/90">
          {latestThought.text}
        </p>
      )}
      <div className="flex min-h-[4.5rem] flex-col gap-1.5">
        {actionLines.length === 0 ? (
          <p className="text-[11px] leading-snug text-white/35">
            {latestThought?.text ?? "No AI pixels yet."}
          </p>
        ) : (
          actionLines.map((log) => (
            <div
              key={`${log.timestamp}-${log.text}`}
              className="rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1.5 text-[11px] leading-snug text-white/78"
            >
              {formatActionLine(log.text)}
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void refreshLlm()}
          className="flex-1 rounded-xl border border-white/15 bg-white/[0.06] py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/80 transition hover:bg-white/12"
        >
          Refresh
        </button>
        <button
          type="button"
          disabled={!canToggleRun}
          onClick={() => {
            if (!engine) return;
            if (state === "running") pauseAgentLoop();
            else startAgentLoop(engine);
          }}
          className={cn(
            "flex-1 rounded-xl py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition",
            canToggleRun
              ? state === "running"
                ? "border border-white/20 bg-white/10 text-white/90 hover:bg-white/15"
                : "bg-emerald-500 text-[#04120a] hover:bg-emerald-400"
              : "cursor-not-allowed bg-white/8 text-white/35"
          )}
        >
          {state === "running" ? "Pause" : "Run"}
        </button>
      </div>
    </div>
  );
}
