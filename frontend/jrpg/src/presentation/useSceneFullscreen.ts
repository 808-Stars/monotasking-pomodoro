import { useEffect, useRef, useState, type RefObject } from "react";
import {gameViewportHost} from './gameViewport.ts';

export function useSceneFullscreen(shell:RefObject<HTMLElement|null>) {
  const [web,setWeb]=useState(false);
  const [screen,setScreen]=useState(false);
  const [requesting,setRequesting]=useState(false);
  const [notice,setNotice]=useState("");
  const mounted=useRef(false);
  const expanded=web||screen;
  useEffect(()=>{
    mounted.current=true;
    const host=gameViewportHost();
    const sync=()=>setScreen(host?host.fullscreen:document.fullscreenElement===shell.current);
    sync();document.addEventListener("fullscreenchange",sync);
    const unsubscribe=host?.subscribe(sync);
    return ()=>{mounted.current=false;document.removeEventListener("fullscreenchange",sync);unsubscribe?.();};
  },[shell]);
  useEffect(()=>{
    if(!notice)return;
    const timer=setTimeout(()=>setNotice(""),5000);
    return ()=>clearTimeout(timer);
  },[notice]);
  useEffect(()=>{
    if(!expanded)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=previous;};
  },[expanded]);
  useEffect(()=>{
    if(!web||screen)return;
    // Escape restores webpage mode immediately; Backspace still owns menus.
    const down=(event:KeyboardEvent)=>{
      if(event.key!=="Escape")return;
      event.preventDefault();event.stopImmediatePropagation();
      if(!event.repeat){setWeb(false);setNotice("");}
    };
    window.addEventListener("keydown",down,true);
    return ()=>window.removeEventListener("keydown",down,true);
  },[web,screen]);
  function enterWeb(){
    if(expanded||requesting)return;
    setWeb(true);setNotice("按 Esc 退出网页全屏 · Backspace 返回菜单");
    shell.current?.focus({preventScroll:true});
  }
  async function enterScreen(){
    const element=shell.current;
    if(!element||screen||requesting)return;
    const host=gameViewportHost();
    if(!host&&(!element.requestFullscreen||!document.fullscreenEnabled)){
      setNotice("当前浏览器不支持或未允许屏幕全屏，请使用网页全屏。");return;
    }
    setRequesting(true);
    try{
      if(host)await host.enterFullscreen();else await element.requestFullscreen();
      if(mounted.current){
        setWeb(false);
        setScreen(host?host.fullscreen:document.fullscreenElement===element);
        setNotice("已进入屏幕全屏 · 按浏览器提示使用 Esc 退出");
      }
    }catch{
      if(mounted.current)setNotice("浏览器未允许进入屏幕全屏，请重试或使用网页全屏。");
    }finally{
      if(mounted.current)setRequesting(false);
    }
  }
  async function exitFullscreen(){
    if(requesting)return;
    const host=gameViewportHost();
    if(host?.fullscreen||document.fullscreenElement===shell.current){
      setRequesting(true);
      try{
        if(host?.fullscreen)await host.exitFullscreen();else await document.exitFullscreen();
        if(mounted.current){setWeb(false);setScreen(false);setNotice("");}
      }catch{
        if(mounted.current)setNotice("浏览器未能退出全屏，请按浏览器提示使用 Esc 退出。");
      }finally{
        if(mounted.current)setRequesting(false);
      }
    }else{
      setWeb(false);setNotice("");
    }
  }
  return {expanded,web,screen,requesting,notice,enterWeb,enterScreen,exitFullscreen};
}
