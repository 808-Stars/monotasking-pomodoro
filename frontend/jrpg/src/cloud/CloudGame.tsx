import {createContext,useContext,useEffect,useState,useSyncExternalStore,type ReactNode,Fragment} from 'react';
import type {User} from '@supabase/supabase-js';
import {setSaveBackend} from '../game/persistence.ts';
import {SceneOverlay} from '../presentation/SceneDisplay.tsx';
import {cloudClient,cloudUrl,cloudKey} from './client.ts';
import {createCheckpointAPI} from './api.ts';
import {CloudSaveStore,type SyncState} from './CloudSaveStore.ts';
import './cloud-save.css';

type CloudContextValue={user:User|null;store:CloudSaveStore|null;open:()=>void};
const CloudContext=createContext<CloudContextValue|null>(null);
const guestState:SyncState={phase:'saved',message:'本地游玩 · 未登录云存档'};
const noopSubscribe=()=>()=>{};
export function CloudStatus(){
 const context=useContext(CloudContext);
 const state=useSyncExternalStore(context?.store?.subscribe??noopSubscribe,context?.store?.snapshot??(()=>guestState));
 if(!context)return null;
 return <button type="button" className={`cloud-status cloud-${state.phase}`} onClick={context.open}
  title={state.time?`最后保存：${new Date(state.time).toLocaleString()}`:state.message}>
  {context.user?state.message:'登录云存档'}
 </button>;
}
export function CloudRuntimeNote(){
 const context=useContext(CloudContext);
 return <>{context?.user?'账号云存档 · 本机缓存与自动同步':'本地游玩 · 登录后可开启云存档'}</>;
}
export function CloudGame({children}:{children:ReactNode}){
 const [identity,setIdentity]=useState<{user:User|null;store:CloudSaveStore|null}|null>(null);
 const [ready,setReady]=useState(false),[epoch,setEpoch]=useState(0),[panel,setPanel]=useState(false);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[working,setWorking]=useState(false),[error,setError]=useState('');
 const state=useSyncExternalStore(identity?.store?.subscribe??noopSubscribe,identity?.store?.snapshot??(()=>guestState));
 useEffect(()=>{
  let mounted=true,owner:string|null|undefined=undefined,current:CloudSaveStore|null=null;
  const client=cloudClient();
  async function attach(user:User|null){
   if(!mounted||owner===(user?.id??null))return;
   owner=user?.id??null;current?.dispose();current=null;setReady(false);setError('');setPanel(false);
   if(!user){setSaveBackend(null);setIdentity({user:null,store:null});setEpoch(n=>n+1);setReady(true);return;}
   const api=createCheckpointAPI(cloudUrl,cloudKey,user.id,async(refresh)=>{
    const {data,error}=await (refresh?client.auth.refreshSession():client.auth.getSession());if(error)throw error;return data.session;
   });
   const store=new CloudSaveStore(user.id,api);current=store;setSaveBackend(store);setIdentity({user,store});
   try{await store.boot();if(mounted&&current===store){setEpoch(n=>n+1);setReady(true);}}
   catch(cause){if(mounted&&current===store&&store.snapshot().phase==='loading')setError(String(cause));}
  }
  // Defer SDK work outside the auth callback so token locks cannot deadlock.
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>void attach(session?.user??null),0);});
  void client.auth.getSession().then(({data,error})=>{if(error){setError(error.message);}return attach(data.session?.user??null);});
  return()=>{mounted=false;subscription.unsubscribe();current?.dispose();setSaveBackend(null);};
 },[]);
 useEffect(()=>{
  const sync=()=>{void identity?.store?.flush();};
  const leave=(event:BeforeUnloadEvent)=>{
   const phase=identity?.store?.snapshot().phase;
   if(phase==='pending'||phase==='offline'||phase==='conflict'){event.preventDefault();event.returnValue='';}
  };
  window.addEventListener('online',sync);window.addEventListener('focus',sync);window.addEventListener('beforeunload',leave);
  return()=>{window.removeEventListener('online',sync);window.removeEventListener('focus',sync);window.removeEventListener('beforeunload',leave);};
 },[identity]);
 async function action(task:()=>Promise<unknown>){
  if(working)return;setWorking(true);setError('');try{await task();}catch(cause){setError(cause instanceof Error?cause.message:String(cause));}finally{setWorking(false);}
 }
 async function resume(task:()=>Promise<unknown>){await task();setEpoch(n=>n+1);setReady(true);setPanel(false);}
 const mustChoose=state.phase==='conflict'||state.phase==='import';
 const content=<section className="cloud-window" role="dialog" aria-modal="true" aria-label="云存档">
  <header><h2>灯火留痕 · 云存档</h2>{ready&&!mustChoose&&<button onClick={()=>setPanel(false)}>关闭 ×</button>}</header>
  <p>{identity?.user?`账号：${identity.user.email??identity.user.id}`:'使用 MONOPOMO 已有账号登录。未登录时只在本机保存。'}</p>
  {identity?.user?<>
   <p role="status">{state.message}{state.time&&` · ${new Date(state.time).toLocaleString()}`}</p>
   {state.phase==='import'?<>
    <p>此账号尚无云存档。旧本地进度不会被删除，也不会自动分配给其他账号。</p>
    <button disabled={working} onClick={()=>void action(()=>resume(()=>identity.store!.boot(true)))}>继承本机旧进度</button>
    <button disabled={working} onClick={()=>void action(()=>resume(()=>identity.store!.boot(false)))}>建立独立新存档</button>
   </>:state.phase==='conflict'?<>
    <p>两个设备的进度不再一致。不会自动合并资源或战斗；选择会替换其中一份，替换前保留备份。</p>
    <button disabled={working} onClick={()=>void action(()=>resume(()=>identity.store!.resolve('cloud')))}>使用云端进度</button>
    <button disabled={working} onClick={()=>void action(()=>resume(()=>identity.store!.resolve('local')))}>保留本机并上传</button>
   </>:<button disabled={working} onClick={()=>void action(()=>ready?identity.store!.flush():resume(()=>identity.store!.boot()))}>立即同步／重试</button>}
   <button disabled={working} onClick={()=>void action(async()=>{
    await identity.store!.flush();
    if(['pending','offline','conflict'].includes(identity.store!.snapshot().phase)&&!confirm('还有未同步进度，仍要退出吗？进度会保留在此账号的本机缓存中。'))return;
    const {error}=await cloudClient().auth.signOut({scope:'local'});if(error)throw error;
   })}>退出当前账号</button>
  </>:<form onSubmit={event=>{event.preventDefault();void action(async()=>{
   const {error}=await cloudClient().auth.signInWithPassword({email:email.trim(),password});
   if(error)throw new Error('登录失败，请检查邮箱与密码后重试。');setPassword('');setPanel(false);
  });}}>
   <label>邮箱<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>密码<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button disabled={working} type="submit">登录并读取云存档</button>
  </form>}
  {error&&<p role="alert">{error}</p>}
  <small>进度会先在本机完整保存，再自动同步。云存档不等同于防作弊或已验证榜单成绩。</small>
 </section>;
 return <CloudContext.Provider value={{user:identity?.user??null,store:identity?.store??null,open:()=>setPanel(true)}}>
  {ready?<Fragment key={`${identity?.user?.id??'guest'}:${epoch}`}>{children}</Fragment>:<main className="cloud-loading">
   {identity?.user&&(mustChoose||state.phase==='error'||!!error)?content:<><h1>正在寻回旅程…</h1><p>{error||state.message}</p></>}
  </main>}
  {ready&&(panel||mustChoose)&&<SceneOverlay><div className="cloud-backdrop">{content}</div></SceneOverlay>}
 </CloudContext.Provider>;
}
