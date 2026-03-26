import { useState, useCallback, useEffect } from "react";
import { Canvas } from "./components/Canvas";
import { TopBar } from "./components/TopBar";
import { AgentCornerDock } from "./components/AgentCornerDock";
import type { CanvasEngine } from "./engine/canvas-engine";
import type { RGBAColor } from "./types/actions";
import { startAgentLoop, stopAgentLoop } from "./agent/agent-loop";
import { useAgentStore } from "./store/agent-store";

interface PixelInfo {
  x: number;
  y: number;
  color: RGBAColor;
}

export default function App() {
  const [engine, setEngine] = useState<CanvasEngine | null>(null);
  const [color, setColor] = useState<RGBAColor>({ r: 255, g: 90, b: 90, a: 255 });
  const [hoverPixel, setHoverPixel] = useState<PixelInfo | null>(null);
  const [activePixel, setActivePixel] = useState<PixelInfo | null>(null);

  const handleEngineReady = useCallback((eng: CanvasEngine) => {
    setEngine(eng);
  }, []);

  useEffect(() => {
    useAgentStore.getState().setConfig({
      speedPreset: "hyper",
      burstMin: 10,
      burstMax: 20,
      intensity: 0.82,
    });
  }, []);

  useEffect(() => {
    if (!engine) return;
    startAgentLoop(engine);
  }, [engine]);

  useEffect(() => () => stopAgentLoop(), []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#050816] select-none">
      <Canvas
        color={color}
        onEngineReady={handleEngineReady}
        onHoverPixel={setHoverPixel}
        onActivePixelChange={setActivePixel}
      />
      <TopBar
        engine={engine}
        color={color}
        setColor={setColor}
        hoverPixel={hoverPixel}
        activePixel={activePixel}
      />
      <AgentCornerDock engine={engine} />
    </div>
  );
}
