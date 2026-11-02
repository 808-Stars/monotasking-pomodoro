import {createContext,useContext,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useSceneFullscreen} from './useSceneFullscreen.ts';
import {nextBattleRotation} from './battleRotation.ts';
import {battleCanvasScale,BATTLE_CANVAS_WIDTH,BATTLE_CANVAS_HEIGHT} from './battleCanvas.ts';
import {BattleCanvasContext} from './BattleCanvasContext.ts';
import {gameViewportHost} from './gameViewport.ts';
import './scene-display.css';

function useDisplayState(){
 const root=useRef<HTMLDivElement>(null);
 const fullscreen=useSceneFullscreen(root);
 const [rotation,setRotation]=useState(0);
 const wasExpanded=useRef(fullscreen.expanded);
 useLayoutEffect(()=>{
  if(wasExpanded.current&&!fullscreen.expanded)setRotation(0);
  wasExpanded.current=fullscreen.expanded;
 },[fullscreen.expanded]);
 const [overlays,setOverlays]=useState<HTMLDivElement|null>(null);
 return {...fullscreen,root,rotation,setRotation,rotate:()=>setRotation(nextBattleRotation),overlays,setOverlays};
}
const SceneDisplayContext=createContext<ReturnType<typeof useDisplayState>|null>(null);

/** Own display state above routes and battle checkpoints; never write game saves. */
export function SceneDisplayProvider({children}:{children:ReactNode}){
 const display=useDisplayState();
 return <SceneDisplayContext.Provider value={display}>
  <div ref={display.root} tabIndex={-1} className="scene-display-root">{children}</div>
 </SceneDisplayContext.Provider>;
}
function useSceneDisplay(){
 const display=useContext(SceneDisplayContext);
 if(!display)throw new Error('SceneDisplayProvider is required');
 return display;
}

export function SceneDisplayControls(){
 const display=useSceneDisplay();
 return <div className="scene-display-controls" aria-label="场景显示模式">
  <button type="button" aria-label="网页全屏" aria-pressed={display.web}
   disabled={!display.overlays||display.expanded||display.requesting} onClick={display.enterWeb}>网页全屏</button>
  <button type="button" aria-label="屏幕全屏" aria-pressed={display.screen}
   disabled={!display.overlays||display.screen||display.requesting} onClick={()=>void display.enterScreen()}>屏幕全屏</button>
  <button type="button" aria-label="屏幕旋转" disabled={!display.overlays}
   title={`当前${display.rotation}°，点击顺时针旋转90°`} onClick={display.rotate}>屏幕旋转</button>
 </div>;
}

/** Exactly one 1920×1080 scene, including its dialogs, rotates/scales as a unit. */
export function SceneSurface({children,kind}:{children:ReactNode;kind:string}){
 const display=useSceneDisplay();
 const viewport=useRef<HTMLDivElement>(null);
 const [size,setSize]=useState({width:0,height:0});
 const [overlays,setOverlays]=useState<HTMLDivElement|null>(null);
 const rotated=display.rotation!==0;
 const expanded=display.expanded||rotated;
 const hosted=!!gameViewportHost();
 const canvasRotation=hosted?0:display.rotation;
 const scale=battleCanvasScale(size.width,size.height,canvasRotation);
 useLayoutEffect(()=>{
  const host=gameViewportHost();host?.setScenePresentation(expanded,display.rotation);
  return()=>host?.setScenePresentation(false,0);
 },[expanded,display.rotation]);
 useLayoutEffect(()=>{
  if(!rotated||display.expanded)return;
  const restore=(event:KeyboardEvent)=>{
   if(event.key!=='Escape')return;
   event.preventDefault();event.stopImmediatePropagation();display.setRotation(0);
  };
  window.addEventListener('keydown',restore,true);
  return()=>window.removeEventListener('keydown',restore,true);
 },[rotated,display.expanded,display.setRotation]);
 useLayoutEffect(()=>{
  const element=viewport.current;if(!element)return;
  element.scrollIntoView({block:'start',behavior:'instant'});
  const measure=()=>setSize(previous=>{
   const width=element.clientWidth,height=element.clientHeight;
   return previous.width===width&&previous.height===height?previous:{width,height};
  });
  measure();const observer=new ResizeObserver(measure);observer.observe(element);
  return()=>observer.disconnect();
 },[]);
 useLayoutEffect(()=>{
  if(!overlays)return;
  display.setOverlays(overlays);
  return()=>display.setOverlays(current=>current===overlays?null:current);
 },[overlays,display.setOverlays]);
 return <div className="scene-display-slot"><div ref={viewport} tabIndex={-1} data-scene-surface={kind}
  className={`scene-display-viewport${expanded?' scene-display-expanded':''}`}>
  <div className="scene-display-canvas" data-rotation={display.rotation} style={{
   width:BATTLE_CANVAS_WIDTH,height:BATTLE_CANVAS_HEIGHT,visibility:scale>0?'visible':'hidden',
   transform:`translate(-50%, -50%) rotate(${canvasRotation}deg) scale(${scale})`,
  }}>
   <BattleCanvasContext.Provider value={{element:overlays,rotation:canvasRotation,scale}}>
    {children}
    <div ref={setOverlays} className="scene-display-overlays battle-canvas-overlays" />
   </BattleCanvasContext.Provider>
  </div>
  {expanded&&<button type="button" className="scene-display-rotate" aria-label="继续旋转画面" title="顺时针旋转90°"
   onClick={display.rotate}>
   <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18.5 7A8 8 0 1 0 20 13M18.5 3v4h-4"/></svg>
  </button>}
  {expanded&&<button type="button" className="scene-display-exit" aria-label={display.expanded?'退出全屏':'退出旋转'} title="还原画面"
   disabled={display.requesting} onClick={()=>{display.setRotation(0);void display.exitFullscreen();}}>
   <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>
  </button>}
  {display.notice&&<div className="scene-display-notice" role="status">{display.notice}</div>}
 </div></div>;
}

/** App dialogs stay on the current scene's plane, including in native fullscreen. */
export function SceneOverlay({children}:{children:ReactNode}){
 const {overlays}=useSceneDisplay();
 return overlays?createPortal(children,overlays):null;
}
