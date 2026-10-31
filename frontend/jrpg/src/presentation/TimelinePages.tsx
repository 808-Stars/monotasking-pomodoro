import {Children,useLayoutEffect,useEffect,useRef,useState,type ReactNode} from 'react';
import {isEditingTarget} from './keyboard.ts';
import './timeline-pages.css';

export function TimelinePages({children,round,label}:{children:ReactNode;round:number;label:string}){
 const track=useRef<HTMLDivElement>(null),[capacity,setCapacity]=useState(10),[page,setPage]=useState(0);
 const items=Children.toArray(children),count=Math.max(1,Math.ceil(items.length/capacity)),current=Math.min(page,count-1);
 useEffect(()=>setPage(0),[round]);
 useLayoutEffect(()=>{const node=track.current;if(!node)return;const measure=()=>setCapacity(Math.max(1,Math.floor((node.clientWidth-10+10)/60)));const observer=new ResizeObserver(measure);observer.observe(node);measure();return()=>observer.disconnect();},[]);
 const move=(d:number)=>setPage(Math.max(0,Math.min(count-1,current+d)));
 return <div className="timeline-page-shell" role="region" aria-label={`${label}行动节点`} data-battle-pagination="行动轮" tabIndex={0}
   onKeyDown={e=>{if(isEditingTarget(e.target)||e.defaultPrevented)return;const d=e.key==='PageDown'?1:e.key==='PageUp'?-1:e.target===e.currentTarget&&e.key==='ArrowRight'?1:e.target===e.currentTarget&&e.key==='ArrowLeft'?-1:0;if(d){e.preventDefault();e.stopPropagation();move(d);}}}>
   {count>1&&<button type="button" aria-label={`${label}行动轮上一页`} disabled={current===0} onClick={()=>move(-1)}>‹</button>}
   <div ref={track} className="timeline-track">{items.slice(current*capacity,(current+1)*capacity)}</div>
   {count>1&&<><small aria-live="polite">{current+1}/{count}</small><button type="button" aria-label={`${label}行动轮下一页`} disabled={current===count-1} onClick={()=>move(1)}>›</button></>}
 </div>;
}
