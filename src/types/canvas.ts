export type Mode = "compose" | "mutate";

export type ComposeTool =
  | "brush"
  | "line"
  | "rectangle"
  | "circle"
  | "fill"
  | "erase";

export type MutateTool =
  | "pixelBrush"
  | "noise"
  | "smear"
  | "dither"
  | "colorShift"
  | "glitch"
  | "decay";

export type Tool = ComposeTool | MutateTool;

export interface Viewport {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface BrushSettings {
  size: number;
  opacity: number;
  color: string;
}

export interface Palette {
  colors: string[];
  activeIndex: number;
}
