import {useEffect,useState,type ReactNode} from 'react';
import './runtime-assets.css';
type Asset={url:string;bytes:number;kind:'image'|'font'};
type State={total:number;done:number;failed:Asset[];running:boolean;error:string;ready:boolean};
let state:State={total:0,done:0,failed:[],running:false,error:'',ready:false};
const listeners=new Set<()=>void>();
let manifest:Asset[]|undefined;
let version='',assetCache:Cache|undefined,cacheName='',worker:ServiceWorker|undefined;
async function prepareCache(){
 try{
  if(!('serviceWorker'in navigator)||!('caches'in window))return;
  const base=new URL('.',location.href);
  const registration=await navigator.serviceWorker.register(new URL('runtime-assets-sw.js',base),{scope:base.pathname,updateViaCache:'none'});
  worker=registration.active??registration.installing??registration.waiting??undefined;
  if(worker&&worker.state!=='activated')await new Promise<void>((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('缓存启动超时')),15000);
   worker!.addEventListener('statechange',()=>{if(worker!.state==='activated'){clearTimeout(timer);resolve();}else if(worker!.state==='redundant'){clearTimeout(timer);reject(Error('缓存不可用'));}});
  });
  cacheName=`jrpg-assets-v1-${version}`;assetCache=await caches.open(cacheName);
 }catch{assetCache=undefined;worker=undefined;}
}
const emit=(next:Partial<State>)=>{state={...state,...next};for(const fn of listeners)fn();};
function loadImage(url:string){return new Promise<void>((resolve,reject)=>{
 const image=new Image();const timer=setTimeout(()=>finish(new Error('图片加载超时')),60000);
 const finish=(error?:Error)=>{clearTimeout(timer);image.onload=null;image.onerror=null;error?reject(error):resolve();};
 image.onload=()=>finish();image.onerror=()=>finish(new Error('图片无法读取'));image.src=url;
});}
async function load(asset:Asset){
 let response=await assetCache?.match(asset.url);
 if(!response){
  const fresh=new URL(asset.url);fresh.searchParams.set('jrpg-preload',version);
  response=await fetch(fresh,{cache:'force-cache',signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('素材加载失败');
  if(assetCache)try{await assetCache.put(asset.url,response.clone());}catch{assetCache=undefined;worker=undefined;}
 }
 const blob=await response.blob();
 try{
  if(asset.kind==='image'){const url=URL.createObjectURL(blob);try{await loadImage(url);}finally{URL.revokeObjectURL(url);}}
  else await new FontFace('JRPG preload validation',await blob.arrayBuffer()).load();
 }catch(error){await assetCache?.delete(asset.url);throw error;}
}
async function start(){
 if(state.running||state.ready)return;
 emit({running:true,error:'',failed:[]});
 try{
  if(!manifest){
   const base=new URL('.',location.href);const response=await fetch(new URL('runtime-assets.json',base),{cache:'no-cache',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('素材清单暂时无法读取，请检查网络后重试。');
   const raw=await response.json();
   if(!Array.isArray(raw.assets)||!raw.assets.length)throw Error('素材清单为空，尚未进入游戏。');
   version=raw.version;
   manifest=raw.assets.map((a:Asset)=>{
    const url=new URL(a.url,location.href);
    if(url.origin!==location.origin||!['image','font'].includes(a.kind))throw Error('素材清单格式异常。');
    return {...a,url:url.href};
   });emit({total:manifest!.length});await prepareCache();
  }
  const completed=new Set(successes);const queue=manifest!.filter(a=>!completed.has(a.url));
  let cursor=0;const failed:Asset[]=[];
  await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{
   while(cursor<queue.length){const asset=queue[cursor++];try{await load(asset);successes.add(asset.url);emit({done:successes.size});}catch{failed.push(asset);}}
  }));
  if(failed.length){emit({failed,error:`有${failed.length}项素材未能加载，已保留其余进度。`});return;}
  if(assetCache&&worker){
   const base=new URL('.',location.href),meta=await caches.open('jrpg-assets-state');
   await meta.put(new URL('__runtime_asset_cache__',base),new Response(JSON.stringify({cache:cacheName}),{headers:{'Content-Type':'application/json'}}));
   const channel=new MessageChannel();
   await new Promise<void>(resolve=>{const timer=setTimeout(resolve,3000);channel.port1.onmessage=()=>{clearTimeout(timer);channel.port1.close();resolve();};worker!.postMessage({type:'runtime-assets-ready',cache:cacheName},[channel.port2]);});
   const older=(await caches.keys()).filter(name=>name.startsWith('jrpg-assets-v1-')&&name!==cacheName);
   await Promise.all(older.slice(0,-1).map(name=>caches.delete(name)));
  }
  // Register/load the CSS font faces before exposing text-heavy game windows.
  await Promise.all([...document.fonts].map(face=>face.load()));
  emit({ready:true});
 }catch(error){emit({error:error instanceof Error?error.message:'素材加载失败，请重试。'});}
 finally{emit({running:false});}
}
const successes=new Set<string>();
export function RuntimeAssets({children}:{children:ReactNode}){
 const [current,setCurrent]=useState(state);
 useEffect(()=>{const sync=()=>setCurrent(state);listeners.add(sync);sync();void start();return()=>{listeners.delete(sync);};},[]);
 if(current.ready)return children;
 const percent=current.total?Math.floor(current.done/current.total*100):0;
 return <main className="loading runtime-loading" aria-busy={current.running}>
  <span className="runtime-loading-kicker">MONOPOMO · 灯火冒险</span>
  <h1>正在点亮营地的灯火…</h1>
  <p>{current.total?'正在准备场景、人物与界面素材':'正在清点旅途所需的素材…'}</p>
  <div className="runtime-progress" role="progressbar" aria-label="运行素材加载进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{width:`${percent}%`}}/></div>
  <p className="runtime-loading-count" role="status">{percent}%{current.total?` · 已加载 ${current.done} / ${current.total} 项`:''}</p>
  {current.error&&<><p role="alert">{current.error}</p><button disabled={current.running} onClick={()=>void start()}>重试未完成素材</button>
   {!!current.failed.length&&<details><summary>查看未完成素材</summary><ul>{current.failed.map(a=><li key={a.url}>{new URL(a.url).pathname.split('/').pop()}</li>)}</ul></details>}
  </>}
  <small>{manifest&&!assetCache?'当前浏览器无法持久保存素材缓存，后续可能需要重新加载。':'首次进入需下载全部运行素材；再次进入会复用浏览器可用缓存。'}</small>
 </main>;
}
