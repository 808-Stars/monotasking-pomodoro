/** Coalesce transient viewport notifications; never put scroll offsets in game state. */
export function createFrameBatch(
  update: () => void,
  frames: {
    request: (callback: FrameRequestCallback) => number;
    cancel: (handle: number) => void;
  } = {
    request: callback => requestAnimationFrame(callback),
    cancel: handle => cancelAnimationFrame(handle),
  },
) {
  let pending: number | null = null;
  let disposed = false;
  return {
    schedule() {
      if (disposed || pending !== null) return;
      pending = frames.request(() => {
        pending = null;
        if (!disposed) update();
      });
    },
    dispose() {
      disposed = true;
      if (pending !== null) frames.cancel(pending);
      pending = null;
    },
  };
}
