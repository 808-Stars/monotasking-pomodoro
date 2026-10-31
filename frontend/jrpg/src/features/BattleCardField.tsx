import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import type { Unit } from "../game/battle.ts";
import { alignCommandCombatants, cardLayoutMetrics, emphasizeCards, HERO_STATUS_WIDTH, HERO_STATUS_HEIGHT, layoutCards, layoutCardReadouts, layoutCommandPanel, spreadRestingColumn, widenBattleCenter } from "../presentation/battleCardLayout.ts";
import { portraitSource } from "../presentation/battlePortraits.ts";
import type { bossAppearance } from "../presentation/enemyArt.ts";
import type { BattleLayoutGate } from "../presentation/useBattleDirector.ts";
import { isConfirmKey } from "../presentation/keyboard.ts";

export function BattleCardField({party,enemies,appearance,focusId,waitingId,selectedTarget,legalTargets,
  inputReady,highlightedId,onHighlight,onSelect,onMoving,gateRef,feedback,status,commands,enemyCommands,enemyCommandId,feedbackToken,hitIds,evadeIds,actingId,supportAction,children}: {
  party: Unit[]; enemies: Unit[]; appearance: ReturnType<typeof bossAppearance>;
  focusId: string|null; waitingId: string|null; selectedTarget?: string; legalTargets: readonly string[];
  inputReady: boolean; highlightedId: string|null; onHighlight:(id:string|null)=>void;
  onSelect:(id:string)=>void; onMoving:(moving:boolean)=>void;
  gateRef?: MutableRefObject<BattleLayoutGate|null>;
  feedback:(unit:Unit)=>ReactNode; feedbackToken:string;hitIds:readonly string[]; evadeIds:readonly string[]; actingId?:string;
  status:(unit:Unit)=>ReactNode;
  commands?:ReactNode;
  enemyCommands?:ReactNode;enemyCommandId?:string;
  supportAction?:boolean;
  children?:ReactNode;
}) {
  const field=useRef<HTMLDivElement>(null);
  const commandWidth=useRef(238);
  const [size,setSize]=useState({width:1280,height:400});
  const [forced,setForced]=useState<string|null|undefined>(undefined);
  const shownFocus=forced === undefined ? focusId : forced;
  const wanted=useRef(shownFocus);wanted.current=shownFocus;
  const moving=useRef(false), waiters=useRef(new Set<()=>void>());
  const onMovingRef=useRef(onMoving);onMovingRef.current=onMoving;
  const measure=()=>{
    const viewport=field.current;
    if(viewport && viewport.clientWidth>0 && viewport.clientHeight>0)
      setSize(old=>old.width===viewport.clientWidth&&old.height===viewport.clientHeight ? old : {width:viewport.clientWidth,height:viewport.clientHeight});
  };
  useLayoutEffect(()=>{
    measure();
    if (!field.current) return;
    const observer=new ResizeObserver(measure);observer.observe(field.current);
    return ()=>observer.disconnect();
  },[]);
  const signature=`${shownFocus}:${size.width}:${size.height}:${party.map(unit=>unit.id).join(",")}:${enemies.map(unit=>unit.id).join(",")}`;
  useLayoutEffect(()=>{
    moving.current=true;onMovingRef.current(true);
    const timer=setTimeout(()=>{
      moving.current=false;onMovingRef.current(false);
      for(const done of [...waiters.current]) done();
    },300);
    return ()=>clearTimeout(timer);
  },[signature]);
  useEffect(()=>{setForced(undefined);},[focusId]);
  useEffect(()=>{
    if(!gateRef) return;
    const gate:BattleLayoutGate=(id,signal)=>{
      if(signal.aborted) return Promise.resolve();
      if(id===wanted.current && !moving.current) return Promise.resolve();
      if(id!==wanted.current) {wanted.current=id;setForced(id);moving.current=true;onMovingRef.current(true);}
      return new Promise<void>(resolve=>{
        const done=()=>{waiters.current.delete(done);signal.removeEventListener("abort",done);resolve();};
        waiters.current.add(done);signal.addEventListener("abort",done,{once:true});
      });
    };
    gateRef.current=gate;
    return ()=>{if(gateRef.current===gate)gateRef.current=null;for(const done of [...waiters.current])done();};
  },[gateRef]);
  // The former bottom strip's space is now available to the attached readouts.
  // Keep its old portrait-sizing reference rather than enlarging every card.
  const portraitHeight=Math.max(180,size.height-128);
  const viewportInput={partyIds:party.map(unit=>unit.id),enemyIds:enemies.map(unit=>unit.id),
    focusId:shownFocus,width:size.width,height:portraitHeight,referenceHeight:portraitHeight,referenceWidth:size.width};
  const metrics=cardLayoutMetrics(viewportInput);
  const layoutInput={...viewportInput,width:metrics.minimumWidth,
    height:metrics.minimumHeight};
  const baseSlots=layoutCards(layoutInput);
  // Keep the entire composition visible without a scrollable drawing plane.
  // Include room for card outlines and command markers before fitting.
  const planeWidth=layoutInput.width + 24;
  const planeHeight=layoutInput.height + 64;
  const fitScale=Math.min(1,size.width/planeWidth,portraitHeight/planeHeight);
  const portraitSlots=widenBattleCenter(emphasizeCards(spreadRestingColumn(baseSlots,{
    width:size.width,height:portraitHeight,planeWidth,planeHeight,scale:fitScale,focusId:shownFocus,
  }),shownFocus),{width:size.width,planeWidth,scale:fitScale});
  // Always size the fixed column from the complete resting party. The legacy
  // focused layout is used only for the enlarged actor, never for teammates.
  const restingSlots=shownFocus ? widenBattleCenter(emphasizeCards(spreadRestingColumn(
    layoutCards({...layoutInput,focusId:null}),{
      width:size.width,height:portraitHeight,planeWidth,planeHeight,scale:fitScale,focusId:null,
    }),null),{width:size.width,planeWidth,scale:fitScale}) : portraitSlots;
  const focusedPortrait=portraitSlots.find(slot=>!slot.enemy&&slot.id===shownFocus);
  // Keep an enlarged-hero size reference even during enemy turns / full-column
  // waiting, so enemies do not revert to the old oversized portrait scale.
  const referenceId=party[0]?.id;
  const referencePortrait=focusedPortrait??(referenceId ? emphasizeCards(spreadRestingColumn(
    layoutCards({...layoutInput,focusId:referenceId}),{
      width:size.width,height:portraitHeight,planeWidth,planeHeight,scale:fitScale,focusId:referenceId,
    }),referenceId).find(slot=>slot.id===referenceId) : undefined);
  const slots=alignCommandCombatants(layoutCardReadouts(restingSlots.map(slot=>({...slot,
    x:(size.width-planeWidth*fitScale)/2+(slot.x+12)*fitScale,
    y:(portraitHeight-planeHeight*fitScale)/2+(slot.y+32)*fitScale,
    size:slot.size*fitScale,
  })),{width:size.width,height:size.height,focusId:shownFocus,
    focusedSize:referencePortrait ? referencePortrait.size*fitScale : undefined}),{width:size.width,focusId:shownFocus});
  const all=[...enemies,...party];
  const playerCommandPanel=commands&&waitingId===shownFocus
    ?layoutCommandPanel(slots,{width:size.width,height:size.height,focusId:shownFocus}):null;
  useLayoutEffect(()=>{
    if(playerCommandPanel)commandWidth.current=playerCommandPanel.width;
  },[playerCommandPanel?.width]);
  const showEnemyCommands=!!enemyCommands&&enemies.some(unit=>unit.id===enemyCommandId);
  const enemyPanelWidth=Math.min(commandWidth.current,Math.max(0,size.width-16));
  const commandPanel=playerCommandPanel??(showEnemyCommands?{
    x:(size.width-enemyPanelWidth)/2,
    y:size.height/2-Math.min(160,(size.height-16)/4),
    width:enemyPanelWidth,
  }:null);
  return <div className="battle-field card-battle-field" ref={field} aria-label="头像卡片战场">
    <div className="card-battle-viewport">
    <div className="card-battle-plane" style={{
      width:size.width,height:size.height,left:0,top:0,
    }}>
    <div className="card-field-divider" aria-hidden="true" />
    {slots.map(slot=>{
      const unit=all.find(value=>value.id===slot.id)!;
      const statusScale=slot.enemy ? 1 : slot.id===shownFocus
        ? 1 : Math.min(1,slot.status.width/HERO_STATUS_WIDTH);
      const statusBaseWidth=!slot.enemy&&slot.id===shownFocus ? 520 : HERO_STATUS_WIDTH;
      const statusBaseHeight=!slot.enemy&&slot.id===shownFocus ? 112 : HERO_STATUS_HEIGHT;
      const statusWidth=slot.enemy ? 520 : statusBaseWidth*statusScale;
      const legal=legalTargets.includes(unit.id);
      const feedbackClass=hitIds.includes(unit.id)?"card-hit":evadeIds.includes(unit.id)?"card-evade":
        actingId===unit.id?(supportAction?"card-support":"card-action"):"";
      const cardY=slot.y+(slot.enemy||slot.id===shownFocus?44:0);
      // Keep the complete square effect above the casing. Fit its existing art
      // into the available headroom without resizing cards or covering Timeline.
      const feedbackSize=Math.max(0,Math.min(256,slot.size*.82,cardY-slot.size/2-12));
      return <div key={unit.id} className={`battle-card-unit-anchor ${slot.enemy?"enemy-anchor":"hero-anchor"} ${shownFocus===unit.id?"focus-anchor":""}`}
        role="group" aria-label={`${unit.name}卡片与状态`}
        style={{left:slot.x,top:cardY,width:slot.size,height:slot.size}}>
      <div data-card-unit={unit.id}
        data-card-art={slot.enemy ? (unit.id==="guardian" ? appearance.unitArtId : unit.id) : undefined}
        className={`battle-unit-card ${slot.enemy?"enemy-card":"hero-card"} ${unit.hp<=0?"card-ko":""} ${shownFocus===unit.id?"card-out":""} ${selectedTarget===unit.id&&legal?"card-selected":""} ${highlightedId===unit.id?"card-emphasized":""}`}
        role="button" tabIndex={0} aria-label={`${unit.name}${waitingId===unit.id?"，等待指令":""}${unit.hp<=0?"，倒地":""}`}
        aria-disabled={!inputReady||!legal} aria-pressed={legal&&selectedTarget===unit.id}
        onMouseEnter={()=>onHighlight(unit.id)} onMouseLeave={()=>onHighlight(null)}
        onFocus={()=>onHighlight(unit.id)} onBlur={()=>onHighlight(null)}
        onClick={()=>{if(inputReady&&!moving.current&&legal)onSelect(unit.id);}}
        onKeyDown={event=>{
          // A live menu owns both confirm keys; pointer input still selects targets.
          if(isConfirmKey(event.key)&&((commands&&waitingId)||enemyCommands))return;
          if(isConfirmKey(event.key)){event.preventDefault();if(inputReady&&!moving.current&&legal)onSelect(unit.id);}
        }}>
        <div key={feedbackToken} className={`battle-card-feedback-body ${feedbackClass}`}>
          <div className="battle-card-mat"><img className="battle-card-portrait"
            src={portraitSource(unit.id,appearance)} alt="" draggable={false} /></div>
          {unit.hp<=0 && <span className="card-ko-label">倒地</span>}
          <span className="battle-card-frame" aria-hidden="true" />
          {selectedTarget===unit.id&&legal&&<span className="card-target-marker" aria-hidden="true">目标</span>}
        </div>
      </div>
      <div key={feedbackToken} className="battle-card-overhead" data-feedback-unit={unit.id}
        aria-hidden="true" style={{width:feedbackSize,height:feedbackSize}}>
        {feedback(unit)}
      </div>
      <div className={`card-unit-status status-placement-${slot.status.placement}`}
        data-status-scale={!slot.enemy ? statusScale : undefined}
        style={{left:slot.status.x-slot.x+slot.size/2+(slot.status.width-statusWidth)/2,top:slot.status.y-slot.y+slot.size/2,
          width:statusWidth,height:slot.enemy ? 112 : statusBaseHeight*statusScale}}>
        {slot.enemy ? status(unit) : <div className="card-status-scale" style={{
          width:statusBaseWidth,height:statusBaseHeight,
          transform:`scale(${statusScale})`,
        }}>{status(unit)}</div>}
      </div>
      </div>;
    })}
    {commandPanel&&<div className="card-unit-commands" style={{left:commandPanel.x,top:commandPanel.y,
      width:commandPanel.width}}>
      {playerCommandPanel?commands:enemyCommands}
    </div>}
    </div>
    </div>
    {children}
  </div>;
}
