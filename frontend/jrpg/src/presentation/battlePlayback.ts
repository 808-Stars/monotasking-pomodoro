import { presentEvent } from "./motion.ts";
import type { BattleState } from "../game/battle.ts";
import type { BattleBeat } from "./battleBeats.ts";
import { buildBattleBeats } from "./battleBeats.ts";
import type { VisualEvent } from "../game/battle.ts";
export interface PlaybackOptions {
  beforeBeat?: (beat: BattleBeat, index: number, signal: AbortSignal) => Promise<void>;
  afterPlayback?: (signal: AbortSignal) => Promise<void>;
}
export function createPlaybackSession(publish:(frame:TheatreFrame|null)=>void) {
  let alive=true,controller:AbortController|null=null;
  return {
    async play(before:BattleState,events:VisualEvent[],options?:PlaybackOptions|number,_legacyReduced?:boolean) {
      if(!alive) return false;
      controller?.abort();
      const active=new AbortController();controller=active;
      try {
        await playBattleBeats(before,buildBattleBeats(events,1,false),publish,active.signal,
          typeof options === "object" ? options : undefined);
        if (!active.signal.aborted && typeof options === "object") await options.afterPlayback?.(active.signal);
        return alive && controller === active && !active.signal.aborted;
      } finally {
        if(alive&&controller===active&&!active.signal.aborted) publish(null);
      }
    },
    dispose() {alive=false;controller?.abort();},
    cancel() {controller?.abort();},
  };
}
export interface TheatreFrame { state: BattleState; beat: BattleBeat; index: number }
export function snapshotAtBeat(before:BattleState, beats:readonly BattleBeat[], index:number):BattleState {
  let state=before;
  for(const beat of beats.slice(0,Math.max(0,index+1)))
    for(const event of beat.events) state=presentEvent(state,event);
  return state;
}
export async function playBattleBeats(
  before: BattleState, beats: readonly BattleBeat[],
  publish: (frame: TheatreFrame) => void, signal: AbortSignal,
  options?: PlaybackOptions,
): Promise<void> {
  let state = before;
  for (const [index, beat] of beats.entries()) {
    if (signal.aborted) return;
    if (options?.beforeBeat) {
      await new Promise<void>((resolve,reject) => {
        const stop = () => { signal.removeEventListener("abort",stop); resolve(); };
        signal.addEventListener("abort",stop,{once:true});
        Promise.resolve(options.beforeBeat!(beat,index,signal)).then(stop,error => {
          signal.removeEventListener("abort",stop);reject(error);
        });
      });
      if (signal.aborted) return;
    }
    for (const event of beat.events) state = presentEvent(state, event);
    publish({state,beat,index});
    if (signal.aborted) return;
    if (beat.duration > 0) await new Promise<void>(resolve => {
      const done = () => { clearTimeout(timer); signal.removeEventListener("abort",done); resolve(); };
      const timer = setTimeout(done,beat.duration);
      signal.addEventListener("abort",done,{once:true});
    });
  }
}
