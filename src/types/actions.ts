export interface Point {
  x: number;
  y: number;
}

export type ComposeAction =
  | { type: "fillCanvas"; color: string }
  | { type: "drawLine"; from: Point; to: Point; color: string; width: number }
  | {
      type: "drawRect";
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      fill: boolean;
    }
  | {
      type: "drawCircle";
      x: number;
      y: number;
      radius: number;
      color: string;
      fill: boolean;
    }
  | {
      type: "brushStroke";
      points: Point[];
      color: string;
      size: number;
      opacity: number;
    }
  | { type: "erase"; points: Point[]; size: number };

export type MutateAction =
  | { type: "setPixel"; x: number; y: number; color: string }
  | {
      type: "pixelBrush";
      points: Point[];
      color: string;
      size: number;
      opacity: number;
      scatter: number;
    }
  | {
      type: "noiseRegion";
      x: number;
      y: number;
      w: number;
      h: number;
      amount: number;
      monochrome: boolean;
    }
  | {
      type: "smearRegion";
      x: number;
      y: number;
      w: number;
      h: number;
      angle: number;
      strength: number;
    }
  | {
      type: "ditherRegion";
      x: number;
      y: number;
      w: number;
      h: number;
      level: number;
    }
  | {
      type: "colorShift";
      x: number;
      y: number;
      w: number;
      h: number;
      hueShift: number;
      satShift: number;
      lightShift: number;
    }
  | {
      type: "glitchRegion";
      x: number;
      y: number;
      w: number;
      h: number;
      intensity: number;
    }
  | {
      type: "decayRegion";
      x: number;
      y: number;
      w: number;
      h: number;
      amount: number;
    };

export type CanvasAction = ComposeAction | MutateAction;

export interface ActionRecord {
  id: string;
  action: CanvasAction;
  timestamp: number;
  mode: "compose" | "mutate";
  source: "agent" | "human";
}
