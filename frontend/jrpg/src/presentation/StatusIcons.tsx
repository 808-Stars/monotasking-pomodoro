import { useContext, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { isEditingTarget } from "./keyboard.ts";
import type { Unit } from "../game/battle.ts";
import { unitStatusIcons } from "./statusIcons.ts";
import { BattleCanvasContext } from "./BattleCanvasContext.ts";
import { BATTLE_CANVAS_WIDTH, BATTLE_CANVAS_HEIGHT, canvasAnchorBounds } from "./battleCanvas.ts";
import { createFrameBatch } from "./frameBatch.ts";
import "./status-icons.css";
import { BattlePages } from "./BattlePages.tsx";

export function StatusIcons({unit,round,placement="readout",collapsible=false,expandedMode="inline"}:{
  unit:Unit;
  round:number;
  placement?:"field"|"readout";
  collapsible?:boolean;
  expandedMode?:"inline"|"popover";
}) {
  const canvas=useContext(BattleCanvasContext);
  const canCollapse=collapsible||placement==="field";
  const usePopover=expandedMode==="popover"||placement==="field";
  const icons=unitStatusIcons(unit,round);
  const listRef=useRef<HTMLDivElement>(null);
  const listId=useId();
  const popoverRef=useRef<HTMLDivElement>(null);
  const toggleRef=useRef<HTMLButtonElement>(null);
  const [popupStyle,setPopupStyle]=useState<CSSProperties>({});
  const [expanded,setExpanded]=useState(false);
  const [rowCount,setRowCount]=useState(Infinity);
  useLayoutEffect(()=>{
    const list=listRef.current;
    if(!canCollapse||!list) return;
    function measure() {
      const style=getComputedStyle(list!);
      const size=parseFloat(style.getPropertyValue("--status-icon-size"))||32;
      const moreWidth=parseFloat(style.getPropertyValue("--status-more-width"))||32;
      const gap=parseFloat(style.columnGap)||0;
      const width=list!.clientWidth;
      const allFit=icons.length*size+Math.max(0,icons.length-1)*gap<=width;
      setRowCount(allFit?icons.length:Math.max(0,Math.floor((width-moreWidth)/(size+gap))));
    }
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(list);
    return ()=>observer.disconnect();
  },[canCollapse,icons.length]);
  const overflow=canCollapse&&icons.length>rowCount;
  const hiddenCount=Math.max(0,icons.length-rowCount);
  const popup=overflow&&expanded&&usePopover;
  useLayoutEffect(()=>{
    if(!popup)return;
    const applyPosition=(next:CSSProperties)=>setPopupStyle(previous=>
      previous.left===next.left&&previous.top===next.top&&previous.width===next.width&&previous.maxHeight===next.maxHeight
        ?previous:next);
    const position=()=>{
      const anchor=toggleRef.current?.getBoundingClientRect();
      if(!anchor)return;
      if(canvas) {
        if(!canvas.element||canvas.scale<=0)return;
        const bounds=canvasAnchorBounds(anchor,canvas.element.getBoundingClientRect(),canvas.rotation,canvas.scale);
        const width=280,height=204;
        applyPosition({left:Math.max(8,Math.min(bounds.left,BATTLE_CANVAS_WIDTH-width-8)),
          top:bounds.bottom+height+8>BATTLE_CANVAS_HEIGHT?Math.max(8,bounds.top-height-8):bounds.bottom+8,
          width,maxHeight:BATTLE_CANVAS_HEIGHT-16});
        return;
      }
      const width=Math.min(280,window.innerWidth-16),height=204;
      applyPosition({left:Math.max(8,Math.min(anchor.left,window.innerWidth-width-8)),
        top:anchor.bottom+height+8>window.innerHeight ? Math.max(8,anchor.top-height-8) : anchor.bottom+8,
        width,maxHeight:window.innerHeight-16});
    };
    const frame=createFrameBatch(position);
    const onScroll=(event:Event)=>{
      // Only an outer page moving can move the anchor; the popover has no scrollport.
      if(event.target instanceof Node&&popoverRef.current?.contains(event.target))return;
      frame.schedule();
    };
    position();
    window.addEventListener("resize",frame.schedule);
    window.addEventListener("scroll",onScroll,{capture:true,passive:true});
    return ()=>{
      window.removeEventListener("resize",frame.schedule);
      window.removeEventListener("scroll",onScroll,true);
      frame.dispose();
    };
  },[popup,hiddenCount,canvas?.element,canvas?.rotation,canvas?.scale]);
  useEffect(()=>{
    if(!popup)return;
    popoverRef.current?.querySelector<HTMLElement>('[data-battle-pagination]')?.focus({preventScroll:true});
    const outside=(event:Event)=>{
      const target=event.target as Node;
      if(listRef.current?.contains(target)||popoverRef.current?.contains(target))return;
      event.preventDefault();event.stopImmediatePropagation();
      // Keep this listener through pointer-up so the matching click is swallowed.
      if(event.type==="click") {setExpanded(false);toggleRef.current?.focus({preventScroll:true});}
    };
    const key=(event:KeyboardEvent)=>{
      if(event.key==="Backspace"&&!isEditingTarget(event.target)){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat){setExpanded(false);toggleRef.current?.focus({preventScroll:true});}}
    };
    document.addEventListener("pointerdown",outside,true);document.addEventListener("click",outside,true);
    document.addEventListener("keydown",key,true);
    return ()=>{document.removeEventListener("pointerdown",outside,true);document.removeEventListener("click",outside,true);document.removeEventListener("keydown",key,true);};
  },[popup]);
  const renderIcon=(icon:typeof icons[number],index:number,hidden=false)=><span key={icon.key} className="unit-status-icon"
    hidden={hidden} role="listitem" tabIndex={hidden?-1:0} title={icon.label} aria-label={icon.label}
    data-status-key={icon.key} data-status-icon={icon.icon} data-status-index={index}>
    <img src={icon.src} alt="" width={32} height={32} draggable={false}/>
    {icon.tag&&<small className="status-icon-tag" aria-hidden="true">{icon.tag}</small>}
    {icon.count!==undefined&&<b className="status-icon-count" aria-hidden="true">{icon.count}</b>}
  </span>;
  const remainingRows=()=>Array.from({length:Math.ceil(hiddenCount/8)},(_,row)=><div className="unit-status-icons" role="list" key={row}>
    {icons.slice(rowCount+row*8,rowCount+(row+1)*8).map((icon,index)=>renderIcon(icon,rowCount+row*8+index))}
  </div>);
  if(!icons.length) return null;
  return <div ref={listRef} id={listId} className={`unit-status-icons status-icons-${placement}`}
    data-status-unit={unit.id} aria-label={`${unit.name}当前状态`} role="list">
    {icons.map((icon,index)=>overflow&&index>=rowCount ? null : renderIcon(icon,index))}
    {overflow && <span className="status-icons-toggle-slot" role="listitem">
      <button ref={toggleRef} type="button" className="status-icons-toggle" aria-expanded={expanded} aria-controls={popup?`${listId}-popup`:listId}
        aria-label={expanded?`收起${unit.name}的状态`:`展开${unit.name}的全部状态（另${hiddenCount}个）`}
        title={expanded?"收起状态":"展开其余状态"} onClick={()=>setExpanded(value=>!value)}>
        {expanded?<span aria-hidden="true">▲</span>:`+${hiddenCount}`}
      </button>
    </span>}
    {overflow&&expanded&&!usePopover&&<div className="battle-status-inline-pages" role="listitem">
      <BattlePages label={`${unit.name}其余状态`} limit={2} resetKey={unit.id}>{remainingRows()}</BattlePages>
    </div>}
    {popup&&typeof document!=="undefined"&&(!canvas||canvas.element)&&createPortal(<div ref={popoverRef} id={`${listId}-popup`}
      className="battle battle-status-popover battle-status-paged" style={popupStyle} role="region" aria-label={`${unit.name}其余状态`}>
      <p>{unit.name} · 其余状态</p>
      <BattlePages label={`${unit.name}其余状态`} limit={2} resetKey={unit.id}>{remainingRows()}</BattlePages>
    </div>,canvas?.element??document.fullscreenElement??document.body)}
  </div>;
}
