import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const output='output/rotation-fit-20261101';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage(),report={checks:[],errors:[],measurements:[]};
page.on('pageerror',e=>report.errors.push(e.message));
const base=process.env.MONOPOMO_TEST_ORIGIN??'http://127.0.0.1:5178';
async function open(path){
 await page.goto(base+path,{waitUntil:'networkidle'});
 const frame=await(await page.waitForSelector('iframe[data-game-viewport]')).contentFrame();
 await frame.locator('.scene-display-canvas').waitFor();return frame;
}
async function fit(frame,angle){
 const {width,height}=page.viewportSize();
 const expected=Math.min(width/(angle%180?1080:1920),height/(angle%180?1920:1080));
 await page.waitForFunction(({angle,expected})=>{
  const stage=document.querySelector('.game-viewport-stage');
  return Number(stage?.getAttribute('data-game-rotation'))===angle&&Math.abs(Number(stage?.getAttribute('data-game-scale'))-expected)<1e-7;
 },{angle,expected});
 await frame.waitForFunction(()=>{
  const viewport=document.querySelector('.scene-display-viewport'),canvas=document.querySelector('.scene-display-canvas');
  const v=viewport.getBoundingClientRect(),c=canvas.getBoundingClientRect();
  return v.x===0&&v.y===0&&Math.abs(c.width-1920)<1&&Math.abs(c.height-1080)<1;
 });
 const rect=await page.locator('.game-viewport-stage').boundingBox();
 assert.ok(Math.abs(rect.width-(angle%180?1080:1920)*expected)<1);
 assert.ok(Math.abs(rect.height-(angle%180?1920:1080)*expected)<1);
 assert.ok(Math.abs(rect.x-(width-rect.width)/2)<1&&Math.abs(rect.y-(height-rect.height)/2)<1);
 assert.deepEqual(await frame.evaluate(()=>({width:innerWidth,height:innerHeight})),{width:1920,height:1080});
 assert.equal(await frame.locator('.scene-display-canvas .topbar').count(),0);
 report.measurements.push({browser:{width,height},angle,scale:expected,rect});
}
async function normal(frame){
 await frame.locator('.scene-display-expanded').waitFor({state:'hidden'});
 await page.waitForFunction(()=>document.querySelector('.game-viewport-stage')?.getAttribute('data-game-rotation')==='0');
 assert.equal(await frame.locator('.scene-display-canvas').getAttribute('data-rotation'),'0');
}
async function check(name,run){await run();report.checks.push(name);console.log(`PASS ${name}`);}
try{
 let frame=await open('/');
 await check('390x844 camp rotation uses physical viewport',async()=>{
  await frame.getByRole('button',{name:'屏幕旋转',exact:true}).click();await fit(frame,90);
  await page.screenshot({path:`${output}/camp-390x844-90.png`});
 });
 await check('resizing while rotated recalculates one global scale',async()=>{
  await page.setViewportSize({width:1080,height:1920});await fit(frame,90);
  await page.screenshot({path:`${output}/camp-1080x1920-90.png`});
  await page.setViewportSize({width:844,height:390});await fit(frame,90);
  await page.setViewportSize({width:390,height:844});await fit(frame,90);
 });
 await check('rotated camp dialog remains clickable and inside logical scene',async()=>{
  await frame.getByRole('button',{name:/^商店：/}).click();
  await frame.getByRole('button',{name:'看看你有什么货',exact:true}).click();
  await frame.locator('.shop-counter').waitFor();
  const r=await frame.locator('.shop-counter').evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};});
  assert.ok(r.x>=0&&r.y>=0&&r.right<=1920&&r.bottom<=1080);
  await page.screenshot({path:`${output}/shop-rotated.png`});
  await frame.getByRole('button',{name:'关闭 ×',exact:true}).click();
 });
 await check('90 180 270 and zero use the same host and restore original layout',async()=>{
  for(const angle of [180,270]){await frame.getByRole('button',{name:'继续旋转画面',exact:true}).click();await fit(frame,angle);}
  await frame.getByRole('button',{name:'继续旋转画面',exact:true}).click();await normal(frame);
  await frame.getByRole('button',{name:'屏幕旋转',exact:true}).click();await fit(frame,90);
  await page.keyboard.press('Escape');await normal(frame);
 });
 await check('web fullscreen rotation and Escape restore only the scene',async()=>{
  await frame.getByRole('button',{name:'网页全屏',exact:true}).click();await fit(frame,0);
  await frame.getByRole('button',{name:'继续旋转画面',exact:true}).click();await fit(frame,90);
  await page.keyboard.press('Escape');await normal(frame);
 });
 await check('native fullscreen rotation and explicit exit restore browser presentation',async()=>{
  await frame.getByRole('button',{name:'屏幕全屏',exact:true}).click();
  await page.waitForFunction(()=>document.fullscreenElement!==null);await fit(frame,0);
  await frame.getByRole('button',{name:'继续旋转画面',exact:true}).click();await fit(frame,90);
  await frame.getByRole('button',{name:'退出全屏',exact:true}).click();
  await page.waitForFunction(()=>document.fullscreenElement===null);await normal(frame);
 });
 for(const [name,path] of [['departure','/dungeon-departure.html'],['battle','/battle-theatre.html']]){
  await check(`${name} shares physical rotation and restores with close`,async()=>{
   await page.setViewportSize({width:900,height:1400});frame=await open(path);
   if(name==='battle')await frame.locator('[data-battle-scene="main"]').waitFor({timeout:25000});
   await frame.getByRole('button',{name:'屏幕旋转',exact:true}).click();await fit(frame,90);
   await page.screenshot({path:`${output}/${name}-rotated.png`});
   await frame.getByRole('button',{name:'退出旋转',exact:true}).click();await normal(frame);
  });
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);report.stack=error.stack;await page.screenshot({path:`${output}/failure.png`}).catch(()=>{});throw error;}
finally{await writeFile(`${output}/result.json`,JSON.stringify(report,null,2));await browser.close();}
