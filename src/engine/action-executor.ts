import type { CanvasAction, Point } from "../types/actions";
import { CanvasEngine } from "./canvas-engine";
import { hexToRgb, rgbToHsl, hslToRgb } from "../utils/color";
import { simpleNoise, gaussianRandom } from "../utils/noise";

export function executeAction(engine: CanvasEngine, action: CanvasAction) {
  const ctx = engine.context;

  switch (action.type) {
    case "fillCanvas": {
      engine.clear(action.color);
      break;
    }

    case "setPixel": {
      const [r, g, b] = hexToRgb(action.color);
      engine.setPixel(action.x, action.y, r, g, b);
      engine.flush();
      break;
    }

    case "drawLine": {
      ctx.save();
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(action.from.x, action.from.y);
      ctx.lineTo(action.to.x, action.to.y);
      ctx.stroke();
      ctx.restore();
      engine.syncFromCanvas();
      break;
    }

    case "drawRect": {
      ctx.save();
      if (action.fill) {
        ctx.fillStyle = action.color;
        ctx.fillRect(action.x, action.y, action.w, action.h);
      } else {
        ctx.strokeStyle = action.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(action.x, action.y, action.w, action.h);
      }
      ctx.restore();
      engine.syncFromCanvas();
      break;
    }

    case "drawCircle": {
      ctx.save();
      ctx.beginPath();
      ctx.arc(action.x, action.y, action.radius, 0, Math.PI * 2);
      if (action.fill) {
        ctx.fillStyle = action.color;
        ctx.fill();
      } else {
        ctx.strokeStyle = action.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
      engine.syncFromCanvas();
      break;
    }

    case "brushStroke": {
      if (action.points.length < 2) break;
      ctx.save();
      ctx.strokeStyle = action.color;
      ctx.lineWidth = action.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = action.opacity;
      ctx.beginPath();
      ctx.moveTo(action.points[0].x, action.points[0].y);
      for (let i = 1; i < action.points.length; i++) {
        const prev = action.points[i - 1];
        const curr = action.points[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      const last = action.points[action.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
      engine.syncFromCanvas();
      break;
    }

    case "erase": {
      if (action.points.length < 2) break;
      ctx.save();
      ctx.strokeStyle = "#f0f0ec";
      ctx.lineWidth = action.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(action.points[0].x, action.points[0].y);
      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i].x, action.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
      engine.syncFromCanvas();
      break;
    }

    case "pixelBrush": {
      const [r, g, b] = hexToRgb(action.color);
      const a = Math.round(action.opacity * 255);
      for (const pt of action.points) {
        const half = Math.floor(action.size / 2);
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            if (action.scatter > 0 && Math.random() > 1 - action.scatter)
              continue;
            engine.setPixel(
              Math.floor(pt.x) + dx,
              Math.floor(pt.y) + dy,
              r,
              g,
              b,
              a
            );
          }
        }
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
              x, y,
              Math.max(0, Math.min(255, cr + offset)),
              Math.max(0, Math.min(255, cg + offset)),
              Math.max(0, Math.min(255, cb + offset))
            );
          } else {
            engine.setPixel(
              x, y,
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
            x, y,
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
          const shift = Math.floor(
            (Math.random() - 0.5) * action.w * action.intensity
          );
          for (let x = 0; x < action.w; x++) {
            const sx = ((x + shift) % action.w + action.w) % action.w;
            const si = (y * action.w + sx) * 4;
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

    case "decayRegion": {
      for (let y = action.y; y < action.y + action.h; y++) {
        for (let x = action.x; x < action.x + action.w; x++) {
          if (Math.random() < action.amount * 0.1) {
            const [r, g, b] = engine.getPixel(x, y);
            const decay = 1 - action.amount * 0.3;
            const noise = gaussianRandom() * action.amount * 20;
            engine.setPixel(
              x, y,
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
