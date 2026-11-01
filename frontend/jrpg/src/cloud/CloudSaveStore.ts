import {loadLocalSave,saveLocalCheckpoint,localRecord,putLocalRecord,replaceLocalSave,type Save,type SaveBackend} from '../game/persistence.ts';
import {createGame} from '../game/economy.ts';
import {migrateCamp} from '../game/camp/migrate.ts';
import {CloudConflict,CloudIdentityChanged,validSave,type CheckpointAPI,type CloudCheckpoint} from './api.ts';

type Pending={id:string;version:number;payload:Save};
type Meta={version:number;syncedRevision:number;pending?:Pending};
export type SyncState={phase:'loading'|'saved'|'pending'|'offline'|'conflict'|'import'|'error';message:string;time?:string};
export class CloudSaveStore implements SaveBackend {
 private state:SyncState={phase:'loading',message:'正在读取云存档…'};
 private listeners=new Set<()=>void>();
 private timer:ReturnType<typeof setTimeout>|undefined;
 private running:Promise<void>|undefined;
 private stopped=false;
 private meta:Meta={version:0,syncedRevision:-1};
 private ready:Save|undefined;
 private retryDelay=3000;
 remote:CloudCheckpoint|null=null;
 local:Save|undefined;
 constructor(readonly owner:string,private api:CheckpointAPI){}
 snapshot=()=>this.state;
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private emit(phase:SyncState['phase'],message:string,time?:string){this.state={phase,message,time};for(const fn of this.listeners)fn();}
 private async metadata(){await putLocalRecord(this.owner,'cloud-meta',this.meta);}
 async boot(importGuest?:boolean):Promise<Save>{
  this.emit('loading','正在读取云存档…');
  this.local=await localRecord<Save>(this.owner,'current');
  this.meta=await localRecord<Meta>(this.owner,'cloud-meta')??{version:0,syncedRevision:-1};
  try{this.remote=await this.api.read();}
  catch(error){
   if(this.local&&await localRecord<Meta>(this.owner,'cloud-meta')){this.ready=await loadLocalSave(this.owner);this.emit('offline','离线游玩 · 进度仅暂存本机');this.schedule(3000);return this.ready;}
   this.emit('error',error instanceof Error?error.message:'无法读取云存档，请联网重试。');throw error;
  }
  if(this.stopped)throw new CloudIdentityChanged();
  const acknowledged=this.meta.pending;
  if(this.remote&&acknowledged&&acknowledged.id===this.remote.last_request){
   this.meta={version:this.remote.version,syncedRevision:acknowledged.payload.revision};await this.metadata();
  }
  const dirty=this.local&&this.local.revision>this.meta.syncedRevision;
  if(this.remote){
   if(dirty&&this.meta.version!==this.remote.version){this.emit('conflict','另一设备已更新，尚未覆盖任何进度。');throw new CloudConflict();}
   if(dirty){this.ready=await loadLocalSave(this.owner);this.emit('pending','本地进度待上传');this.schedule();return this.ready;}
   this.ready=await replaceLocalSave(this.owner,this.remote.payload);
   this.meta={version:this.remote.version,syncedRevision:this.ready.revision};await this.metadata();
   this.emit('saved','云端已保存',this.remote.updated_at);return this.ready;
  }
  if(!this.local){
   const guest=await localRecord<Save>('guest','current');
   const claimed=await localRecord<string>('guest','cloud-import-owner');
   if(guest&&validSave(guest)&&(!claimed||claimed===this.owner)){
    if(importGuest===undefined){this.emit('import','首次登录：选择继承本机旧进度，或建立全新存档。');throw new Error('Import choice required');}
    if(importGuest){await putLocalRecord('guest','cloud-import-owner',this.owner);await replaceLocalSave(this.owner,guest);}
   }
  }
  this.ready=await loadLocalSave(this.owner);this.meta={version:0,syncedRevision:-1};await this.metadata();
  this.emit('pending','新存档待上传');this.schedule();return this.ready;
 }
 load=async()=>this.ready??this.boot();
 save:SaveBackend['save']=async(previous,game,battle,reset=false,scene)=>{
  if(this.stopped)throw new CloudIdentityChanged();
  if(previous.accountId!==this.owner)throw new CloudIdentityChanged();
  if(this.state.phase==='conflict')throw new CloudConflict();
  if(reset)await putLocalRecord(this.owner,`backup-before-reset-${Date.now()}`,previous);
  // Account reset must not clear cloud version metadata or another account's cache.
  const next=await saveLocalCheckpoint(previous,game,battle,false,scene,this.owner);
  this.ready=next;this.local=next;this.emit('pending','进度已在本机保存，等待同步');this.schedule();return next;
 };
 reset=async()=>{
  const previous=await this.load();
  return this.save(previous,migrateCamp(createGame()),null,true);
 };
 private schedule(delay=1500){
  if(this.stopped||this.state.phase==='conflict')return;
  clearTimeout(this.timer);this.timer=setTimeout(()=>{void this.flush();},delay);
 }
 flush=():Promise<void>=>{
  if(this.running)return this.running;
  clearTimeout(this.timer);
  this.running=this.upload().finally(()=>{this.running=undefined;});return this.running;
 };
 private async upload(){
  if(this.stopped||this.state.phase==='conflict'||!this.ready)return;
  try{
   const current=await loadLocalSave(this.owner);
   if(current.revision<=this.meta.syncedRevision){this.emit('saved','云端已保存',this.remote?.updated_at);return;}
   // Persist the exact request before sending. Retry the same ID after a lost response.
   const pending=this.meta.pending??{id:crypto.randomUUID(),version:this.meta.version,payload:structuredClone(current)};
   this.meta.pending=pending;await this.metadata();
   this.emit('pending','正在同步云端…');
   const cloud=await this.api.write(pending.version,pending.payload,pending.id);
   this.remote=cloud;this.meta={version:cloud.version,syncedRevision:pending.payload.revision};await this.metadata();
   if(this.stopped)return;
   this.retryDelay=3000;
   const latest=await localRecord<Save>(this.owner,'current');
   if(latest&&latest.revision>this.meta.syncedRevision){this.emit('pending','更新后的进度待同步');this.schedule();}
   else this.emit('saved','云端已保存',cloud.updated_at);
  }catch(error){
   if(this.stopped)return;
   if(error instanceof CloudConflict){this.emit('conflict',error.message);return;}
   this.emit('offline',error instanceof Error?error.message:'同步失败，进度已暂存本机。');
   this.schedule(this.retryDelay);this.retryDelay=Math.min(60000,this.retryDelay*2);
  }
 }
 async resolve(which:'cloud'|'local'):Promise<Save>{
  if(this.running)await this.running;
  this.remote=await this.api.read();this.local=await localRecord<Save>(this.owner,'current');
  if(this.local)this.local=await loadLocalSave(this.owner);
  if(which==='cloud'){
   if(!this.remote)throw new Error('云端尚无存档，不能替换。');
   this.ready=await replaceLocalSave(this.owner,this.remote.payload);
   this.meta={version:this.remote.version,syncedRevision:this.ready.revision};await this.metadata();
  }else{
   if(!this.local)throw new Error('没有可上传的本地存档。');
   this.remote=await this.api.write(this.remote?.version??0,this.local,crypto.randomUUID());
   this.ready=this.local;this.meta={version:this.remote.version,syncedRevision:this.local.revision};await this.metadata();
  }
  this.emit('saved','云端已保存',this.remote?.updated_at);return this.ready;
 }
 dispose(){this.stopped=true;clearTimeout(this.timer);this.listeners.clear();}
}
