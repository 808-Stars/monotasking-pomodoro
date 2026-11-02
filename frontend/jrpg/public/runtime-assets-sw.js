// Own only same-origin JRPG asset requests. Never cache auth, saves or HTML.
const root=new URL('./',self.location.href),stateKey=new URL('__runtime_asset_cache__',root).href;
let active;
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 if(event.data?.type==='runtime-assets-ready'&&typeof event.data.cache==='string'&&event.data.cache.startsWith('jrpg-assets-v1-')){
  active=event.data.cache;event.ports[0]?.postMessage('ready');
 }
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==root.origin||!url.pathname.startsWith(root.pathname+'assets/')||url.searchParams.has('jrpg-preload'))return;
 event.respondWith((async()=>{
  try{
  if(!active){const meta=await (await caches.open('jrpg-assets-state')).match(stateKey);if(meta)active=(await meta.json()).cache;}
  if(active){const cached=await (await caches.open(active)).match(event.request,{ignoreSearch:true});if(cached)return cached;}
  }catch{/* Storage may be disabled or cleared; retain ordinary network loading. */}
  return fetch(event.request);
 })());
});
