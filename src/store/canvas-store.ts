import { create } from "zustand";
import type { Mode, Tool, ComposeTool, MutateTool, Viewport, BrushSettings } from "../types/canvas";
import type { ActionRecord, CanvasAction } from "../types/actions";
import { DEFAULT_PALETTE } from "../utils/color";

interface CanvasStore {
  mode: Mode;
  tool: Tool;
  viewport: Viewport;
  brush: BrushSettings;
  palette: { colors: string[]; activeIndex: number };
  history: ActionRecord[];
  historyIndex: number;
  isPanning: boolean;
  showMinimap: boolean;
  showRightPanel: boolean;

  setMode: (mode: Mode) => void;
  setTool: (tool: Tool) => void;
  setViewport: (viewport: Viewport) => void;
  setBrush: (brush: Partial<BrushSettings>) => void;
  setPaletteColor: (index: number) => void;
  addPaletteColor: (color: string) => void;
  pushAction: (action: CanvasAction, source: "agent" | "human") => void;
  rewindHistory: (count: number) => void;
  setIsPanning: (v: boolean) => void;
  toggleMinimap: () => void;
  toggleRightPanel: () => void;
  clearHistory: () => void;
}

const COMPOSE_TOOLS: ComposeTool[] = [
  "brush",
  "line",
  "rectangle",
  "circle",
  "fill",
  "erase",
];
const MUTATE_TOOLS: MutateTool[] = [
  "pixelBrush",
  "noise",
  "smear",
  "dither",
  "colorShift",
  "glitch",
  "decay",
];

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  mode: "compose",
  tool: "brush",
  viewport: { offsetX: 0, offsetY: 0, zoom: 1 },
  brush: { size: 8, opacity: 1, color: "#e8e8ec" },
  palette: { colors: [...DEFAULT_PALETTE], activeIndex: 0 },
  history: [],
  historyIndex: -1,
  isPanning: false,
  showMinimap: true,
  showRightPanel: true,

  setMode: (mode) => {
    const currentTool = get().tool;
    const validTools = mode === "compose" ? COMPOSE_TOOLS : MUTATE_TOOLS;
    const tool = validTools.includes(currentTool as never)
      ? currentTool
      : validTools[0];
    set({ mode, tool });
  },

  setTool: (tool) => set({ tool }),

  setViewport: (viewport) => set({ viewport }),

  setBrush: (partial) =>
    set((s) => ({ brush: { ...s.brush, ...partial } })),

  setPaletteColor: (index) => {
    const { palette } = get();
    set({
      palette: { ...palette, activeIndex: index },
      brush: { ...get().brush, color: palette.colors[index] },
    });
  },

  addPaletteColor: (color) =>
    set((s) => ({
      palette: {
        colors: [...s.palette.colors, color],
        activeIndex: s.palette.colors.length,
      },
      brush: { ...s.brush, color },
    })),

  pushAction: (action, source) =>
    set((s) => {
      const record: ActionRecord = {
        id: crypto.randomUUID(),
        action,
        timestamp: Date.now(),
        mode: s.mode,
        source,
      };
      const history = [...s.history, record];
      return { history, historyIndex: history.length - 1 };
    }),

  rewindHistory: (count) =>
    set((s) => {
      const history = s.history.slice(0, Math.max(0, s.history.length - count));
      return { history, historyIndex: history.length - 1 };
    }),

  setIsPanning: (v) => set({ isPanning: v }),
  toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
  toggleRightPanel: () => set((s) => ({ showRightPanel: !s.showRightPanel })),
  clearHistory: () => set({ history: [], historyIndex: -1 }),
}));
