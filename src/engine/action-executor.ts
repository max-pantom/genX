import type { CanvasAction, Point, RGBAColor } from "../types/actions";
import { CanvasEngine } from "./canvas-engine";
import { rgbToHsl, hslToRgb } from "../utils/color";
import { simpleNoise, gaussianRandom } from "../utils/noise";

export function executeAction(engine: CanvasEngine, action: CanvasAction) {
  switch (action.type) {
    case "clearCanvas": {
      engine.clear(rgbaToCss(action.color));
      break;
    }

    case "fillRegion": {
      for (let y = action.y; y < action.y + action.h; y++) {
        for (let x = action.x; x < action.x + action.w; x++) {
          engine.setPixel(x, y, action.color.r, action.color.g, action.color.b, action.color.a);
        }
      }
      engine.flush();
      break;
    }

    case "setPixel": {
      engine.setPixel(
        action.x,
        action.y,
        action.color.r,
        action.color.g,
        action.color.b,
        action.color.a
      );
      engine.flush();
      break;
    }

    case "pixelLine": {
      const points = interpolatePoints(action.from, action.to, 1.5);
      for (const point of points) {
        stampPixelCluster(engine, point, action.color, action.width, action.jitter, action.density);
      }
      engine.flush();
      break;
    }

    case "pixelSpray": {
      for (const point of action.points) {
        stampPixelCluster(
          engine,
          point,
          { ...action.color, a: Math.round(action.opacity * action.color.a) },
          action.size,
          action.scatter,
          action.density
        );
      }
      engine.flush();
      break;
    }

    case "pixelBrush": {
      const color = {
        ...action.color,
        a: Math.round(action.opacity * action.color.a),
      };
      for (const point of action.points) {
        stampPixelCluster(engine, point, color, action.size, action.scatter, 0.75);
      }
      engine.flush();
      break;
    }

    case "noiseRegion": {
      const seed = Date.now();
      for (let y = action.y; y < action.y + action.h; y++) {
        for (let x = action.x; x < action.x + action.w; x++) {
          const [cr, cg, cb] = engine.getPixel(x, y);
          const n = simpleNoise(x, y, seed);
          const amount = action.amount * 255;
          if (action.monochrome) {
            const offset = (n - 0.5) * amount;
            engine.setPixel(
              x,
              y,
              Math.max(0, Math.min(255, cr + offset)),
              Math.max(0, Math.min(255, cg + offset)),
              Math.max(0, Math.min(255, cb + offset))
            );
          } else {
            engine.setPixel(
              x,
              y,
              Math.max(0, Math.min(255, cr + (Math.random() - 0.5) * amount)),
              Math.max(0, Math.min(255, cg + (Math.random() - 0.5) * amount)),
              Math.max(0, Math.min(255, cb + (Math.random() - 0.5) * amount))
            );
          }
        }
      }
      engine.flush();
      break;
    }

    case "smearRegion": {
      const dx = Math.cos(action.angle) * action.strength;
      const dy = Math.sin(action.angle) * action.strength;
      const region = engine.getRegion(action.x, action.y, action.w, action.h);
      for (let y = 0; y < action.h; y++) {
        for (let x = 0; x < action.w; x++) {
          const sx = Math.floor(x - dx);
          const sy = Math.floor(y - dy);
          if (sx >= 0 && sx < action.w && sy >= 0 && sy < action.h) {
            const si = (sy * action.w + sx) * 4;
            engine.setPixel(
              action.x + x,
              action.y + y,
              region[si],
              region[si + 1],
              region[si + 2]
            );
          }
        }
      }
      engine.flush();
      break;
    }

    case "ditherRegion": {
      const levels = Math.max(2, action.level);
      const step = 255 / (levels - 1);
      for (let y = action.y; y < action.y + action.h; y++) {
        for (let x = action.x; x < action.x + action.w; x++) {
          const [r, g, b] = engine.getPixel(x, y);
          engine.setPixel(
            x,
            y,
            Math.round(r / step) * step,
            Math.round(g / step) * step,
            Math.round(b / step) * step
          );
        }
      }
      engine.flush();
      break;
    }

    case "colorShift": {
      for (let y = action.y; y < action.y + action.h; y++) {
        for (let x = action.x; x < action.x + action.w; x++) {
          const [r, g, b] = engine.getPixel(x, y);
          let [h, s, l] = rgbToHsl(r, g, b);
          h = (h + action.hueShift) % 1;
          if (h < 0) h += 1;
          s = Math.max(0, Math.min(1, s + action.satShift));
          l = Math.max(0, Math.min(1, l + action.lightShift));
          const [nr, ng, nb] = hslToRgb(h, s, l);
          engine.setPixel(x, y, nr, ng, nb);
        }
      }
      engine.flush();
      break;
    }

    case "glitchRegion": {
      const region = engine.getRegion(action.x, action.y, action.w, action.h);
      for (let y = 0; y < action.h; y++) {
        if (Math.random() < action.intensity * 0.3) {
          const shift = Math.floor((Math.random() - 0.5) * action.w * action.intensity);
          for (let x = 0; x < action.w; x++) {
            const sx = ((x + shift) % action.w + action.w) % action.w;
            const si = (y * action.w + sx) * 4;
            engine.setPixel(action.x + x, action.y + y, region[si], region[si + 1], region[si + 2]);
          }
        }
      }
      engine.flush();
      break;
    }

    case "decayRegion": {
      for (let y = action.y; y < action.y + action.h; y++) {
        for (let x = action.x; x < action.x + action.w; x++) {
          if (Math.random() < action.amount * 0.1) {
            const [r, g, b] = engine.getPixel(x, y);
            const decay = 1 - action.amount * 0.3;
            const noise = gaussianRandom() * action.amount * 20;
            engine.setPixel(
              x,
              y,
              Math.max(0, Math.min(255, r * decay + noise)),
              Math.max(0, Math.min(255, g * decay + noise)),
              Math.max(0, Math.min(255, b * decay + noise))
            );
          }
        }
      }
      engine.flush();
      break;
    }
  }
}

function stampPixelCluster(
  engine: CanvasEngine,
  center: Point,
  color: RGBAColor,
  size: number,
  jitter: number,
  density: number
) {
  const half = Math.floor(size / 2);
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      if (Math.random() > density) continue;
      const jx = (Math.random() - 0.5) * jitter * size;
      const jy = (Math.random() - 0.5) * jitter * size;
      engine.setPixel(
        Math.floor(center.x + dx + jx),
        Math.floor(center.y + dy + jy),
        color.r,
        color.g,
        color.b,
        color.a
      );
    }
  }
}

function rgbaToCss(color: RGBAColor) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.max(0, Math.min(1, color.a / 255))})`;
}

export function interpolatePoints(
  from: Point,
  to: Point,
  spacing: number
): Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.floor(dist / spacing));
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: from.x + dx * t, y: from.y + dy * t });
  }
  return points;
}
