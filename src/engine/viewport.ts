import type { Viewport } from "../types/canvas";
import { CANVAS_W, CANVAS_H } from "./canvas-engine";

export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: Viewport
): { x: number; y: number } {
  return {
    x: (screenX - viewport.offsetX) / viewport.zoom,
    y: (screenY - viewport.offsetY) / viewport.zoom,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: Viewport
): { x: number; y: number } {
  return {
    x: canvasX * viewport.zoom + viewport.offsetX,
    y: canvasY * viewport.zoom + viewport.offsetY,
  };
}

export function fitToScreen(
  containerW: number,
  containerH: number,
  padding = 40
): Viewport {
  const scaleX = (containerW - padding * 2) / CANVAS_W;
  const scaleY = (containerH - padding * 2) / CANVAS_H;
  const zoom = Math.min(scaleX, scaleY);
  return {
    offsetX: (containerW - CANVAS_W * zoom) / 2,
    offsetY: (containerH - CANVAS_H * zoom) / 2,
    zoom,
  };
}

export function zoomAt(
  viewport: Viewport,
  screenX: number,
  screenY: number,
  delta: number
): Viewport {
  const factor = delta > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.1, Math.min(20, viewport.zoom * factor));
  const ratio = newZoom / viewport.zoom;
  return {
    zoom: newZoom,
    offsetX: screenX - (screenX - viewport.offsetX) * ratio,
    offsetY: screenY - (screenY - viewport.offsetY) * ratio,
  };
}

export function clampViewport(
  viewport: Viewport,
  containerW: number,
  containerH: number
): Viewport {
  const canvasScreenW = CANVAS_W * viewport.zoom;
  const canvasScreenH = CANVAS_H * viewport.zoom;
  const margin = 100;

  let { offsetX, offsetY } = viewport;
  offsetX = Math.max(-canvasScreenW + margin, Math.min(containerW - margin, offsetX));
  offsetY = Math.max(-canvasScreenH + margin, Math.min(containerH - margin, offsetY));

  return { ...viewport, offsetX, offsetY };
}
