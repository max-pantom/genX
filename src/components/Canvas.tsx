import { useRef, useEffect, useCallback, useState } from "react";
import { CanvasEngine, CANVAS_W, CANVAS_H } from "../engine/canvas-engine";
import { zoomAt, clampViewport, fitToScreen } from "../engine/viewport";
import { useCanvasStore } from "../store/canvas-store";
import type { Viewport } from "../types/canvas";

interface CanvasProps {
  onEngineReady: (engine: CanvasEngine) => void;
}

export function Canvas({ onEngineReady }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; vp: Viewport } | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const { viewport, isPanning, setViewport, setIsPanning } = useCanvasStore();

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new CanvasEngine(canvasRef.current);
    onEngineReady(engine);
  }, [onEngineReady]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (containerSize.w > 0 && containerSize.h > 0) {
      setViewport(fitToScreen(containerSize.w, containerSize.h));
    }
  }, [containerSize, setViewport]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      panStartRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        vp: { ...viewport },
      };
      setIsPanning(true);
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    },
    [setIsPanning, viewport]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!panStartRef.current) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const dx = sx - panStartRef.current.x;
      const dy = sy - panStartRef.current.y;

      setViewport(
        clampViewport(
          {
            ...panStartRef.current.vp,
            offsetX: panStartRef.current.vp.offsetX + dx,
            offsetY: panStartRef.current.vp.offsetY + dy,
          },
          containerSize.w,
          containerSize.h
        )
      );
    },
    [containerSize.h, containerSize.w, setViewport]
  );

  const handlePointerUp = useCallback(() => {
    panStartRef.current = null;
    setIsPanning(false);
  }, [setIsPanning]);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const nextViewport = zoomAt(viewport, sx, sy, event.deltaY);
      setViewport(clampViewport(nextViewport, containerSize.w, containerSize.h));
    },
    [containerSize.h, containerSize.w, setViewport, viewport]
  );

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        setIsPanning(true);
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.key === " ") {
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, [setIsPanning]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{ touchAction: "none" }}
    >
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`,
          width: CANVAS_W,
          height: CANVAS_H,
          imageRendering: viewport.zoom > 3 ? "pixelated" : "auto",
          borderRadius: 12 / Math.max(viewport.zoom, 0.5),
          overflow: "hidden",
          boxShadow: "0 8px 48px rgba(0,0,0,0.11), 0 2px 12px rgba(0,0,0,0.08)",
        }}
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        />
      </div>

      <div className="absolute bottom-12 right-4 text-text-primary/24 text-[10px] font-bold select-none tabular-nums">
        {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}
