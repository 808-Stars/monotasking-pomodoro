import { Children, Fragment, forwardRef, isValidElement, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { battlePageForItem, boundedBattlePage, packBattlePages } from "./battlePagination.ts";
import { isEditingTarget } from "./keyboard.ts";
import "./battle-pagination.css";

export function battlePageItems(children:ReactNode):ReactNode[] {
  return Children.toArray(children).flatMap(child=>isValidElement<{children?:ReactNode}>(child)&&child.type===Fragment
    ?battlePageItems(child.props.children):[child]);
}

export interface BattlePagesHandle { reveal:(element:HTMLElement)=>void }

/** Measures whole entries in layout coordinates (also works inside the scaled battle canvas).
 * Inactive pages use hidden, so their controls cannot receive Tab or pointer focus. */
export const BattlePages=forwardRef<BattlePagesHandle,{
  children:ReactNode;label:string;limit?:number;resetKey?:string;disabled?:boolean;
  splitOversized?:(item:ReactNode,element:HTMLElement,capacity:number)=>ReactNode[]|null;
}>(function BattlePages({children,label,limit=Infinity,resetKey="",disabled=false,splitOversized},ref) {
  const root=useRef<HTMLDivElement>(null),viewport=useRef<HTMLDivElement>(null);
  const [page,setPage]=useState(0);
  const [layout,setLayout]=useState({pages:[{start:0,end:1}],scales:[] as number[]});
  const pendingFocus=useRef<HTMLElement|null>(null);
  const [split,setSplit]=useState<{source:ReactNode;items:ReactNode[]}|null>(null);
  const items=split&&split.source===children?split.items:battlePageItems(children);
  const current=boundedBattlePage(page,layout.pages.length);
  const range=layout.pages[current];
  useImperativeHandle(ref,()=>({reveal(element) {
    const item=element.closest<HTMLElement>('[data-battle-page-item]');
    if(!item)return;
    pendingFocus.current=element;
    setPage(battlePageForItem(layout.pages,Number(item.dataset.battlePageItem)));
    if(!item.hidden){element.focus({preventScroll:true});pendingFocus.current=null;}
  }}),[layout.pages]);
  useLayoutEffect(()=>{setPage(0);},[resetKey]);
  useLayoutEffect(()=>{
    const view=viewport.current;
    if(!view)return;
    const measure=()=>{
      const capacity=view.clientHeight;
      if(!capacity)return;
      const entries=Array.from(view.children) as HTMLElement[];
      // Restore the rendered visibility synchronously; no hidden page is exposed to input.
      const previous=entries.map(entry=>entry.hidden);
      entries.forEach(entry=>{entry.hidden=false;});
      const heights=entries.map(entry=>(entry.firstElementChild as HTMLElement).offsetHeight);
      let nextItems:ReactNode[]|null=null;
      if(splitOversized) {
        let changed=false;
        const parts=items.flatMap((item,index)=>{
          if(heights[index]<=capacity)return [item];
          const parts=splitOversized(item,entries[index].firstElementChild as HTMLElement,capacity);
          if(!parts||parts.length<2)return [item];
          changed=true;return parts;
        });
        if(changed)nextItems=parts;
      }
      entries.forEach((entry,index)=>{entry.hidden=previous[index];});
      if(nextItems){setSplit({source:children,items:nextItems});return;}
      const gap=parseFloat(getComputedStyle(view).rowGap)||0;
      const next={pages:packBattlePages(heights,capacity,limit,gap),scales:heights.map(height=>Math.min(1,capacity/Math.max(1,height)))};
      const active=document.activeElement?.closest<HTMLElement>('[data-battle-page-item]');
      if(active?.parentElement===view)setPage(battlePageForItem(next.pages,Number(active.dataset.battlePageItem)));
      setLayout(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
    };
    measure();
    const observer=new ResizeObserver(measure);observer.observe(view);
    Array.from(view.children).forEach(entry=>{if(entry.firstElementChild)observer.observe(entry.firstElementChild);});
    return ()=>observer.disconnect();
  },[children,limit,split,splitOversized]);
  useLayoutEffect(()=>{
    const focus=pendingFocus.current;
    if(focus&&!focus.closest('[hidden]')){focus.focus({preventScroll:true});pendingFocus.current=null;}
    else if(root.current?.contains(document.activeElement)&&document.activeElement?.closest('[hidden]'))root.current.focus({preventScroll:true});
  },[current,layout]);
  const move=(delta:number)=>{
    const next=boundedBattlePage(current+delta,layout.pages.length);
    if(next===current)return;
    const item=viewport.current?.children[layout.pages[next].start];
    pendingFocus.current=item?.querySelector<HTMLElement>('button:not(:disabled),[tabindex="0"],a[href],select:not(:disabled)')??root.current;
    setPage(next);
  };
  return <div ref={root} className="battle-pages" data-battle-pagination={label} tabIndex={0} role="region" aria-label={label}
    onKeyDown={event=>{
      if(event.defaultPrevented||event.nativeEvent.isComposing||event.altKey||event.ctrlKey||event.metaKey||isEditingTarget(event.target))return;
      if(event.key!=="PageUp"&&event.key!=="PageDown")return;
      // A nested pager owns its own keys.
      if((event.target as Element).closest('[data-battle-pagination]')!==event.currentTarget)return;
      event.preventDefault();event.stopPropagation();if(!disabled)move(event.key==="PageUp"?-1:1);
    }}>
    <div ref={viewport} className="battle-page-viewport">
      {items.map((item,index)=><div key={`${index}:${isValidElement(item)?item.key??"":""}`} data-battle-page-item={index}
        hidden={index<range.start||index>=range.end} className="battle-page-item"
        style={layout.scales[index]<1?{height:`${viewport.current?.clientHeight??0}px`,overflow:"clip"}:undefined}>
        <div className="battle-page-entry" style={layout.scales[index]<1?{transform:`scale(${layout.scales[index]})`}:undefined}>{item}</div>
      </div>)}
    </div>
    <div className="battle-page-controls" role="group" aria-label={`${label}翻页`}>
      <button type="button" disabled={disabled||current===0} onClick={()=>move(-1)} aria-label={`${label}上一页`}>上一页</button>
      <span role="status" aria-live="polite">{current+1} / {layout.pages.length}</span>
      <button type="button" disabled={disabled||current===layout.pages.length-1} onClick={()=>move(1)} aria-label={`${label}下一页`}>下一页</button>
      <small>PgUp / PgDn</small>
    </div>
  </div>;
});
