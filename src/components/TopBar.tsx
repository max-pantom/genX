import type { CanvasEngine } from "../engine/canvas-engine";
import type { RGBAColor } from "../types/actions";
import { useCanvasStore } from "../store/canvas-store";

interface PixelInfo {
  x: number;
  y: number;
  color: RGBAColor;
}

interface TopBarProps {
  engine: CanvasEngine | null;
  color: RGBAColor;
  setColor: (color: RGBAColor) => void;
  hoverPixel: PixelInfo | null;
  activePixel: PixelInfo | null;
}

const CHANNELS: Array<keyof RGBAColor> = ["r", "g", "b", "a"];

export function TopBar({
  engine,
  color,
  setColor,
  hoverPixel,
  activePixel,
}: TopBarProps) {
  const clearHistory = useCanvasStore((s) => s.clearHistory);
  const sample = hoverPixel ?? activePixel;

  const handleExport = () => {
    if (!engine) return;
    const url = engine.exportPNG();
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pixel-grid-${Date.now()}.png`;
    anchor.click();
  };

  const handleReset = () => {
    if (!engine) return;
    engine.clear("rgba(0, 0, 0, 0)");
    engine.flush();
    clearHistory();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-2 rounded-[28px] border border-white/10 bg-[#08101f]/86 px-3 py-3 text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <button
          onClick={handleReset}
          className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-2 text-xs font-bold tracking-[0.2em] text-white/82 transition hover:bg-white/[0.12]"
        >
          CLEAR
        </button>

        <button
          onClick={handleExport}
          className="rounded-full bg-white px-3 py-2 text-xs font-bold tracking-[0.2em] text-[#08101f] transition hover:bg-white/90"
        >
          PNG
        </button>

        <div
          className="h-10 w-10 rounded-2xl border border-white/15 shadow-inner"
          style={{
            backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.max(
              0,
              Math.min(1, color.a / 255)
            )})`,
          }}
        />

        {CHANNELS.map((channel) => (
          <label
            key={channel}
            className="flex min-w-[180px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
          >
            <span className="w-4 text-[10px] font-bold uppercase tracking-[0.25em] text-white/52">
              {channel}
            </span>
            <input
              type="range"
              min="0"
              max="255"
              value={color[channel]}
              onChange={(event) =>
                setColor({
                  ...color,
                  [channel]: Number(event.target.value),
                })
              }
              className="flex-1"
            />
            <input
              type="number"
              min="0"
              max="255"
              value={color[channel]}
              onChange={(event) =>
                setColor({
                  ...color,
                  [channel]: Math.max(0, Math.min(255, Number(event.target.value) || 0)),
                })
              }
              className="w-14 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-right text-[11px] font-mono text-white outline-none"
            />
          </label>
        ))}

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-mono text-white/55">
          {hoverPixel ? `${hoverPixel.x},${hoverPixel.y}` : "--,--"} ·{" "}
          {sample
            ? `${sample.color.r},${sample.color.g},${sample.color.b},${sample.color.a}`
            : "--,--,--,--"}
        </div>
      </div>
    </div>
  );
}
