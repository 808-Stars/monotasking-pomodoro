import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='output/runtime-assets-20261102';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1920,height:1080}}),page=await context.newPage();
const report={checks:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
const requests=new Map();page.on('request',r=>{if(r.url().includes('/assets/'))requests.set(r.url(),(requests.get(r.url())??0)+1);});
let failing=true;await context.route('**/assets/head-logos/warrior.png*',async route=>{if(failing)await route.abort();else await route.continue();});
try{
 await page.goto('http://127.0.0.1:5178/');
 const f=await(await page.waitForSelector('iframe[data-game-viewport]')).contentFrame();
 await f.getByRole('progressbar').waitFor();assert.equal(await f.locator('.camp-town-map').count(),0);
 await f.getByRole('button',{name:'重试未完成素材',exact:true}).waitFor({timeout:120000});
 assert.equal(await f.locator('.camp-town-map').count(),0);assert.ok(Number(await f.getByRole('progressbar').getAttribute('aria-valuenow'))<100);
 await page.screenshot({path:`${out}/retry.png`});
 report.checks.push('full manifest preloaded before game; failure blocks entry with truthful progress and retry');
 const before=new Map(requests);failing=false;await f.getByRole('button',{name:'重试未完成素材',exact:true}).click();
 await f.locator('.camp-town-map').waitFor({timeout:30000});
 const changed=[...requests].filter(([url,n])=>n>(before.get(url)??0));
 assert.ok(changed.some(([url])=>new URL(url).pathname.endsWith('/head-logos/warrior.png')));
 assert.ok(changed.length<before.size/2,'retry does not restart the full preload; DOM image references are expected');
 report.checks.push('retry recovers failed image without restarting the full asset queue');
 await f.getByRole('button',{name:/^商店：/}).click();await f.getByRole('button',{name:'看看你有什么货',exact:true}).click();await f.locator('.shop-counter').waitFor();
 assert.ok(await f.locator('.shop-counter img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0)));
 report.checks.push('camp and shop open with complete image resources after preload');
 await page.screenshot({path:`${out}/shop.png`});
 await context.unroute('**/assets/head-logos/warrior.png*');
 const cachedContext=await browser.newContext({viewport:{width:1920,height:1080}}),cachedPage=await cachedContext.newPage();
 await cachedPage.goto('http://127.0.0.1:5178/');
 let again=await(await cachedPage.waitForSelector('iframe[data-game-viewport]')).contentFrame();await again.locator('.camp-town-map').waitFor({timeout:120000});
 await cachedPage.reload();again=await(await cachedPage.waitForSelector('iframe[data-game-viewport]')).contentFrame();
 await again.locator('.camp-town-map').waitFor({timeout:120000});
 report.cached=await again.evaluate(()=>{
  const entries=performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/'));
  return {count:entries.length,withoutNetwork:entries.filter(e=>e.transferSize===0).length,
   revalidatedBody:entries.filter(e=>e.transferSize>0&&e.transferSize<e.encodedBodySize).length,
   transferredBytes:entries.reduce((n,e)=>n+e.transferSize,0),decodedBytes:entries.reduce((n,e)=>n+e.decodedBodySize,0)};
 });
 assert.ok(report.cached.withoutNetwork+report.cached.revalidatedBody>report.cached.count/2,'browser cache bodies reused, including conditional revalidation');await cachedContext.close();
 report.checks.push('re-entering loads successfully using available browser cache');
 await context.route('**/runtime-assets.json',r=>r.fulfill({status:503,body:'Unavailable'}));
 await page.reload();const errorFrame=await(await page.waitForSelector('iframe[data-game-viewport]')).contentFrame();
 await errorFrame.getByRole('alert').waitFor();assert.equal(await errorFrame.locator('.camp-town-map').count(),0);
 await context.unroute('**/runtime-assets.json');await errorFrame.getByRole('button',{name:'重试未完成素材',exact:true}).click();
 await errorFrame.locator('.camp-town-map').waitFor({timeout:120000});
 report.checks.push('manifest network failure is recoverable without clearing or resetting save');
 assert.deepEqual(report.errors,[]);report.status='passed';console.log(JSON.stringify(report));
}catch(error){report.status='failed';report.error=String(error);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/result.json`,JSON.stringify(report,null,2));await browser.close();}
