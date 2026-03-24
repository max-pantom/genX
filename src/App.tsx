import { useState, useCallback, useEffect } from "react";
import { Canvas } from "./components/Canvas";
import { TopBar } from "./components/TopBar";
import { RightPanel } from "./components/RightPanel";
import { BottomStrip } from "./components/BottomStrip";
import { Minimap } from "./components/Minimap";
import { stopAgentLoop } from "./agent/agent-loop";
import type { CanvasEngine } from "./engine/canvas-engine";

export default function App() {
  const [engine, setEngine] = useState<CanvasEngine | null>(null);

  const handleEngineReady = useCallback((eng: CanvasEngine) => {
    setEngine(eng);
  }, []);

  useEffect(() => () => stopAgentLoop(), []);

  return (
    <div className="relative w-full h-dvh bg-surface overflow-hidden select-none">
      <Canvas onEngineReady={handleEngineReady} />
      <TopBar engine={engine} />
      <RightPanel />
      <Minimap engine={engine} />
      <BottomStrip />
    </div>
  );
}
