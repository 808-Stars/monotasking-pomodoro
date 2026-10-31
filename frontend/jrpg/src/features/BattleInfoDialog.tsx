import { isValidElement, useContext, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { isEditingTarget } from "../presentation/keyboard.ts";
import { BattleCanvasContext } from "../presentation/BattleCanvasContext.ts";
import { BattlePages } from "../presentation/BattlePages.tsx";
import { BattleLog } from "../presentation/BattleLog.tsx";

/** A read-only overlay: opening or closing it never pauses the director. */
export function BattleInfoDialog({title,onClose,children}: {title:string;onClose:()=>void;children:ReactNode}) {
  const canvas=useContext(BattleCanvasContext);
  const dialog=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
  const action=useRef(onClose);action.current=onClose;
  useEffect(()=>{
    const opener=document.activeElement as HTMLElement|null;
    (dialog.current?.querySelector<HTMLElement>('[data-battle-pagination]')??close.current)?.focus({preventScroll:true});
    const key=(event:KeyboardEvent)=>{
      if(event.key==="Backspace"&&!isEditingTarget(event.target)) {event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)action.current();}
      if(event.key==="Tab") {
        const items=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"],a[href]')??[])
          .filter(item=>!item.closest('[hidden],[inert]'));
        if(!items.length)return;
        if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus();}
        else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}
      }
    };
    document.addEventListener("keydown",key,true);
    return ()=>{document.removeEventListener("keydown",key,true);if(opener?.isConnected)opener.focus();};
  },[]);
  const content=<div className="battle-card-detail" onClick={event=>{
    if(event.target===event.currentTarget){event.preventDefault();event.stopPropagation();onClose();}
  }}>
    <article ref={dialog} className="battle-info-paged" role="dialog" aria-modal="true" aria-label={title}>
      <button ref={close} className="detail-close" onClick={onClose} aria-label={`关闭${title}`}>关闭</button>
      <h2>{title}</h2>{isValidElement(children)&&children.type===BattleLog?children:
        <BattlePages label={title} resetKey={title}>{children}</BattlePages>}
    </article>
  </div>;
  if(typeof document==="undefined")return content;
  if(canvas)return canvas.element?createPortal(content,canvas.element):null;
  return createPortal(content,document.fullscreenElement??document.body);
}
