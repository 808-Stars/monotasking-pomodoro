import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createGame} from '../src/game/economy.ts';
import {migrateCamp} from '../src/game/camp/migrate.ts';
const base=process.env.MONOPOMO_TEST_ORIGIN??'http://127.0.0.1:5178/';
const tag=process.env.TEST_TAG??'source',out='output/shop-passes-20261102';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const game=migrateCamp(createGame());game.coins=100000;game.camp.shopSpent=999999;
const context=await browser.newContext({viewport:{width:1920,height:1080}});
await context.addInitScript(save=>{if(!localStorage.getItem('monopomo-jrpg-demo-v1'))localStorage.setItem('monopomo-jrpg-demo-v1',JSON.stringify(save));},{revision:0,game,battle:null});
const page=await context.newPage(),report={checks:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
async function open(){await page.goto(base);const f=await(await page.waitForSelector('iframe[data-game-viewport]')).contentFrame();await f.locator('.camp-town-map').waitFor({timeout:120000});await f.getByRole('button',{name:/^商店：/}).click();return f;}
async function read(f){return f.evaluate(()=>JSON.parse(localStorage.getItem('monopomo-jrpg-demo-v1')));}
async function buy(f,name){
 await f.locator('.shop-counter-product').filter({hasText:name}).click();await f.getByRole('button',{name:'加入购物篮',exact:true}).click();
 await f.getByRole('button',{name:'预览结账',exact:true}).click();await f.getByRole('button',{name:'确认提交',exact:true}).click();
 await f.locator('.camp-confirm').waitFor({state:'hidden'});await f.locator('.shop-counter').waitFor();
}
try{
 let f=await open();assert.ok(await f.getByRole('button',{name:/^来点狠货怎么样/}).isDisabled());
 assert.ok(await f.getByRole('button',{name:/^来点……你懂的/}).isDisabled());report.checks.push('large historic spending grants no access');
 await f.getByRole('button',{name:'看看你有什么货',exact:true}).click();
 await buy(f,'神秘购买凭证');assert.ok(await f.getByRole('button',{name:/^神秘商店/}).isEnabled());assert.ok(await f.getByRole('button',{name:/^专业商店/}).isDisabled());
 report.checks.push('mystery pass bought in normal shelf unlocks only mystery');
 await f.getByRole('button',{name:/^神秘商店/}).click();await f.getByRole('button',{name:/^普通商店/}).click();
 await buy(f,'专业购买凭证');assert.ok(await f.getByRole('button',{name:/^专业商店/}).isEnabled());
 let s=await read(f);assert.equal(s.game.coins,82000);assert.equal(s.game.inventory['shop-pass-mystery'],1);assert.equal(s.game.inventory['shop-pass-professional'],1);
 report.checks.push('both vouchers remain in inventory; exactly 18000 coins charged');
 await page.screenshot({path:`${out}/${tag}.png`});f=await open();
 assert.ok(await f.getByRole('button',{name:'来点狠货怎么样',exact:true}).isEnabled());assert.ok(await f.getByRole('button',{name:'来点……你懂的',exact:true}).isEnabled());
 assert.equal((await read(f)).game.inventory['shop-pass-mystery'],1);report.checks.push('reload and re-enter preserve access without consuming passes');
 assert.deepEqual(report.errors,[]);report.status='passed';console.log(JSON.stringify(report));
}catch(error){report.status='failed';report.error=String(error);await page.screenshot({path:`${out}/${tag}-failure.png`}).catch(()=>{});throw error;}
finally{await writeFile(`${out}/${tag}.json`,JSON.stringify(report,null,2));await browser.close();}
