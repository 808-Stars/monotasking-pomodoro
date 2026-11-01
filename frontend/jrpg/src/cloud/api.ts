import type {Save} from '../game/persistence.ts';
export type CloudCheckpoint={version:number;payload:Save;updated_at:string;last_request?:string};
export interface CheckpointAPI {
 read:()=>Promise<CloudCheckpoint|null>;
 write:(version:number,payload:Save,requestId:string)=>Promise<CloudCheckpoint>;
}
export class CloudConflict extends Error {constructor(){super('云端已有更新，已保留本地进度，请选择要继续的存档。');}}
export class CloudIdentityChanged extends Error {constructor(){super('登录账号已变化，请重新打开游戏。');}}
export function validSave(raw:unknown):raw is Save{
 if(!raw||typeof raw!=='object')return false;
 const s=raw as Save;
 return Number.isSafeInteger(s.revision)&&s.revision>=0&&!!s.game&&typeof s.game==='object'
  &&Number.isFinite(s.game.stamina)&&!!s.game.inventory&&typeof s.game.inventory==='object'
  &&(s.battle===null||!!s.battle&&typeof s.battle==='object'&&Array.isArray(s.battle.party)&&Array.isArray(s.battle.enemies));
}
export function checkpoint(raw:unknown):CloudCheckpoint{
 const c=raw as CloudCheckpoint;
 if(!c||!Number.isSafeInteger(c.version)||c.version<1||!validSave(c.payload)||typeof c.updated_at!=='string')
  throw new Error('云存档格式无法读取；未覆盖本地进度。');
 return c;
}

/** Capture the authenticated token per request so account changes cannot retarget a pending save. */
export function createCheckpointAPI(url:string,key:string,owner:string,
 session:(refresh?:boolean)=>Promise<{user:{id:string};access_token:string}|null>,fetcher:typeof fetch=fetch):CheckpointAPI{
 async function request(path:string,body?:unknown){
  async function send(refresh=false){
   const auth=await session(refresh);if(!auth||auth.user.id!==owner)throw new CloudIdentityChanged();
   return fetcher(`${url}/rest/v1/${path}`,{method:body?'POST':'GET',
   headers:{apikey:key,Authorization:`Bearer ${auth.access_token}`,'Content-Type':'application/json'},
   ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  }
  let response=await send();
  // Refresh the captured account session once if Data API rejects its token.
  // Keep the same mutation ID; at most one fresh-token retry, never a blind loop.
  if(response.status===401)response=await send(true);
  if(response.status===409)throw new CloudConflict();
  if(!response.ok)throw new Error(response.status===401||response.status===403?'登录已失效，请重新登录后同步。':`云存档暂不可用（${response.status}），进度已保留在本机。`);
  return response.json();
 }
 return {
  read:async()=>{const rows=await request(`jrpg_cloud_saves?select=version,payload,updated_at,last_request&user_id=eq.${encodeURIComponent(owner)}`);return rows.length?checkpoint(rows[0]):null;},
  write:async(version,payload,requestId)=>{
   if(!validSave(payload))throw new Error('本地存档格式错误，未上传。');
   const rows=await request('rpc/save_jrpg_checkpoint',{p_expected_version:version,p_payload:payload,p_request_id:requestId});
   return checkpoint(rows[0]);
  },
 };
}
