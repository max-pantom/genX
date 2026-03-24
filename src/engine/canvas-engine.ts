export const DISPLAY_PIXEL_SIZE = 2;

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private backBuffer: ImageData;
  private snapshotStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get 2d context");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.backBuffer = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
    this.clear("#f0f0ec");
  }

  get width(): number {
    return this.canvasWidth;
  }

  get height(): number {
    return this.canvasHeight;
  }

  get imageData(): ImageData {
    return this.backBuffer;
  }

  pushSnapshot() {
    this.snapshotStack.push(
      new ImageData(
        new Uint8ClampedArray(this.backBuffer.data),
        this.canvasWidth,
        this.canvasHeight
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
        this.canvasWidth,
        this.canvasHeight
      )
    );
    const prev = this.snapshotStack.pop();
    if (!prev) return false;
    this.backBuffer = prev;
    this.flush();
    return true;
  }

  clear(color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.backBuffer = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
  }

  flush() {
    this.ctx.putImageData(this.backBuffer, 0, 0);
  }

  getPixel(x: number, y: number): [number, number, number, number] {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.canvasWidth || iy < 0 || iy >= this.canvasHeight) {
      return [0, 0, 0, 0];
    }
    const i = (iy * this.canvasWidth + ix) * 4;
    const d = this.backBuffer.data;
    return [d[i], d[i + 1], d[i + 2], d[i + 3]];
  }

  setPixel(x: number, y: number, r: number, g: number, b: number, a = 255) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.canvasWidth || iy < 0 || iy >= this.canvasHeight) return;
    const i = (iy * this.canvasWidth + ix) * 4;
    const d = this.backBuffer.data;
    if (a === 255) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
      return;
    }

    const alpha = a / 255;
    const invAlpha = 1 - alpha;
    d[i] = Math.round(r * alpha + d[i] * invAlpha);
    d[i + 1] = Math.round(g * alpha + d[i + 1] * invAlpha);
    d[i + 2] = Math.round(b * alpha + d[i + 2] * invAlpha);
    d[i + 3] = Math.min(255, d[i + 3] + a);
  }

  getRegion(x: number, y: number, w: number, h: number): Uint8ClampedArray {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const sx = x + col;
        const sy = y + row;
        const di = (row * w + col) * 4;
        if (sx < 0 || sx >= this.canvasWidth || sy < 0 || sy >= this.canvasHeight) continue;
        const si = (sy * this.canvasWidth + sx) * 4;
        data[di] = this.backBuffer.data[si];
        data[di + 1] = this.backBuffer.data[si + 1];
        data[di + 2] = this.backBuffer.data[si + 2];
        data[di + 3] = this.backBuffer.data[si + 3];
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
