import { isValidElement, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { commandBranches, commandKeyAction, nextCommandIndex, type CommandBranch, type CommandMenuState } from "./battleCommandMenu.ts";
import { isEditingTarget } from "./keyboard.ts";
import { CommandMenuChrome } from "./CommandMenuChrome.tsx";
import { BattlePages, battlePageItems, type BattlePagesHandle } from "./BattlePages.tsx";

// Break only presentation containers into complete rows. BP steppers and labels stay atomic.
function commandRows(content:ReactNode):ReactNode[] {
  return battlePageItems(content).flatMap(child=>isValidElement<{className?:string;children?:ReactNode}>(child)
    &&["actor-command-controls","command-special-controls"].includes(child.props.className??"")
    ?commandRows(child.props.children):[child]);
}

export function BattleCommandMenu({menu,locked,pp,onEnter,onBack,onAdjustBP,options,details}:{
  menu:CommandMenuState;locked:boolean;pp:number;
  onEnter:(branch:CommandBranch)=>void;onBack:()=>void;
  onAdjustBP?:(delta:-1|1)=>void;
  options:ReactNode;details:ReactNode;
}) {
  const nav=useRef<HTMLElement>(null);
  const pages=useRef<BattlePagesHandle>(null);
  const selected=useRef<HTMLElement|null>(null);
  const actions=useRef({onBack,onAdjustBP});actions.current={onBack,onAdjustBP};
  const choices=()=>Array.from(nav.current?.querySelectorAll<HTMLButtonElement>(
    '.battle-page-entry > button:not(:disabled)',
  )??[]);
  useLayoutEffect(()=>{
    selected.current=null;
    if(!locked){const first=choices()[0];if(first)pages.current?.reveal(first);}
  },[menu.owner,menu.branch,menu.chosen,locked]);
  useEffect(()=>{
    if(locked)return;
    const keydown=(event:KeyboardEvent)=>{
      if(event.defaultPrevented||event.isComposing||event.altKey||event.ctrlKey||event.metaKey)return;
      const target=event.target instanceof Element?event.target:null;
      if(isEditingTarget(event.target)||target?.closest('[role="dialog"],.battle-status-popover'))return;
      if(target?.closest('[data-battle-pagination]')&&!nav.current?.contains(target))return;
      const action=commandKeyAction(event.key);
      if(!action)return;
      if(action==="confirm"&&target?.closest("button,a")&&!nav.current?.contains(target))return;
      // Pager controls use the browser's native Enter / Space activation.
      if(action==="confirm"&&target?.closest('.battle-page-controls'))return;
      if(action==="confirm"&&target?.closest('.command-bp-stepper button'))return;
      // Let the read-only dialogs retain their own keyboard and focus handling.
      if(document.querySelector('.battle-card-detail [role="dialog"]'))return;
      event.preventDefault();event.stopPropagation();
      if(event.repeat&&(action==="confirm"||action==="back"))return;
      if(action==="back"){if(menu.branch)actions.current.onBack();return;}
      if(action==="decrease-bp"||action==="increase-bp"){
        actions.current.onAdjustBP?.(action==="decrease-bp"?-1:1);return;
      }
      const buttons=choices();
      const active=document.activeElement;
      const activeIndex=buttons.findIndex(button=>button===active);
      const current=activeIndex>=0?activeIndex:buttons.findIndex(button=>button===selected.current&&!button.closest('[hidden]'));
      if(action==="previous"||action==="next"){
        const index=nextCommandIndex(current,action==="previous"?-1:1,buttons.length);
        if(buttons[index]){selected.current=buttons[index];pages.current?.reveal(buttons[index]);}
      }else{
        const activeButton=active instanceof HTMLButtonElement&&nav.current?.contains(active)?active:null;
        const visible=buttons.filter(button=>!button.closest('[hidden]'));
        (activeButton&&buttons.includes(activeButton)?activeButton:buttons[current]??visible[0])?.click();
      }
    };
    window.addEventListener("keydown",keydown);
    return ()=>window.removeEventListener("keydown",keydown);
  },[locked,menu.owner,menu.branch,menu.chosen]);
  return <nav ref={nav} className="actor-command-menu battle-command-paged" aria-label="战斗指令" data-command-branch={menu.branch ?? "root"}
    onFocusCapture={event=>{if(choices().includes(event.target as HTMLButtonElement))selected.current=event.target as HTMLElement;}}>
    <CommandMenuChrome title={menu.chosen ? "确认行动" : menu.branch ? commandBranches.find(([branch])=>branch===menu.branch)?.[1] ?? "战斗指令" : "战斗指令"}
      detail={menu.chosen} canBoost={menu.branch !== "item"} />
    <fieldset disabled={locked}>
    <BattlePages ref={pages} label="战斗指令" limit={6} disabled={locked} resetKey={`${menu.owner}:${menu.branch}:${menu.chosen}`}>
    {menu.branch===null ? commandBranches.map(([branch,label])=><button key={branch} type="button"
        disabled={locked||(branch==="pp"&&pp<100)}
        title={branch==="pp"&&pp<100?`PP ${Math.floor(pp)}/100，满槽后可选`:undefined}
        onClick={()=>{if(!locked)onEnter(branch);}}>
        <span className="command-entry-label">{label}</span>
      </button>) : <>
      {commandRows(menu.chosen?details:options)}
      <button type="button" className="command-back" onClick={onBack}>返回</button>
    </>}
    </BattlePages>
    </fieldset>
  </nav>;
}
