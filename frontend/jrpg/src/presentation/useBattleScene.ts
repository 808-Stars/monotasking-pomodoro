import { useEffect, useRef, useState } from "react";
import { advanceOpening, type BattleSceneCheckpoint } from "./battleSceneState.ts";

export function useBattleScene(checkpoint: BattleSceneCheckpoint,
  onCheckpoint?: (checkpoint: BattleSceneCheckpoint) => Promise<void>) {
  const [current,setCurrent] = useState(checkpoint);
  const [error,setError] = useState("");
  const callback = useRef(onCheckpoint);
  callback.current = onCheckpoint;
  const retry = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true, saving = false, failed = false, timer: ReturnType<typeof setTimeout>;
    let latest = checkpoint;
    let stageStart = performance.now();
    const boundaries = [1500,2200,2500];
    let boundary = boundaries.find(value => value > checkpoint.openingElapsedMs) ?? 2500;
    const schedule = () => {
      if (!alive || latest.phase === "main") return;
      timer = setTimeout(() => void step(), Math.max(0,boundary-latest.openingElapsedMs-(performance.now()-stageStart)));
    };
    const step = async () => {
      if (!alive || saving || latest.phase === "main") return;
      saving = true;
      const next = advanceOpening(latest,boundary);
      try {
        await callback.current?.(next);
        if (!alive) return;
        // Each visible stage gets its own clock. Slow storage must not consume
        // the announcement or transition before they have appeared on screen.
        latest = next; stageStart = performance.now(); failed = false;
        setCurrent(next);setError("");
        boundary = boundaries.find(value => value > boundary) ?? 2500;
        schedule();
      } catch (cause) {
        failed = true;
        if (alive) setError(cause instanceof Error ? cause.message : String(cause));
      } finally { saving = false; }
    };
    retry.current = () => { setError("");void step(); };
    const remember = () => {
      if (!alive || saving || failed || latest.phase === "main" || document.visibilityState !== "hidden") return;
      // Never persist a visible phase we have not entered. Boundary writes
      // themselves are awaited by step(), and failures remain explicitly retryable.
      const elapsed = Math.min(boundary-1, latest.openingElapsedMs + performance.now()-stageStart);
      void callback.current?.(advanceOpening(latest,elapsed)).catch(() => {});
    };
    setCurrent(checkpoint);
    schedule();
    document.addEventListener("visibilitychange",remember);
    return () => {alive=false;clearTimeout(timer);document.removeEventListener("visibilitychange",remember);};
    // The caller keys the component by battle ID + stage. Saving a boundary
    // must not restart the same opening while its transaction finishes.
  },[checkpoint.key]);
  return {checkpoint:current,error,retry:() => retry.current()};
}
