import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={errors};
try{
 await page.goto('http://127.0.0.1:5190/jrpg/');
 const f=await(await page.waitForSelector('iframe[data-game-viewport]')).contentFrame();
 await f.locator('.camp-town-map').waitFor({timeout:120000});
 const details=await f.evaluate(async()=>{
  const response=await fetch('/jrpg/runtime-assets.json'),manifest=await response.json();
  const names=(await caches.keys()).filter(n=>n.startsWith('jrpg-assets-v1-'));
  const cache=await caches.open(names[0]);
  return {count:manifest.assets.length,bytes:manifest.totalBytes,cached:(await cache.keys()).length,
   allPrefixed:manifest.assets.every(a=>a.url.startsWith('/jrpg/assets/')),controller:navigator.serviceWorker.controller?.scriptURL};
 });
 assert.equal(details.count,details.cached);assert.ok(details.allPrefixed);assert.ok(details.controller.endsWith('/jrpg/runtime-assets-sw.js'));
 const worker=page.context().serviceWorkers()[0];
 await worker.evaluate(()=>{globalThis.savedCacheOpen=caches.open.bind(caches);caches.open=()=>Promise.reject(Error('test storage unavailable'));});
 assert.equal(await f.evaluate(async()=>{const r=await fetch('/jrpg/assets/head-logos/warrior.webp?fallback-check=1');return r.ok&&(await r.blob()).size>0;}),true);
 await worker.evaluate(()=>{caches.open=globalThis.savedCacheOpen;});
 report.storageFailureFallback='passed';
 await f.getByRole('button',{name:/^商店：/}).click();await f.getByRole('button',{name:'看看你有什么货',exact:true}).click();await f.locator('.shop-counter').waitFor();
 assert.ok(await f.locator('.shop-counter img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
 await page.screenshot({path:'output/runtime-assets-20261102/release-shop.png'});
 assert.deepEqual(errors,[]);Object.assign(report,{status:'passed',...details});console.log(JSON.stringify(report));
}catch(error){report.status='failed';report.error=String(error);throw error;}
finally{await writeFile('output/runtime-assets-20261102/release-result.json',JSON.stringify(report,null,2));await browser.close();}
