import { useEffect, useRef, useState } from "react";
import type { BattleState, VisualEvent } from "../game/battle.ts";
import { createPlaybackSession, type TheatreFrame } from "./battlePlayback.ts";
import { reduceBattleFocus, type BattleFocus } from "./battleFocus.ts";
import type { PlaybackOptions } from "./battlePlayback.ts";

export type BattleLayoutGate = (focusId: string | null, signal: AbortSignal) => Promise<void>;

/** No persistence. The caller commits the resolved battle before playback. */
export function useBattleDirector() {
  const [frame,setFrame] = useState<TheatreFrame|null>(null);
  const [focus,setFocus] = useState<BattleFocus>({rootActorId:null,reactionActorId:null});
  const generation = useRef(0);
  const session = useRef<ReturnType<typeof createPlaybackSession>|null>(null);
  useEffect(() => {
    const active=createPlaybackSession(setFrame);session.current=active;
    return ()=>{generation.current++;active.dispose();};
  },[]);
  function hold(before: BattleState) {
    const actorId = before.party.find(unit => unit.id === before.current[0]?.unitId)?.id ?? null;
    setFocus({rootActorId:actorId,reactionActorId:null});
    setFrame({state:before,beat:{events:[],duration:0},index:-1});
  }
  async function play(before: BattleState, events: VisualEvent[], options?:PlaybackOptions & {onFocus?:BattleLayoutGate;nextFocusId?:string|null}) {
    const version = ++generation.current;
    let active: BattleFocus = {rootActorId:before.party.find(unit => unit.id === before.current[0]?.unitId)?.id ?? null,reactionActorId:null};
    setFocus(active);
    try {
      const completed = await session.current?.play(before,events,{beforeBeat:async(beat,index,signal)=>{
        if (beat.reactionOf && before.party.some(unit => unit.id === beat.source)) {
          active=reduceBattleFocus(active,{type:"reaction",actorId:beat.source!});
        } else if (beat.events.some(event => event.type === "SkillStart") && !beat.reactionOf) {
          active=reduceBattleFocus(active,{type:"return"});
        }
        setFocus(active);
        await options?.onFocus?.(active.reactionActorId ?? active.rootActorId,signal);
        await options?.beforeBeat?.(beat,index,signal);
        if (beat.reactionEnd) active=reduceBattleFocus(active,{type:"return"});
      },afterPlayback:async signal=>{
        if(signal.aborted)return;
        setFocus({rootActorId:options?.nextFocusId ?? null,reactionActorId:null});
        await options?.onFocus?.(options?.nextFocusId ?? null,signal);
        if(!signal.aborted)await options?.afterPlayback?.(signal);
      }});
      return !!completed && generation.current===version;
    } finally {
      if (generation.current===version) {setFrame(null);setFocus({rootActorId:null,reactionActorId:null});}
    }
  }
  function clear() {
    generation.current++;session.current?.cancel();setFrame(null);
    setFocus({rootActorId:null,reactionActorId:null});
  }
  return {frame,focus,hold,clear,play};
}
