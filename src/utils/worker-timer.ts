const workerCode = `
  const timers = new Map();
  self.onmessage = (e) => {
    if (e.data.cmd === "set") {
      timers.set(e.data.id, setTimeout(() => {
        timers.delete(e.data.id);
        self.postMessage(e.data.id);
      }, e.data.ms));
    } else if (e.data.cmd === "clear") {
      const t = timers.get(e.data.id);
      if (t != null) { clearTimeout(t); timers.delete(e.data.id); }
    }
  };
`;

const blob = new Blob([workerCode], { type: "application/javascript" });
const worker = new Worker(URL.createObjectURL(blob));

const callbacks = new Map<number, () => void>();
let nextId = 0;

worker.onmessage = (e: MessageEvent<number>) => {
  const cb = callbacks.get(e.data);
  if (cb) {
    callbacks.delete(e.data);
    cb();
  }
};

export function setWorkerTimeout(callback: () => void, ms: number): number {
  const id = ++nextId;
  callbacks.set(id, callback);
  worker.postMessage({ cmd: "set", id, ms });
  return id;
}

export function clearWorkerTimeout(id: number) {
  callbacks.delete(id);
  worker.postMessage({ cmd: "clear", id });
}
