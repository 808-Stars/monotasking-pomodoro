import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game/economy.ts';
import {migrateCamp} from '../src/game/camp/migrate.ts';
import {checkout,hasShopAccess} from '../src/game/camp/shop.ts';
import {rollMonth} from '../src/game/camp/month.ts';
import {setBackpack} from '../src/game/camp/backpack.ts';
test('mystery does not imply professional; spending cannot substitute for passes',()=>{
 let g=migrateCamp(createGame());g.coins=100000;g.camp!.shopSpent=999999;
 assert.ok(hasShopAccess(g,0));assert.ok(!hasShopAccess(g,1));assert.ok(!hasShopAccess(g,2));
 g=checkout(g,{'shop-pass-mystery':1});assert.equal(g.coins,85000);
 assert.ok(hasShopAccess(g,2));assert.ok(!hasShopAccess(g,1));assert.throws(()=>checkout(g,{concentrate:1}));
 const bought=checkout(g,{'memory-scroll':1});assert.equal(bought.inventory['shop-pass-mystery'],1);
 assert.throws(()=>setBackpack(g,{'shop-pass-mystery':1}));
});
test('passes remain owned across normal purchases, but reset next month',()=>{
 let g=migrateCamp(createGame(),Date.UTC(2026,10,2));g.coins=3000;
 g=checkout(g,{'shop-pass-professional':1});assert.equal(g.coins,0);assert.ok(hasShopAccess(g,1));
 const next=rollMonth(g,Date.UTC(2026,11,2));assert.ok(!hasShopAccess(next,1));assert.ok(hasShopAccess(next,0));
});
test('failed orders are atomic and a pass cannot unlock another item in the same transaction',()=>{
 const g=migrateCamp(createGame());g.coins=3000;const before=structuredClone(g);
 assert.throws(()=>checkout(g,{'shop-pass-professional':1,concentrate:1}));assert.deepEqual(g,before);
 assert.throws(()=>checkout(g,{'shop-pass-mystery':1}));assert.deepEqual(g,before);
});
