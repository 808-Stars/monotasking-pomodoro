import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='output/default-rotation-20261102';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),report={checks:[],errors:[]};
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
async function open(path='/'){
 await page.goto(`http://127.0.0.1:5178${path}`);
 const f=await(await page.waitForSelector('iframe[data-game-viewport]')).contentFrame();
 await f.locator('.scene-display-canvas').waitFor({timeout:120000});return f;
}
async function angle(f,value){
 await f.locator(`.scene-display-canvas[data-rotation="${value}"]`).waitFor();
 await page.waitForFunction(value=>Number(document.querySelector('[data-game-rotation]')?.getAttribute('data-game-rotation'))===value,value);
}
try{
 let f=await open();await angle(f,90);await page.screenshot({path:`${out}/portrait-default.png`});report.checks.push('390x844 initial scene automatically rotates exactly 90 degrees');
 await f.getByRole('button',{name:'退出旋转',exact:true}).click();await angle(f,0);
 await f.locator('.camp-town-place').nth(7).click();await f.locator('p.spoken').waitFor();await angle(f,0);
 await page.setViewportSize({width:400,height:900});await angle(f,0);
 report.checks.push('manual restore survives scene navigation and resizing without forced rotation');
 await page.setViewportSize({width:1920,height:1080});f=await open();await angle(f,0);report.checks.push('landscape defaults to zero rotation');
 await page.setViewportSize({width:1080,height:1920});f=await open('/dungeon-departure.html');await angle(f,90);
 const rect=await page.locator('.game-viewport-stage').boundingBox();assert.ok(Math.abs(rect.width-1080)<1&&Math.abs(rect.height-1920)<1);
 report.checks.push('portrait departure preview rotates and fills 1080x1920');
 await f.getByRole('button',{name:'继续旋转画面',exact:true}).click();await angle(f,180);await f.getByRole('button',{name:'继续旋转画面',exact:true}).click();await angle(f,270);
 await page.keyboard.press('Escape');await angle(f,0);report.checks.push('manual rotation and Escape retain priority over default');
 await page.setViewportSize({width:390,height:844});f=await open('/battle-theatre.html');await angle(f,90);report.checks.push('battle theatre shares initial portrait orientation');
 assert.deepEqual(report.errors,[]);report.status='passed';console.log(JSON.stringify(report));
}catch(error){report.status='failed';report.error=String(error);throw error;}
finally{await writeFile(`${out}/result.json`,JSON.stringify(report,null,2));await browser.close();}
