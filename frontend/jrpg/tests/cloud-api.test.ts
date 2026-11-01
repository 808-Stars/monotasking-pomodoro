import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game/economy.ts';
import {createCheckpointAPI,CloudConflict,CloudIdentityChanged,validSave} from '../src/cloud/api.ts';
const save={revision:1,game:createGame(),battle:null};
const session=async()=>({user:{id:'owner-a'},access_token:'test-access-token'});
test('cloud payload validation accepts a complete checkpoint, rejects corrupt input',()=>{
 assert.ok(validSave(save));
 for(const raw of [null,{}, {...save,revision:-1},{...save,game:{}},{...save,battle:[]}])assert.equal(validSave(raw),false);
});
test('cloud requests capture the owner token and filter reads by owner',async()=>{
 let url='',headers:HeadersInit|undefined;
 const api=createCheckpointAPI('https://example.invalid','public-key','owner-a',session,async(input,init)=>{
  url=String(input);headers=init?.headers;return Response.json([{version:1,payload:save,updated_at:'2026-11-01T00:00:00Z'}]);
 });
 assert.equal((await api.read())?.payload.revision,1);
 assert.match(url,/user_id=eq.owner-a/);assert.equal(new Headers(headers).get('Authorization'),'Bearer test-access-token');
});
test('switching accounts rejects pending requests before any network operation',async()=>{
 let requests=0;
 const api=createCheckpointAPI('https://example.invalid','key','other-owner',session,async()=>{requests++;return Response.json([]);});
 await assert.rejects(api.write(0,save,crypto.randomUUID()),CloudIdentityChanged);assert.equal(requests,0);
});
test('writes carry the expected version and unchanged request ID; 409 is a conflict',async()=>{
 const id=crypto.randomUUID();let body:Record<string,unknown>={};
 const api=createCheckpointAPI('https://example.invalid','key','owner-a',session,async(_input,init)=>{
  body=JSON.parse(String(init?.body));return Response.json({}, {status:409});
 });
 await assert.rejects(api.write(7,save,id),CloudConflict);
 assert.equal(body.p_expected_version,7);assert.equal(body.p_request_id,id);assert.deepEqual(body.p_payload,save);
});
test('malformed cloud data is never silently accepted as a new game',async()=>{
 const api=createCheckpointAPI('https://example.invalid','key','owner-a',session,async()=>Response.json([{version:1,payload:{},updated_at:'now'}]));
 await assert.rejects(api.read(),/无法读取/);
});
test('401 refreshes once and retries with the same mutation ID',async()=>{
 const id=crypto.randomUUID(),tokens:string[]=[],ids:string[]=[],refreshes:boolean[]=[];
 const api=createCheckpointAPI('https://example.invalid','key','owner-a',async refresh=>{
  refreshes.push(!!refresh);return {user:{id:'owner-a'},access_token:refresh?'fresh':'old'};
 },async(_input,init)=>{
  tokens.push(new Headers(init?.headers).get('Authorization')!);ids.push(JSON.parse(String(init?.body)).p_request_id);
  return tokens.length===1?Response.json({}, {status:401}):Response.json([{version:2,payload:save,updated_at:'now'}]);
 });
 await api.write(1,save,id);assert.deepEqual(refreshes,[false,true]);assert.deepEqual(tokens,['Bearer old','Bearer fresh']);assert.deepEqual(ids,[id,id]);
});
test('401 cannot retry a save under a newly switched account',async()=>{
 let requests=0;
 const api=createCheckpointAPI('https://example.invalid','key','owner-a',async refresh=>({user:{id:refresh?'owner-b':'owner-a'},access_token:'test'}),async()=>{
  requests++;return Response.json({}, {status:401});
 });
 await assert.rejects(api.write(1,save,crypto.randomUUID()),CloudIdentityChanged);assert.equal(requests,1);
});
