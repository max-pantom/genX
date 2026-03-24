import type { Viewport } from "../types/canvas";

export function fitToScreen(
  containerW: number,
  containerH: number,
  canvasW: number,
  canvasH: number
): Viewport {
  const zoom = 1;
  return {
    offsetX: (containerW - canvasW) / 2,
    offsetY: (containerH - canvasH) / 2,
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
  const newZoom = Math.max(0.4, Math.min(20, viewport.zoom * factor));
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
  containerH: number,
  canvasW: number,
  canvasH: number
): Viewport {
  const canvasScreenW = canvasW * viewport.zoom;
  const canvasScreenH = canvasH * viewport.zoom;
  const margin = 100;

  let { offsetX, offsetY } = viewport;
  offsetX = Math.max(-canvasScreenW + margin, Math.min(containerW - margin, offsetX));
  offsetY = Math.max(-canvasScreenH + margin, Math.min(containerH - margin, offsetY));

  return { ...viewport, offsetX, offsetY };
}
