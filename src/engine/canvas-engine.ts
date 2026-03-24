export const CANVAS_W = 1000;
export const CANVAS_H = 1000;

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private backBuffer: ImageData;
  private snapshotStack: ImageData[] = [];
  private redoStack: ImageData[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get 2d context");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.backBuffer = this.ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    this.clear("#f0f0ec");
  }

  get context(): CanvasRenderingContext2D {
    return this.ctx;
  }

  get width(): number {
    return CANVAS_W;
  }

  get height(): number {
    return CANVAS_H;
  }

  get imageData(): ImageData {
    return this.backBuffer;
  }

  pushSnapshot() {
    this.snapshotStack.push(
      new ImageData(
        new Uint8ClampedArray(this.backBuffer.data),
        CANVAS_W,
        CANVAS_H
      )
    );
    this.redoStack.length = 0;
    if (this.snapshotStack.length > 100) {
      this.snapshotStack.shift();
    }
  }

  undo(): boolean {
    if (this.snapshotStack.length === 0) return false;
    this.redoStack.push(
      new ImageData(
        new Uint8ClampedArray(this.backBuffer.data),
        CANVAS_W,
        CANVAS_H
      )
    );
    const prev = this.snapshotStack.pop()!;
    this.backBuffer = prev;
    this.flush();
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    this.snapshotStack.push(
      new ImageData(
        new Uint8ClampedArray(this.backBuffer.data),
        CANVAS_W,
        CANVAS_H
      )
    );
    const next = this.redoStack.pop()!;
    this.backBuffer = next;
    this.flush();
    return true;
  }

  clear(color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.backBuffer = this.ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
  }

  flush() {
    this.ctx.putImageData(this.backBuffer, 0, 0);
  }

  syncFromCanvas() {
    this.backBuffer = this.ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
  }

  getPixel(x: number, y: number): [number, number, number, number] {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= CANVAS_W || iy < 0 || iy >= CANVAS_H)
      return [0, 0, 0, 0];
    const i = (iy * CANVAS_W + ix) * 4;
    const d = this.backBuffer.data;
    return [d[i], d[i + 1], d[i + 2], d[i + 3]];
  }

  setPixel(x: number, y: number, r: number, g: number, b: number, a = 255) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= CANVAS_W || iy < 0 || iy >= CANVAS_H) return;
    const i = (iy * CANVAS_W + ix) * 4;
    const d = this.backBuffer.data;
    if (a === 255) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    } else {
      const alpha = a / 255;
      const invAlpha = 1 - alpha;
      d[i] = Math.round(r * alpha + d[i] * invAlpha);
      d[i + 1] = Math.round(g * alpha + d[i + 1] * invAlpha);
      d[i + 2] = Math.round(b * alpha + d[i + 2] * invAlpha);
      d[i + 3] = Math.min(255, d[i + 3] + a);
    }
  }

  getRegion(
    x: number,
    y: number,
    w: number,
    h: number
  ): Uint8ClampedArray {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const sx = x + col;
        const sy = y + row;
        const si = (sy * CANVAS_W + sx) * 4;
        const di = (row * w + col) * 4;
        if (sx >= 0 && sx < CANVAS_W && sy >= 0 && sy < CANVAS_H) {
          data[di] = this.backBuffer.data[si];
          data[di + 1] = this.backBuffer.data[si + 1];
          data[di + 2] = this.backBuffer.data[si + 2];
          data[di + 3] = this.backBuffer.data[si + 3];
        }
      }
    }
    return data;
  }

  exportPNG(): string {
    this.flush();
    return this.canvas.toDataURL("image/png");
  }

  getCanvasForMinimap(): HTMLCanvasElement {
    return this.canvas;
  }
}
