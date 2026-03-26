import { create } from "zustand";
import type { Viewport } from "../types/canvas";
import type { ActionRecord, CanvasAction } from "../types/actions";

interface CanvasStore {
  viewport: Viewport;
  history: ActionRecord[];
  historyIndex: number;
  isPanning: boolean;

  setViewport: (viewport: Viewport) => void;
  pushAction: (action: CanvasAction, source: "agent" | "human") => void;
  rewindHistory: (count: number) => void;
  setIsPanning: (v: boolean) => void;
  clearHistory: () => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  viewport: { offsetX: 0, offsetY: 0, zoom: 1 },
  history: [],
  historyIndex: -1,
  isPanning: false,

  setViewport: (viewport) => set({ viewport }),

  pushAction: (action, source) =>
    set((store) => {
      const record: ActionRecord = {
        id: crypto.randomUUID(),
        action,
        timestamp: Date.now(),
        source,
      };
      const history = [...store.history, record];
      return { history, historyIndex: history.length - 1 };
    }),

  rewindHistory: (count) =>
    set((store) => {
      const history = store.history.slice(0, Math.max(0, store.history.length - count));
      return { history, historyIndex: history.length - 1 };
    }),

  setIsPanning: (v) => set({ isPanning: v }),
  clearHistory: () => set({ history: [], historyIndex: -1 }),
}));
