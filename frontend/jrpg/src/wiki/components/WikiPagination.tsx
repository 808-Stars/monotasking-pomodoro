import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {ignoresPagingKey,paginateWiki} from '../pagination.ts';

/** React owns the source; the measured reader owns only its separate clone host. */
export function WikiPagination({children,label='正文',primary=false}:{children:ReactNode;label?:string;primary?:boolean}){
  const source=useRef<HTMLDivElement>(null),probe=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null);
  const pages=useRef<HTMLElement[]>([]),selected=useRef(0);
  const [state,setState]=useState({page:0,count:1,ready:false});
  const rebuild=useRef<()=>void>(()=>{});
  function show(index:number){
    if(!Number.isFinite(index))return;
    index=Math.trunc(index);
    const next=Math.max(0,Math.min(pages.current.length-1,index));
    if(!pages.current[next]||!host.current)return;
    selected.current=next;host.current.replaceChildren(pages.current[next]);
    setState({page:next,count:pages.current.length,ready:true});
  }
  function anchor(id:string){
    const index=pages.current.findIndex(page=>Array.from(page.querySelectorAll('[id]')).some(el=>el.id===id));
    if(index>=0){show(index);return true;}return false;
  }
  useLayoutEffect(()=>{
    const input=source.current!,output=host.current!,measurement=probe.current!;
    let frame=0,disposed=false;
    const build=()=>{
      if(disposed)return;
      const width=output.clientWidth;
      if(!width)return;
      const previous=pages.current[selected.current];
      const marker=previous?.querySelector<HTMLElement>('[id]')?.id;
      input.querySelectorAll<HTMLElement>('[id]').forEach(el=>{el.dataset.wikiAnchor=el.id;el.removeAttribute('id');});
      input.querySelectorAll('details').forEach((el,i)=>{el.dataset.wikiDetails=String(i);});
      measurement.style.width=`${width}px`;
      pages.current=paginateWiki(input,measurement,output.clientHeight,width);
      let hash='';try{hash=decodeURIComponent(window.location.hash.slice(1));}catch{/* Invalid hash is harmless. */}
      if(!((hash&&anchor(hash))||(marker&&anchor(marker)))){
        const active=!primary?pages.current.findIndex(page=>!!page.querySelector('[aria-current="page"]')):-1;
        show(active>=0?active:selected.current);
      }
    };
    rebuild.current=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(build);};
    build();
    const resize=new ResizeObserver(rebuild.current);resize.observe(output);
    const onLoad=()=>rebuild.current();input.addEventListener('load',onLoad,true);
    document.fonts?.ready.then(()=>{if(!disposed)rebuild.current();});
    return ()=>{disposed=true;resize.disconnect();cancelAnimationFrame(frame);input.removeEventListener('load',onLoad,true);};
  },[children]);
  useEffect(()=>{
    const root=host.current!;
    const onHash=()=>{let id='';try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}anchor(id);};
    const onLink=(event:MouseEvent)=>{
      const target=(event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if(!target||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      let id='';try{id=decodeURIComponent(target.hash.slice(1));}catch{return;}
      if(anchor(id)){event.preventDefault();history.pushState(null,'',target.hash);}
      else if(id==='wiki-top'||id==='wiki-main'){event.preventDefault();show(0);history.pushState(null,'',target.hash);host.current?.focus();}
    };
    const onToggle=(event:Event)=>{
      const details=event.target as HTMLDetailsElement;
      const original=source.current?.querySelector<HTMLDetailsElement>(`details[data-wiki-details="${details.dataset.wikiDetails}"]`);
      if(original&&original.open!==details.open){original.open=details.open;rebuild.current();}
    };
    const turnColumns=(box:HTMLElement,step:number)=>{
      const column=Number(box.dataset.wikiColumn)+step,row=Number(box.dataset.wikiRow);
      let match=-1;
      pages.current.forEach((page,index)=>{
        const candidate=page.querySelector<HTMLElement>(`[data-wiki-table="${box.dataset.wikiTable}"][data-wiki-column="${column}"]`);
        if(candidate&&Number(candidate.dataset.wikiRow)<=row)match=index;
      });
      if(match>=0)show(match);
    };
    const onColumns=(event:MouseEvent)=>{
      const button=(event.target as Element).closest<HTMLElement>('[data-wiki-column-step]');
      const box=button?.closest<HTMLElement>('[data-wiki-table]');
      if(button&&box)turnColumns(box,Number(button.dataset.wikiColumnStep));
    };
    const onImageError=(event:Event)=>{if(event.target instanceof HTMLImageElement){event.target.hidden=true;}};
    const onKey=(event:KeyboardEvent)=>{
      if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||ignoresPagingKey(event.target))return;
      const belongs=root.closest('.wiki-pagination')?.contains(event.target as Node);
      if(!belongs&&(!primary||(event.target as Element)?.closest?.('.wiki-pagination')))return;
      const step=event.key==='PageDown'||event.key==='ArrowRight'?1:event.key==='PageUp'||event.key==='ArrowLeft'?-1:0;
      if(!step)return;
      const table=(event.target as Element)?.closest?.<HTMLElement>('[data-wiki-table]');
      event.preventDefault();
      if(table&&(event.key==='ArrowLeft'||event.key==='ArrowRight'))turnColumns(table,step);
      else show(selected.current+step);
    };
    if(primary){document.addEventListener('click',onLink);window.addEventListener('hashchange',onHash);window.addEventListener('popstate',onHash);}
    document.addEventListener('keydown',onKey);root.addEventListener('click',onColumns);root.addEventListener('toggle',onToggle,true);root.addEventListener('error',onImageError,true);
    return ()=>{
      document.removeEventListener('click',onLink);window.removeEventListener('hashchange',onHash);window.removeEventListener('popstate',onHash);
      document.removeEventListener('keydown',onKey);root.removeEventListener('click',onColumns);root.removeEventListener('toggle',onToggle,true);root.removeEventListener('error',onImageError,true);
    };
  },[primary]);
  return <div className={`wiki-pagination${primary?' wiki-pagination-primary':''}`} data-wiki-ready={state.ready}>
    <div className="wiki-page-stage">
      <div ref={source} className="wiki-page-source" aria-hidden={state.ready||undefined} inert={state.ready||undefined}>{children}</div>
      <div ref={probe} className="wiki-page-measure" aria-hidden="true" inert/>
      <div ref={host} className="wiki-page-view" tabIndex={0} aria-label={`${label}，第 ${state.page+1} 页`}/>
    </div>
    <nav className="wiki-page-controls" aria-label={`${label}分页`}>
      <button type="button" disabled={!state.page} onClick={()=>show(selected.current-1)}>← 上页</button>
      <span aria-live="polite">{state.page+1} / {state.count}</span>
      <label>跳页 <input aria-label={`${label}跳页`} type="number" min={1} max={state.count} key={`${state.page}-${state.count}`} defaultValue={state.page+1} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();show(Number(e.currentTarget.value)-1);}}} onBlur={e=>{if(e.currentTarget.value)show(Number(e.currentTarget.value)-1);}}/></label>
      <button type="button" disabled={state.page+1>=state.count} onClick={()=>show(selected.current+1)}>下页 →</button>
    </nav>
  </div>;
}
