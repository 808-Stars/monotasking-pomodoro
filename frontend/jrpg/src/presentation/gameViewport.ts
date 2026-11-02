export const GAME_VIEWPORT_WIDTH=1920;
export const GAME_VIEWPORT_HEIGHT=1080;

/** One scale for the entire game, including text, windows and their hit areas. */
export function fitGameViewport(width:number,height:number,rotation=0){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)
  return {scale:0,width:0,height:0,left:0,top:0};
 const quarterTurn=rotation%180!==0;
 const canvasWidth=quarterTurn?GAME_VIEWPORT_HEIGHT:GAME_VIEWPORT_WIDTH;
 const canvasHeight=quarterTurn?GAME_VIEWPORT_WIDTH:GAME_VIEWPORT_HEIGHT;
 const scale=Math.min(width/canvasWidth,height/canvasHeight);
 const fittedWidth=canvasWidth*scale,fittedHeight=canvasHeight*scale;
 return {scale,width:fittedWidth,height:fittedHeight,left:(width-fittedWidth)/2,top:(height-fittedHeight)/2};
}

export type GameViewportHost={
 readonly fullscreen:boolean;
 setScenePresentation:(expanded:boolean,rotation:number)=>void;
 enterFullscreen:()=>Promise<void>;
 exitFullscreen:()=>Promise<void>;
 subscribe:(listener:()=>void)=>()=>void;
};
export type GameViewportFrame=HTMLIFrameElement&{gameViewportHost?:GameViewportHost};

/** The frame and its document share an origin; no message listener or external URLs. */
export function gameViewportFrame():GameViewportFrame|null{
 if(typeof window==='undefined')return null;
 try{
  const frame=window.frameElement as GameViewportFrame|null;
  return frame?.getAttribute('data-game-viewport')==='1920x1080'?frame:null;
 }catch{return null;}
}
export function gameViewportHost():GameViewportHost|null{return gameViewportFrame()?.gameViewportHost??null;}
