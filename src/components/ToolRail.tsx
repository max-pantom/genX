import { useCanvasStore } from "../store/canvas-store";
import { cn } from "../lib/utils";
import type { Tool } from "../types/canvas";

interface ToolDef {
  key: Tool;
  label: string;
  icon: string;
}

const composeTools: ToolDef[] = [
  { key: "brush", label: "Brush", icon: "B" },
  { key: "line", label: "Line", icon: "L" },
  { key: "rectangle", label: "Rect", icon: "R" },
  { key: "circle", label: "Circle", icon: "O" },
  { key: "fill", label: "Fill", icon: "F" },
  { key: "erase", label: "Erase", icon: "E" },
];

const mutateTools: ToolDef[] = [
  { key: "pixelBrush", label: "Pixel", icon: "P" },
  { key: "noise", label: "Noise", icon: "N" },
  { key: "smear", label: "Smear", icon: "S" },
  { key: "dither", label: "Dither", icon: "D" },
  { key: "colorShift", label: "Hue", icon: "H" },
  { key: "glitch", label: "Glitch", icon: "G" },
  { key: "decay", label: "Decay", icon: "Y" },
];

export function ToolRail() {
  const { mode, tool, setTool, brush, setBrush, palette, setPaletteColor } =
    useCanvasStore();
  const tools = mode === "compose" ? composeTools : mutateTools;

  return (
    <div className="absolute left-3 top-16 z-20 flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        {tools.map((t) => (
          <button
            key={t.key}
            onClick={() => setTool(t.key)}
            title={t.label}
            aria-label={t.label}
            className={cn(
              "size-11 flex items-center justify-center rounded-full text-sm font-black uppercase transition-all",
              tool === t.key
                ? mode === "compose"
                  ? "bg-accent-compose text-white shadow-md scale-110"
                  : "bg-accent-mutate text-white shadow-md scale-110"
                : "bg-white/60 text-text-primary/40 hover:bg-white hover:text-text-primary hover:shadow-sm"
            )}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="w-11 h-px bg-black/5 my-1" />

      <div className="flex flex-col items-center gap-1 bg-white/60 rounded-2xl p-2">
        <span className="text-[8px] font-bold uppercase text-text-muted tracking-widest">
          Size
        </span>
        <input
          type="range"
          min="1"
          max="64"
          value={brush.size}
          onChange={(e) => setBrush({ size: Number(e.target.value) })}
          className="w-7 -rotate-90 origin-center my-3"
        />
        <span className="text-[10px] font-bold text-text-secondary tabular-nums">
          {brush.size}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1 bg-white/60 rounded-2xl p-2">
        <span className="text-[8px] font-bold uppercase text-text-muted tracking-widest">
          Op
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(brush.opacity * 100)}
          onChange={(e) => setBrush({ opacity: Number(e.target.value) / 100 })}
          className="w-7 -rotate-90 origin-center my-3"
        />
        <span className="text-[10px] font-bold text-text-secondary tabular-nums">
          {Math.round(brush.opacity * 100)}
        </span>
      </div>

      <div className="w-11 h-px bg-black/5 my-1" />

      <div className="flex flex-col gap-1 items-center">
        {palette.colors.slice(0, 8).map((c, i) => (
          <button
            key={i}
            onClick={() => setPaletteColor(i)}
            aria-label={`Color ${c}`}
            className={cn(
              "size-7 rounded-full border-2 transition-all",
              palette.activeIndex === i
                ? "border-text-primary scale-110 shadow-sm"
                : "border-white/60 hover:scale-105"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}
