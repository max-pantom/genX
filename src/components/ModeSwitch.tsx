import { useCanvasStore } from "../store/canvas-store";
import { cn } from "../lib/utils";
import type { Mode } from "../types/canvas";

export function ModeSwitch() {
  const { mode, setMode } = useCanvasStore();

  const modes: { key: Mode; label: string }[] = [
    { key: "compose", label: "Compose" },
    { key: "mutate", label: "Mutate" },
  ];

  return (
    <div className="flex items-center bg-white/40 rounded-full p-1 gap-0.5">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          className={cn(
            "px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full transition-colors",
            mode === m.key
              ? m.key === "compose"
                ? "bg-accent-compose text-white"
                : "bg-accent-mutate text-white"
              : "text-text-primary/50 hover:text-text-primary/80"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
