import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {fitGameViewport,gameViewportFrame,type GameViewportFrame,type GameViewportHost} from './gameViewport.ts';
import './game-viewport.css';
import {SceneDisplayProvider} from './SceneDisplay.tsx';
import {RuntimeAssets} from './RuntimeAssets.tsx';

/** Keep the logical iframe fixed. Fit its rotated bounds against the physical
    browser, instead of rotating a scene inside an already scaled letterbox. */
function GameViewport(){
 const viewport=useRef<HTMLDivElement>(null),frame=useRef<GameViewportFrame>(null);
 const [source]=useState(()=>window.location.href);
 const [fit,setFit]=useState(()=>fitGameViewport(window.innerWidth,window.innerHeight));
 const [rotation,setRotation]=useState(0);
 useLayoutEffect(()=>{
  const element=viewport.current,iframe=frame.current;if(!element||!iframe)return;
  let sceneRotation=0;
  const measure=()=>{
   const next=fitGameViewport(element.clientWidth,element.clientHeight,sceneRotation);
   setFit(previous=>previous.scale===next.scale&&previous.left===next.left&&previous.top===next.top&&previous.width===next.width&&previous.height===next.height?previous:next);
  };
  const listeners=new Set<()=>void>();
  const sync=()=>{for(const listener of listeners)listener();};
  const controller:GameViewportHost={
   get fullscreen(){return document.fullscreenElement===element;},
   setScenePresentation:(expanded,angle)=>{
    const next=expanded?angle:0;if(sceneRotation===next)return;
    sceneRotation=next;setRotation(next);measure();
   },
   // Called synchronously from the child's button gesture; don't postMessage
   // or delay this request, which would lose transient user activation.
   enterFullscreen:async()=>{await element.requestFullscreen();},
   exitFullscreen:async()=>{if(document.fullscreenElement===element)await document.exitFullscreen();},
   subscribe:listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
  };
  iframe.gameViewportHost=controller;
  const observer=new ResizeObserver(measure);observer.observe(element);measure();
  document.addEventListener('fullscreenchange',sync);
  return()=>{observer.disconnect();document.removeEventListener('fullscreenchange',sync);listeners.clear();delete iframe.gameViewportHost;};
 },[]);
 function syncDocument(){
  const child=frame.current?.contentWindow;if(!child)return;
  try{
   document.title=child.document.title;
   const url=new URL(child.location.href);
   if(url.origin===window.location.origin&&url.href!==window.location.href)window.history.replaceState(null,'',url.href);
   child.focus();
  }catch{/* The canvas only controls its own same-origin document. */}
 }
 return <div ref={viewport} className="game-viewport-host" aria-label="游戏画面" data-game-host="1920x1080">
  <div className="game-viewport-stage" data-game-scale={fit.scale} data-game-rotation={rotation} style={{
   left:fit.left+fit.width/2,top:fit.top+fit.height/2,
   transform:`translate(-50%, -50%) rotate(${rotation}deg) scale(${fit.scale})`,visibility:fit.scale>0?'visible':'hidden',
  }}>
   <iframe ref={frame} data-game-viewport="1920x1080" title="MONOPOMO 游戏界面" src={source}
    allow="fullscreen" allowFullScreen onLoad={syncDocument}/>
  </div>
 </div>;
}

/** Entry points reuse this gate; navigating inside the frame never nests it. */
export function mountGame(content:ReactNode){
 const embedded=!!gameViewportFrame();
 document.documentElement.dataset.gameViewportMode=embedded?'content':'host';
  createRoot(document.getElementById('root')!).render(embedded?<SceneDisplayProvider><RuntimeAssets>{content}</RuntimeAssets></SceneDisplayProvider>:<GameViewport/>);
}
