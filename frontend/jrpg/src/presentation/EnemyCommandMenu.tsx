import { useEffect, useLayoutEffect, useRef } from "react";
import { isConfirmKey, isEditingTarget } from "./keyboard.ts";
import { CommandMenuChrome } from "./CommandMenuChrome.tsx";

/** One explicit enemy action, using the player command menu's visual language. */
export function EnemyCommandMenu({intent,locked,onExecute}:{intent:string;locked:boolean;onExecute:()=>void}) {
  const nav=useRef<HTMLElement>(null);
  const execute=useRef(onExecute);execute.current=onExecute;
  useLayoutEffect(()=>{
    if(!locked&&!document.querySelector('.battle-card-detail [role="dialog"]'))
      nav.current?.querySelector<HTMLButtonElement>("button")?.focus({preventScroll:true});
  },[locked]);
  useEffect(()=>{
    if(locked)return;
    const key=(event:KeyboardEvent)=>{
      if(!isConfirmKey(event.key)||event.defaultPrevented||event.isComposing||event.ctrlKey||event.altKey||event.metaKey)return;
      const target=event.target instanceof Element?event.target:null;
      if(isEditingTarget(event.target)||target?.closest('[role="dialog"],.battle-status-popover'))return;
      if(document.querySelector('.battle-card-detail [role="dialog"]'))return;
      if(target?.closest("button,a")&&!nav.current?.contains(target))return;
      event.preventDefault();event.stopPropagation();
      if(!event.repeat)execute.current();
    };
    window.addEventListener("keydown",key);
    return ()=>window.removeEventListener("keydown",key);
  },[locked]);
  return <nav ref={nav} className="actor-command-menu enemy-command-menu" aria-label="敌方行动指令">
    <CommandMenuChrome title="敌方行动" enemy />
    <fieldset disabled={locked}><div className="actor-command-options">
      <button type="button" disabled={locked} onClick={()=>{if(!locked)onExecute();}}>执行 {intent}</button>
    </div></fieldset>
  </nav>;
}
