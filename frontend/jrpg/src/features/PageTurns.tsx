import {Children,useEffect,useLayoutEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {isEditingTarget} from '../presentation/keyboard.ts';
import './page-turns.css';

function pageDirection(key:string){
 if(key==='PageDown')return 1;
 if(key==='PageUp')return -1;
 return 0;
}

function syncTabStops(content:HTMLElement,box:HTMLElement){
 const bounds=box.getBoundingClientRect();
 for(const node of content.querySelectorAll<HTMLElement>('button,a,input,select,textarea,summary,[tabindex]')){
  if(!node.getClientRects().length)continue;
  const rect=node.getBoundingClientRect(),off=rect.left<bounds.left-1||rect.right>bounds.right+1;
  if(off){if(!node.hasAttribute('data-page-tabindex'))node.setAttribute('data-page-tabindex',node.getAttribute('tabindex')??'default');node.tabIndex=-1;}
  else if(node.hasAttribute('data-page-tabindex')){const saved=node.getAttribute('data-page-tabindex')!;saved==='default'?node.removeAttribute('tabindex'):node.setAttribute('tabindex',saved);node.removeAttribute('data-page-tabindex');}
 }
}

export function PageButtons({page,count,onPage,label}:{page:number;count:number;onPage:(n:number)=>void;label:string}){
 return <nav className="page-turns" aria-label={`${label}翻页`}>
  <button type="button" data-page-step="-1" aria-label={`${label}上一页`} disabled={page<=0} onClick={()=>onPage(page-1)}>〈 上一页</button>
  <span role="status">{page+1} / {Math.max(1,count)}</span>
  <button type="button" data-page-step="1" aria-label={`${label}下一页`} disabled={page>=count-1} onClick={()=>onPage(page+1)}>下一页 〉</button>
 </nav>;
}

/** Whole-item pagination. Inactive pages unmount only presentation, not owning form state. */
export function ItemPages({children,size=4,roomySize,label,className='',resetKey}:{children:ReactNode;size?:number;roomySize?:number;label:string;className?:string;resetKey?:string|number}){
 const [roomy,setRoomy]=useState(()=>typeof window!=='undefined'&&window.innerHeight>=960);
 useEffect(()=>{if(!roomySize)return;const resize=()=>setRoomy(window.innerHeight>=960);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[roomySize]);
 const items=Children.toArray(children),[page,setPage]=useState(0),pageSize=roomy&&roomySize?roomySize:size,count=Math.max(1,Math.ceil(items.length/pageSize));
 const current=Math.min(page,count-1);
 useEffect(()=>setPage(0),[resetKey]);
 return <section className="item-pages" data-page-count={count} data-page-index={current} aria-label={label} tabIndex={0} onKeyDown={e=>{
  if(isEditingTarget(e.target)||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.nativeEvent.isComposing||e.defaultPrevented||count<=1)return;
  if(e.currentTarget.closest('[data-camp-window],.camp-layout'))return;
  const delta=pageDirection(e.key);
  if(delta) {e.preventDefault();e.stopPropagation();setPage(Math.max(0,Math.min(count-1,current+delta)));}
 }}>
  <div className={className}>{items.slice(current*pageSize,(current+1)*pageSize)}</div>
  {count>1&&<PageButtons page={current} count={count} onPage={setPage} label={label}/>}
 </section>;
}

/** Browser column fragmentation preserves whole rows/cards and all their React state. */
export function BookPager({children,label='内容',className='',resetKey,passthrough=false}:{children:ReactNode;label?:string;className?:string;resetKey?:string|number;passthrough?:boolean}){
 const viewport=useRef<HTMLDivElement>(null),flow=useRef<HTMLDivElement>(null),[page,setPage]=useState(0),[metrics,setMetrics]=useState({width:1,count:1});
 const current=Math.min(page,metrics.count-1);
 useEffect(()=>setPage(0),[resetKey]);
 useLayoutEffect(()=>{
  const box=viewport.current,content=flow.current;if(!box||!content)return;
  let frame=0;
  const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const width=box.clientWidth;if(!width)return;
   const count=Math.max(1,Math.round((content.scrollWidth+32)/(width+32)));
   setMetrics(old=>old.width===width&&old.count===count?old:{width,count});
   syncTabStops(content,box);
  });};
  const resize=new ResizeObserver(measure);resize.observe(box);resize.observe(content);
  const mutations=new MutationObserver(measure);mutations.observe(content,{childList:true,subtree:true,characterData:true});
  content.addEventListener('toggle',measure,true);measure();
  return ()=>{cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();content.removeEventListener('toggle',measure,true);};
 },[]);
 useLayoutEffect(()=>{
  const box=viewport.current,content=flow.current;if(!box||!content)return;
  syncTabStops(content,box);
 },[current,metrics,children]);
 const turn=(next:number)=>{setPage(Math.max(0,Math.min(metrics.count-1,next)));};
 if(passthrough)return <>{children}</>;
 return <section className={`book-pager ${className}`} data-pages={metrics.count} data-page-count={metrics.count} data-page-index={current} aria-label={`${label}分页阅读`} tabIndex={0} onKeyDown={e=>{
  if(isEditingTarget(e.target)||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.nativeEvent.isComposing||e.defaultPrevented)return;
  const camp=!!e.currentTarget.closest('[data-camp-window],.camp-layout');
  if(camp)return;
  const delta=pageDirection(e.key)||(e.target===e.currentTarget?(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0):0);
  if(delta){e.preventDefault();e.stopPropagation();turn(current+delta);}
 }}>
  <div className="book-page-viewport" ref={viewport} onFocusCapture={e=>{
    const rect=(e.target as HTMLElement).getBoundingClientRect(),box=viewport.current!.getBoundingClientRect();
    if(rect.left<box.left-1||rect.right>box.right+1){const offset=rect.left-box.left+current*(metrics.width+32);turn(Math.floor((offset+1)/(metrics.width+32)));}
  }}><div ref={flow} className="book-page-flow" style={{transform:`translateX(${-current*(metrics.width+32)}px)`} as CSSProperties}>{children}</div></div>
  <PageButtons page={current} count={metrics.count} onPage={turn} label={label}/>
 </section>;
}
