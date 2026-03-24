import { useCallback, useEffect, type ReactNode } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { useAgentStore } from "../store/agent-store";
import { checkConnection, listModels } from "../agent/llm-client";
import { SEED_THEMES } from "../agent/seed-themes";
import { cn } from "../lib/utils";

export function RightPanel() {
  const { showRightPanel } = useCanvasStore();
  const {
    config,
    llmConfig,
    setLLMConfig,
    state,
    logs,
    internal,
    availableModels,
    setAvailableModels,
    ollamaConnected,
    setOllamaConnected,
    setSeedTheme,
  } = useAgentStore();

  const refreshConnection = useCallback(async () => {
    const apiKey = llmConfig.apiKey || undefined;
    const connected = await checkConnection(llmConfig.endpoint, apiKey);
    setOllamaConnected(connected);

    if (!connected) {
      setAvailableModels([]);
      return;
    }

    const models = await listModels(llmConfig.endpoint, apiKey);
    setAvailableModels(models);
    if (!llmConfig.model && models.length > 0) {
      setLLMConfig({ model: models[0] });
    }
  }, [
    llmConfig.apiKey,
    llmConfig.endpoint,
    llmConfig.model,
    setAvailableModels,
    setLLMConfig,
    setOllamaConnected,
  ]);

  useEffect(() => {
    void refreshConnection();
  }, [llmConfig.endpoint, llmConfig.apiKey, refreshConnection]);

  if (!showRightPanel) return null;

  const lastBurst = internal.lastBurstResult;
  const metrics = internal.metrics;

  return (
    <div className="absolute right-2 top-18 bottom-14 z-20 w-72 flex flex-col gap-2.5 overflow-y-auto overflow-x-hidden pr-0.5">
      <Panel title="Organism">
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[10px]">
          <LabelValue label="Status" value={state} />
          <LabelValue label="Mood" value={internal.mood} />
          <LabelValue label="Drive" value={internal.dominantDrive} />
          <LabelValue label="Bursts" value={String(internal.burstCount)} />
          <LabelValue label="Region" value={internal.currentRegion?.id ?? "none"} />
          <LabelValue label="Pixels" value={metrics ? `${metrics.canvasWidth}x${metrics.canvasHeight}` : "pending"} />
          <LabelValue label="Confidence" value={`${Math.round(internal.confidence * 100)}%`} />
          <LabelValue label="Last score" value={lastBurst ? `${lastBurst.label} ${lastBurst.score.toFixed(2)}` : "none"} />
        </div>
        <div className="mt-3 rounded-xl bg-black/[0.04] px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-wide text-text-muted mb-1">
            Thought
          </div>
          <div className="text-[11px] leading-relaxed text-text-primary">
            {internal.currentThought}
          </div>
        </div>
      </Panel>

      <Panel title="Drives">
        <div className="space-y-2">
          {Object.entries(internal.drives).map(([name, value]) => (
            <div key={name}>
              <div className="flex items-center justify-between text-[10px] font-bold text-text-muted mb-1">
                <span className="uppercase tracking-wide">{name}</span>
                <span className="tabular-nums text-text-primary">{Math.round(value * 100)}</span>
              </div>
              <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-text-primary"
                  style={{ width: `${Math.max(4, value * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Metrics">
        {!metrics ? (
          <div className="text-[10px] text-text-muted">No observation yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[10px]">
              <LabelValue label="Density" value={metrics.density.toFixed(2)} />
              <LabelValue label="Contrast" value={metrics.contrast.toFixed(2)} />
              <LabelValue label="Entropy" value={metrics.entropy.toFixed(2)} />
              <LabelValue label="Focal" value={metrics.focalStrength.toFixed(2)} />
              <LabelValue label="Cohesion" value={metrics.paletteCohesion.toFixed(2)} />
              <LabelValue label="Repetition" value={metrics.repetition.toFixed(2)} />
              <LabelValue label="Edges" value={metrics.edgeActivity.toFixed(2)} />
              <LabelValue label="Symmetry" value={metrics.symmetry.toFixed(2)} />
            </div>
            <div className="mt-3 rounded-xl bg-black/[0.04] px-3 py-2 text-[10px] leading-relaxed text-text-secondary">
              {metrics.summary}
            </div>
          </>
        )}
      </Panel>

      <Panel title="Seed">
        <div className="grid grid-cols-2 gap-1.5">
          {SEED_THEMES.map((theme) => (
            <button
              key={theme.key}
              onClick={() => setSeedTheme(theme.key)}
              className={cn(
                "rounded-xl px-3 py-2 text-left transition-colors",
                config.seedTheme === theme.key
                  ? "bg-text-primary text-white"
                  : "bg-black/[0.04] text-text-primary hover:bg-black/[0.07]"
              )}
            >
              <div className="text-[10px] font-black uppercase tracking-wide">
                {theme.label}
              </div>
              <div
                className={cn(
                  "mt-1 text-[9px] leading-relaxed",
                  config.seedTheme === theme.key ? "text-white/75" : "text-text-muted"
                )}
              >
                {theme.description}
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Critic">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "size-2 rounded-full",
                ollamaConnected ? "bg-bright-green" : "bg-accent-alert"
              )}
            />
            <span className="text-[9px] font-bold uppercase tracking-wide text-text-muted">
              {ollamaConnected ? "online" : "offline"}
            </span>
          </div>
          <button
            onClick={() => void refreshConnection()}
            className="px-2 py-1 rounded-lg bg-black/[0.04] text-[9px] font-bold uppercase tracking-wide text-text-secondary"
          >
            Refresh
          </button>
        </div>

        <input
          type="text"
          value={llmConfig.endpoint}
          onChange={(event) => setLLMConfig({ endpoint: event.target.value })}
          placeholder="http://localhost:11434"
          className="w-full bg-black/[0.03] rounded-lg px-2.5 py-1.5 text-[10px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:bg-black/[0.05] mb-1.5 font-mono"
        />

        <input
          type="password"
          value={llmConfig.apiKey}
          onChange={(event) => setLLMConfig({ apiKey: event.target.value })}
          placeholder="API key"
          className="w-full bg-black/[0.03] rounded-lg px-2.5 py-1.5 text-[10px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:bg-black/[0.05] mb-1.5 font-mono"
        />

        {availableModels.length > 0 ? (
          <select
            value={llmConfig.model}
            onChange={(event) => setLLMConfig({ model: event.target.value })}
            className="w-full bg-black/[0.04] text-text-primary text-[10px] font-bold rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-[9px] text-text-muted/65">
            Critic is optional. Connect a model to add strategic reflection.
          </div>
        )}

        <div className="mt-3 rounded-xl bg-black/[0.04] px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-wide text-text-muted mb-1">
            Latest note
          </div>
          <div className="text-[10px] leading-relaxed text-text-primary">
            {internal.critic?.text ?? "No critic note yet."}
          </div>
        </div>
      </Panel>

      <Panel title="Mind Trace" className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-1">
          {logs.length === 0 && (
            <p className="text-[10px] text-text-muted/50">
              Start the organism to watch its reasoning.
            </p>
          )}
          {logs
            .slice(-60)
            .reverse()
            .map((log) => (
              <div
                key={`${log.timestamp}-${log.text}`}
                className={cn(
                  "text-[9px] font-mono leading-relaxed",
                  log.type === "action"
                    ? "text-text-secondary"
                    : log.type === "critic"
                    ? "text-accent-primary"
                    : "text-text-muted"
                )}
              >
                {log.text}
              </div>
            ))}
        </div>
      </Panel>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white/82 backdrop-blur-sm rounded-2xl p-3.5 shadow-sm", className)}>
      <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-text-muted font-medium">{label}</span>
      <span className="text-text-primary font-bold text-right">{value}</span>
    </>
  );
}
