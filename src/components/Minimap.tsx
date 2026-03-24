import { useRef, useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { useAgentStore } from "../store/agent-store";
import { CANVAS_W, CANVAS_H, type CanvasEngine } from "../engine/canvas-engine";

interface MinimapProps {
  engine: CanvasEngine | null;
}

const MINIMAP_SIZE = 112;
const GRID_SIZE = 5;

export function Minimap({ engine }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewport, showMinimap } = useCanvasStore();
  const { internal } = useAgentStore();

  useEffect(() => {
    if (!canvasRef.current || !engine || !showMinimap) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    let animationFrame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
      ctx.drawImage(engine.getCanvasForMinimap(), 0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

      const cellW = MINIMAP_SIZE / GRID_SIZE;
      const cellH = MINIMAP_SIZE / GRID_SIZE;
      for (const state of internal.regionStates) {
        const [row, col] = state.id.split("-").map(Number);
        const alpha = Math.min(0.45, state.attention * 0.35 + state.neglect * 0.1);
        ctx.fillStyle = `rgba(17, 24, 39, ${alpha})`;
        ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
      }

      if (internal.currentRegion) {
        const current = internal.currentRegion;
        const scaleX = MINIMAP_SIZE / CANVAS_W;
        const scaleY = MINIMAP_SIZE / CANVAS_H;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(current.x * scaleX, current.y * scaleY, current.w * scaleX, current.h * scaleY);
      }

      const scaleX = MINIMAP_SIZE / CANVAS_W;
      const scaleY = MINIMAP_SIZE / CANVAS_H;
      const vpX = (-viewport.offsetX / viewport.zoom) * scaleX;
      const vpY = (-viewport.offsetY / viewport.zoom) * scaleY;
      const vpW = (window.innerWidth / viewport.zoom) * scaleX;
      const vpH = (window.innerHeight / viewport.zoom) * scaleY;

      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vpX, vpY, vpW, vpH);

      animationFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, [engine, internal.currentRegion, internal.regionStates, showMinimap, viewport]);

  if (!showMinimap) return null;

  return (
    <div className="absolute bottom-16 left-4 z-20 rounded-2xl overflow-hidden bg-white/72 backdrop-blur-sm shadow-sm p-2">
      <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-text-muted mb-1.5 px-0.5">
        Attention Map
      </div>
      <canvas
        ref={canvasRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        className="block rounded-xl overflow-hidden"
        style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
      />
    </div>
  );
}
