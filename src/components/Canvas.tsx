import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { CanvasEngine, DISPLAY_PIXEL_SIZE } from "../engine/canvas-engine";
import { zoomAt, clampViewport, fitToScreen } from "../engine/viewport";
import { useCanvasStore } from "../store/canvas-store";
import type { Viewport } from "../types/canvas";

interface CanvasProps {
  onEngineReady: (engine: CanvasEngine) => void;
}

export function Canvas({ onEngineReady }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const panStartRef = useRef<{ x: number; y: number; vp: Viewport } | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const { viewport, isPanning, setViewport, setIsPanning } = useCanvasStore();

  const pixelFieldSize = useMemo(
    () => ({
      w: containerSize.w > 0 ? Math.max(120, Math.ceil(containerSize.w / DISPLAY_PIXEL_SIZE)) : 0,
      h: containerSize.h > 0 ? Math.max(120, Math.ceil(containerSize.h / DISPLAY_PIXEL_SIZE)) : 0,
    }),
    [containerSize.h, containerSize.w]
  );

  const displayWidth = pixelFieldSize.w * DISPLAY_PIXEL_SIZE;
  const displayHeight = pixelFieldSize.h * DISPLAY_PIXEL_SIZE;

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
    if (!canvasRef.current || containerSize.w <= 0 || containerSize.h <= 0 || engineRef.current) return;

    const logicalWidth = pixelFieldSize.w;
    const logicalHeight = pixelFieldSize.h;
    const engine = new CanvasEngine(canvasRef.current, logicalWidth, logicalHeight);
    engineRef.current = engine;
    onEngineReady(engine);
    setViewport(
      fitToScreen(
        containerSize.w,
        containerSize.h,
        logicalWidth * DISPLAY_PIXEL_SIZE,
        logicalHeight * DISPLAY_PIXEL_SIZE
      )
    );
  }, [onEngineReady, pixelFieldSize.h, pixelFieldSize.w, setViewport]);

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
      if (!panStartRef.current || !engineRef.current) return;

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
          containerSize.h,
          engineRef.current.width * DISPLAY_PIXEL_SIZE,
          engineRef.current.height * DISPLAY_PIXEL_SIZE
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
      if (!engineRef.current) return;
      event.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const nextViewport = zoomAt(viewport, sx, sy, event.deltaY);
      setViewport(
        clampViewport(
          nextViewport,
          containerSize.w,
          containerSize.h,
          engineRef.current.width * DISPLAY_PIXEL_SIZE,
          engineRef.current.height * DISPLAY_PIXEL_SIZE
        )
      );
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
          width: displayWidth,
          height: displayHeight,
          imageRendering: "pixelated",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={{ width: displayWidth, height: displayHeight }}
        />
      </div>

      <div className="absolute top-18 left-4 rounded-full bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/80">
        2x2 pixel field
      </div>

      <div className="absolute bottom-12 right-4 text-text-primary/24 text-[10px] font-bold select-none tabular-nums">
        {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}
