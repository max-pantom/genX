import { useAgentStore } from "../store/agent-store";
import { cn } from "../lib/utils";

export function BottomStrip() {
  const { internal } = useAgentStore();
  const recentBursts = internal.shortMemory.slice(-48);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 h-12 flex items-center px-4 gap-3 bg-white/18 backdrop-blur-sm">
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={cn(
            "size-2 rounded-full",
            internal.lastBurstResult?.label === "hurt"
              ? "bg-accent-alert"
              : internal.lastBurstResult?.label === "helped"
              ? "bg-bright-green"
              : "bg-accent-primary"
          )}
        />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-primary/40">
          Burst Timeline
        </span>
      </div>

      <div className="flex-1 flex items-end gap-px h-6 overflow-hidden">
        {recentBursts.length === 0 && (
          <span className="text-[10px] text-text-muted/35 font-medium">
            No bursts yet
          </span>
        )}
        {recentBursts.map((burst, index) => (
          <div
            key={burst.id}
            className="flex-1 min-w-[3px] rounded-t-sm transition-colors"
            style={{
              height: `${35 + ((index + 1) / recentBursts.length) * 60}%`,
              backgroundColor:
                burst.label === "helped"
                  ? "var(--color-bright-green)"
                  : burst.label === "hurt"
                  ? "var(--color-accent-alert)"
                  : "var(--color-accent-primary-dim)",
              opacity: 0.35 + ((index + 1) / recentBursts.length) * 0.65,
            }}
            title={`${burst.regionId} · ${burst.reason}`}
          />
        ))}
      </div>

      <div className="shrink-0 text-right">
        <div className="text-[10px] font-bold text-text-primary/35 tabular-nums">
          {internal.burstCount}
        </div>
        <div className="text-[9px] uppercase tracking-wide text-text-muted/35">
          bursts
        </div>
      </div>
    </div>
  );
}
