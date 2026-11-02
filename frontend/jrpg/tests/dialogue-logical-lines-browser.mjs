import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='output/dialogue-logical-lines-20261102';await mkdir(out,{recursive:true});
const base=process.env.MONOPOMO_TEST_ORIGIN??'http://127.0.0.1:5178/';
const browser=await chromium.launch({channel:'msedge',headless:true,...(base.startsWith('https:')?{proxy:{server:'http://127.0.0.1:10808',bypass:'127.0.0.1,localhost'}}:{})});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const report={checks:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
async function lines(f){return f.locator('p.spoken').evaluate(n=>{
 const walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),rows=[];let node;
 while(node=walker.nextNode())for(let i=0;i<node.length;i++){
  if(!node.textContent[i].trim())continue;
  const r=document.createRange();r.setStart(node,i);r.setEnd(node,i+1);const rect=r.getBoundingClientRect();
  let row=rows.find(x=>Math.abs(x.y-rect.y)<1);if(!row){row={y:rect.y,text:''};rows.push(row);}row.text+=node.textContent[i];
 }return rows.map(r=>r.text);
});}
try{
 await page.goto(base);
 const f=await(await page.waitForSelector('iframe[data-game-viewport]')).contentFrame();await f.locator('.camp-town-map').waitFor({timeout:120000});
 await f.locator('.camp-town-place').nth(7).click();await f.locator('p.spoken').waitFor();await f.evaluate(()=>document.fonts.ready);
 report.before=await lines(f);assert.equal(report.before.length,1,'short line must use available scene width');
 await f.addStyleTag({content:'p.spoken {width:500px!important;min-width:0!important;max-width:500px!important}'});
 report.narrow=await lines(f);
 if(process.env.DIAGNOSE){console.log(JSON.stringify({before:report.before.length,narrow:report.narrow.length}));}
 else{
  assert.equal(report.narrow.length,1,'browser narrowing a paragraph must not reflow a short logical line');
  report.checks.push('apothecary sentence remains one line under paragraph narrowing');
  await f.getByRole('button',{name:'屏幕旋转',exact:true}).click();
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
  assert.equal((await lines(f)).length,1);report.checks.push('rotation and visual zoom preserve that one line');
  await page.screenshot({path:`${out}/apothecary-rotated.png`});
  await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await f.getByRole('button',{name:'退出旋转',exact:true}).click();
  assert.equal(await f.locator('[data-dialogue-source]').count(),1);
  await f.locator('.camp-map-return').click();
  for(let scene=0;scene<8;scene++){
   await f.locator('.camp-town-place').nth(scene).click();await f.locator('p.spoken').waitFor();
   assert.equal((await lines(f)).length,1,`scene ${scene} short dialogue is one line`);
   await f.locator('.camp-map-return').click();
  }
  report.checks.push('all eight short scene dialogues are one line, not merely stable across zoom');
  if(base==='http://127.0.0.1:5178/'){
   const long=await f.evaluate(async()=>{const {checkLong}=await import('/tests/dialogue-long-fixture.tsx');return checkLong();});
   assert.ok(long.lines>1);assert.ok(long.fits);assert.ok(long.complete);report.long=long;
   report.checks.push('long dialogue remains complete and fits multiple logical lines');
  }
  assert.deepEqual(report.errors,[]);report.status='passed';console.log(JSON.stringify(report));
 }
}catch(error){report.error=String(error);report.status='failed';throw error;}
finally{await writeFile(`${out}/${process.env.DIAGNOSE?'diagnosis':process.env.TEST_TAG??'result'}.json`,JSON.stringify(report,null,2));await browser.close();}
