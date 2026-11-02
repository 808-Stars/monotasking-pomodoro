import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyBattleInventory} from '../src/game/economy.ts';
import {migrateCamp} from '../src/game/camp/migrate.ts';
import {checkout,shopLevel} from '../src/game/camp/shop.ts';
import {warehouseQuantity,transferItem,setBackpack,battleBackpack} from '../src/game/camp/backpack.ts';
import {craft} from '../src/game/camp/medicine.ts';
test('warehouse passes unlock independently; spending no longer opens shelves',()=>{
 let g=migrateCamp(createGame());g.coins=50000;g.camp!.backpack={};
 assert.equal(shopLevel(g),0);assert.throws(()=>checkout(g,{concentrate:1}));
 g=checkout(g,{hp:30});assert.equal(g.camp!.shopSpent,3000);assert.equal(shopLevel(g),0);
 g=checkout(g,{'shop-pass-professional':1});assert.equal(shopLevel(g),1);
 g=checkout(g,{'shop-pass-mystery':1});assert.equal(shopLevel(g),2);
 const before=structuredClone(g);assert.throws(()=>checkout(g,{hp:1000}));assert.deepEqual(g,before);
});

test('single transfers conserve ownership, block growth items and capacity overflow',()=>{
 let g=migrateCamp(createGame());g.inventory={hp:8,sp:5,revive:5,'hp-full':5,concentrate:4};g.camp!.backpack={};
 g=transferItem(g,'hp','bag');assert.equal(warehouseQuantity(g,'hp'),7);assert.equal(g.inventory.hp,8);
 assert.throws(()=>transferItem(g,'concentrate','bag'));
 g=setBackpack(g,{hp:5,sp:5,revive:5,'hp-full':5});assert.throws(()=>transferItem(g,'hp','bag'));
 g=transferItem(g,'hp','warehouse');assert.equal(battleBackpack(g).hp,4);assert.equal(warehouseQuantity(g,'hp'),4);
});
test('crafting cannot take carried medicine; purchasing does not auto-equip; battle consumes only bag',()=>{
 let g=migrateCamp(createGame());g.inventory={hp:1,concentrate:1};g.camp!.backpack={hp:1};g.coins=1000;
 assert.throws(()=>craft(g,'hp-concentrated',1),/仓库/);
 g=checkout(g,{hp:1});assert.equal(warehouseQuantity(g,'hp'),1);assert.equal(battleBackpack(g).hp,1);
 g=applyBattleInventory(g,{hp:0},{hp:1});assert.equal(g.inventory.hp,1);assert.equal(warehouseQuantity(g,'hp'),1);
});
