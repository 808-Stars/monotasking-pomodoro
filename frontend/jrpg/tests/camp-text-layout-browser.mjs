import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='output/camp-text-layout-20261102';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const report={samples:[],errors:[],pinch:[],widthProtection:[]};
const sameLayout=(a,b)=>a.length===b.length&&a.every((n,i)=>{
 const other=b[i];return Math.abs(n.width-other.width)<.1&&Math.abs(n.height-other.height)<.1&&
 ['text','tag','font','fontSize','display','wordBreak','lines'].every(k=>JSON.stringify(n[k])===JSON.stringify(other[k]));
});
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:{width:1920,height:1080},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1,...(mobile?{userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'}:{})});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:5178/',{waitUntil:'networkidle'});
  const f=await(await page.waitForSelector('iframe[data-game-viewport]')).contentFrame();
  await f.locator('.camp-town-place').first().waitFor();
  for(let scene=0;scene<8;scene++){
   await f.locator('.camp-town-place').nth(scene).click();await f.locator('.camp-conversation').waitFor();await f.evaluate(()=>document.fonts.ready);
   for(const size of [{width:1920,height:1080},{width:900,height:1400},{width:390,height:844}]){
    await page.setViewportSize(size);
    await page.waitForFunction(({width,height})=>Math.abs(Number(document.querySelector('[data-game-scale]')?.dataset.gameScale)-Math.min(width/1920,height/1080))<1e-7,size);
    const snapshot=()=>f.evaluate(()=>{
     const selector='.camp-conversation .spoken,.camp-conversation .dialogue-options button span,.camp-conversation .dialogue-options button small,.scene-title h1,.scene-title p,.camp-conversation .speaker span';
     return [...document.querySelectorAll(selector)].map(n=>{
      const style=getComputedStyle(n),r=n.getBoundingClientRect();
      const lines=[];const walker=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);let node;
      while(node=walker.nextNode())for(let i=0;i<node.length;i++){
       const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const a=range.getBoundingClientRect();
       const y=Math.round(a.y*10)/10;let line=lines.find(l=>Math.abs(l.y-y)<1);if(!line){line={y,text:''};lines.push(line);}line.text+=node.textContent[i];
      }
      return {text:n.textContent,tag:n.tagName,width:Math.round(r.width*100)/100,height:Math.round(r.height*100)/100,font:style.font,fontSize:style.fontSize,display:style.display,wordBreak:style.wordBreak,lines:lines.map(l=>l.text)};
     });
    });
    const sample=await snapshot();
    report.samples.push({mobile,scene,size,content:sample});
    if(mobile&&size.width===390){
     const cdp=await context.newCDPSession(page);
     for(const scale of [1.5,2,1]){
      await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:scale});
      const actual=await page.evaluate(()=>visualViewport.scale);
      const content=await snapshot();
      if(!sameLayout(content,sample)){report.mismatch={sample,content};throw Error(`Text reflow during mobile zoom: scene ${scene}, scale ${scale}`);}
      if(Math.abs(actual-scale)>.01)throw Error('Pinch scale did not change');
      report.pinch.push({scene,requestedScale:scale,actualScale:actual});
     }
     await cdp.detach();
     const protect=await f.locator('.spoken').evaluate(n=>{
      const before=n.getBoundingClientRect().width;n.style.width='5em';
      const after=n.getBoundingClientRect().width;n.style.removeProperty('width');return {before,after};
     });
     if(Math.abs(protect.before-protect.after)>.01)throw Error('Paragraph allowed to shrink to five characters');
     report.widthProtection.push({scene,...protect});
     await f.getByRole('button',{name:'屏幕旋转',exact:true}).click();
     await f.locator('[data-rotation="90"]').waitFor();
     const cdpRotate=await context.newCDPSession(page);
     const beforeRotate=await snapshot();
     await cdpRotate.send('Input.synthesizePinchGesture',{x:195,y:422,scaleFactor:1.5,gestureSourceType:'touch'});
     const gestureScale=await page.evaluate(()=>visualViewport.scale);
     // Headless Edge can acknowledge touch gestures without zooming. Require an
     // actual visual-viewport zoom as well, rather than reporting that as passed.
     await cdpRotate.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
     const zoomScale=await page.evaluate(()=>visualViewport.scale);
     if(Math.abs(zoomScale-2)>.01)throw Error('Rotated visual viewport did not zoom');
     const afterRotate=await snapshot();
     const linesOnly=a=>a.map(n=>({text:n.text,font:n.font,lines:n.lines}));
     if(JSON.stringify(linesOnly(beforeRotate))!==JSON.stringify(linesOnly(afterRotate)))throw Error('Rotated pinch changed line breaks');
     report.pinch.push({scene,rotation:90,gestureScale,method:'visual viewport emulation',actualScale:zoomScale});
     await cdpRotate.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await cdpRotate.detach();
     if(scene===2)await page.screenshot({path:`${out}/rotated-shop-dialogue.png`});
     await f.getByRole('button',{name:'退出旋转',exact:true}).click();
     if(scene===2||scene===3){
      await f.getByRole('button',{name:scene===2?'看看你有什么货':'翻阅首领记录',exact:true}).click();
      await f.locator('.modal').first().waitFor();
      const measure=()=>f.locator('.modal').first().evaluate(n=>({width:n.clientWidth,height:n.clientHeight,text:n.textContent,font:getComputedStyle(n).fontSize}));
      const before=await measure(),modalCdp=await context.newCDPSession(page);
      await modalCdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
      if(JSON.stringify(before)!==JSON.stringify(await measure()))throw Error('Related modal reflowed');
      report.pinch.push({scene,kind:'modal',scale:2});
      await modalCdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await modalCdp.detach();
      await f.getByRole('button',{name:'关闭 ×',exact:true}).click();
     }
    }
   }
   if(scene===2)await page.screenshot({path:`${out}/${mobile?'mobile':'desktop'}-shop.png`});
   await page.setViewportSize({width:1920,height:1080});await f.locator('.camp-map-return').click();
  }
  await context.close();
 }
 const changes=[];
 for(const mobile of [false,true])for(let scene=0;scene<8;scene++){
  const samples=report.samples.filter(s=>s.mobile===mobile&&s.scene===scene),base=samples[0];
  for(const s of samples.slice(1))if(!sameLayout(s.content,base.content))changes.push({mobile,scene,size:s.size});
 }
 report.changes=changes;
 if(changes.length||report.errors.length)throw Error('Unexpected text layout changes');
 report.status='passed';console.log(JSON.stringify({samples:report.samples.length,pinch:report.pinch.length,widthProtection:report.widthProtection.length,changes,errors:report.errors}));
}finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
