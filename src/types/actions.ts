export interface Point {
  x: number;
  y: number;
}

export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ComposeAction =
  | { type: "clearCanvas"; color: RGBAColor }
  | {
      type: "fillRegion";
      x: number;
      y: number;
      w: number;
      h: number;
      color: RGBAColor;
    }
  | {
      type: "pixelLine";
      from: Point;
      to: Point;
      color: RGBAColor;
      width: number;
      jitter: number;
      density: number;
    }
  | {
      type: "pixelSpray";
      points: Point[];
      color: RGBAColor;
      size: number;
      opacity: number;
      scatter: number;
      density: number;
    };

export type MutateAction =
  | { type: "setPixel"; x: number; y: number; color: RGBAColor }
  | {
      type: "pixelBrush";
      points: Point[];
      color: RGBAColor;
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
  source: "agent" | "human";
}
