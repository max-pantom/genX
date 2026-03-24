import { useAgentStore } from "../store/agent-store";
import { useCanvasStore } from "../store/canvas-store";
import { cn } from "../lib/utils";
import type { CanvasEngine } from "../engine/canvas-engine";
import {
  pauseAgentLoop,
  startAgentLoop,
  stepAgentBurst,
  stopAgentLoop,
} from "../agent/agent-loop";

interface TopBarProps {
  engine: CanvasEngine | null;
}

export function TopBar({ engine }: TopBarProps) {
  const { toggleRightPanel } = useCanvasStore();
  const { state, config, setConfig, resetRun } = useAgentStore();

  const handleExport = () => {
    if (!engine) return;
    const url = engine.exportPNG();
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `genx-${Date.now()}.png`;
    anchor.click();
  };

  const handleReset = () => {
    if (!engine) return;
    stopAgentLoop();
    engine.clear("#f0f0ec");
    useCanvasStore.getState().clearHistory();
    resetRun();
  };

  const handleRunPause = () => {
    if (!engine) return;
    if (state === "running") {
      pauseAgentLoop();
    } else {
      startAgentLoop(engine);
    }
  };

  const handleStep = async () => {
    if (!engine) return;
    await stepAgentBurst(engine);
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-30 h-16 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div>
          <span className="block text-lg font-black uppercase tracking-tight text-text-primary">
            genX
          </span>
          <span className="block text-[10px] uppercase tracking-[0.25em] text-text-primary/45">
            Autonomous Visual Organism
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(["slow", "realtime", "hyper"] as const).map((preset) => (
          <button
            key={preset}
            onClick={() => setConfig({ speedPreset: preset })}
            className={cn(
              "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-full transition-colors",
              config.speedPreset === preset
                ? "bg-text-primary text-white"
                : "bg-white/55 text-text-secondary hover:bg-white/75"
            )}
          >
            {preset === "realtime" ? "real-time" : preset}
          </button>
        ))}

        <button
          onClick={handleRunPause}
          className={cn(
            "px-5 py-2 text-xs font-bold uppercase tracking-wide rounded-full transition-colors",
            state === "running"
              ? "bg-accent-alert text-white"
              : "bg-white text-text-primary shadow-sm hover:shadow"
          )}
        >
          {state === "running" ? "Pause" : "Run"}
        </button>

        <button
          onClick={handleStep}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-full bg-white/70 text-text-primary hover:bg-white transition-colors"
        >
          Step
        </button>

        <button
          onClick={handleReset}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-full bg-white/50 text-text-secondary hover:bg-white/80 transition-colors"
        >
          Reset
        </button>

        <button
          onClick={handleExport}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-full bg-white/50 text-text-secondary hover:bg-white/80 transition-colors"
        >
          Export
        </button>

        <button
          onClick={toggleRightPanel}
          className="size-9 flex items-center justify-center rounded-full bg-white/50 text-text-secondary hover:bg-white/80 transition-colors"
          aria-label="Toggle organism panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="1.5" x2="10" y2="14.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
