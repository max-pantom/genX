import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { CanvasEngine } from "../engine/canvas-engine";
import type { RGBAColor } from "../types/actions";

interface PixelInfo {
  x: number;
  y: number;
  color: RGBAColor;
}

interface CanvasProps {
  color: RGBAColor;
  onEngineReady: (engine: CanvasEngine) => void;
  onHoverPixel: (pixel: PixelInfo | null) => void;
  onActivePixelChange: (pixel: PixelInfo | null) => void;
}

const TARGET_PIXEL_SIZE = 16;

export function Canvas({
  color,
  onEngineReady,
  onHoverPixel,
  onActivePixelChange,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const isPaintingRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const grid = useMemo(() => {
    if (containerSize.w <= 0 || containerSize.h <= 0) {
      return { cols: 0, rows: 0, pixelSize: 0, displayWidth: 0, displayHeight: 0 };
    }

    const cols = Math.max(16, Math.floor(containerSize.w / TARGET_PIXEL_SIZE));
    const rows = Math.max(16, Math.floor(containerSize.h / TARGET_PIXEL_SIZE));
    const pixelSize = Math.max(
      1,
      Math.floor(Math.min(containerSize.w / cols, containerSize.h / rows))
    );

    return {
      cols,
      rows,
      pixelSize,
      displayWidth: cols * pixelSize,
      displayHeight: rows * pixelSize,
    };
  }, [containerSize.h, containerSize.w]);

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
    if (!canvasRef.current || grid.cols <= 0 || grid.rows <= 0) return;

    const engine = new CanvasEngine(canvasRef.current, grid.cols, grid.rows);
    engine.clear("rgba(0, 0, 0, 0)");
    engine.flush();
    engineRef.current = engine;
    onEngineReady(engine);
    onHoverPixel(null);
    onActivePixelChange(null);

    return () => {
      engineRef.current = null;
    };
  }, [grid.cols, grid.rows, onActivePixelChange, onEngineReady, onHoverPixel]);

  const getPixelInfoFromEvent = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): PixelInfo | null => {
      if (!containerRef.current || !engineRef.current || grid.pixelSize <= 0) return null;

      const rect = containerRef.current.getBoundingClientRect();
      const localX = event.clientX - rect.left - (rect.width - grid.displayWidth) / 2;
      const localY = event.clientY - rect.top - (rect.height - grid.displayHeight) / 2;

      if (
        localX < 0 ||
        localY < 0 ||
        localX >= grid.displayWidth ||
        localY >= grid.displayHeight
      ) {
        return null;
      }

      const x = Math.floor(localX / grid.pixelSize);
      const y = Math.floor(localY / grid.pixelSize);
      const [r, g, b, a] = engineRef.current.getPixel(x, y);

      return {
        x,
        y,
        color: { r, g, b, a },
      };
    },
    [grid.displayHeight, grid.displayWidth, grid.pixelSize]
  );

  const paintPixel = useCallback(
    (pixel: PixelInfo | null) => {
      if (!pixel || !engineRef.current) return;

      engineRef.current.setPixel(pixel.x, pixel.y, color.r, color.g, color.b, color.a);
      engineRef.current.flush();
      onActivePixelChange({
        x: pixel.x,
        y: pixel.y,
        color: { ...color },
      });
    },
    [color, onActivePixelChange]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pixel = getPixelInfoFromEvent(event);
      if (!pixel) return;

      if (event.button === 2) {
        event.preventDefault();
        onActivePixelChange(pixel);
        return;
      }

      isPaintingRef.current = true;
      paintPixel(pixel);
      onHoverPixel(pixel);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [getPixelInfoFromEvent, onActivePixelChange, onHoverPixel, paintPixel]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pixel = getPixelInfoFromEvent(event);
      onHoverPixel(pixel);

      if (!isPaintingRef.current) return;
      paintPixel(pixel);
    },
    [getPixelInfoFromEvent, onHoverPixel, paintPixel]
  );

  const handlePointerUp = useCallback(() => {
    isPaintingRef.current = false;
  }, []);

  const gridStyle =
    grid.pixelSize > 1
      ? {
          backgroundImage: [
            `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px)`,
            `linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
          ].join(","),
          backgroundSize: `${grid.pixelSize}px ${grid.pixelSize}px`,
        }
      : undefined;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#050816]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => onHoverPixel(null)}
      onContextMenu={(event) => event.preventDefault()}
      style={{ touchAction: "none" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(63,94,251,0.15),_rgba(5,8,22,0.98)_68%)]" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a1026] shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
          style={{ width: grid.displayWidth, height: grid.displayHeight }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 block h-full w-full"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="pointer-events-none absolute inset-0" style={gridStyle} />
        </div>
      </div>
    </div>
  );
}
