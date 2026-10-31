import {rewards,type GameState} from "../../game/economy.ts";
import {battleBackpack,warehouseQuantity,transferItem} from "../../game/camp/backpack.ts";
import {battleMedicines,medicineEffects} from "../../game/camp/medicineEffects.ts";
import {products,itemName} from "../../game/camp/catalog.ts";
import {CampItemMark} from "./CampArtwork.tsx";
import {ItemPages} from "../PageTurns.tsx";
import "./tavern.css";
import {useState} from "react";
export default function BackpackEditor({game,busy,onSave}: {
 game:GameState;busy:boolean;onSave:(selection:Record<string,number>)=>void;
}) {
 const bag=battleBackpack(game),total=Object.values(bag).reduce((a,b)=>a+b,0);
 const ids=Object.keys(game.inventory).filter(id=>warehouseQuantity(game,id)>0);
 const [inspected,setInspected]=useState<string|null>(null);
 const label=(id:string)=>battleMedicines.find(m=>m.id===id)?.name??rewards.find(r=>r.id===id)?.name??itemName(id);
 function cell(id:string,side:"bag"|"warehouse") {
  const combat=Object.hasOwn(medicineEffects,id),qty=side==="bag"?bag[id]:warehouseQuantity(game,id);
  const reason=!combat?"成长物品：不能带入战斗":side==="warehouse"&&total>=20?"背包已满20/20件":side==="warehouse"&&(bag[id]??0)>=5?"该物品已携带5/5件":"";
  const reward=rewards.find(r=>r.id===id);
  const info=battleMedicines.find(m=>m.id===id)?.description??products.find(p=>p.id===id)?.description??(reward?`${reward.rarity}战利品；在对应营地资源功能中处理，不是战斗药品。`:"仓库物品；在对应营地功能中使用。");
  return <button type="button" key={id} className="storage-cell" disabled={busy} aria-disabled={!!reason}
    title={`${label(id)}\n${combat?"战斗物品":"成长物品"}：${info}\n仓库 ${warehouseQuantity(game,id)} · 背包 ${bag[id]??0}\n${reason||`点击将1件移至${side==="bag"?"仓库":"背包"}`}`}
    onMouseEnter={()=>setInspected(id)} onFocus={()=>setInspected(id)}
    onClick={()=>{if(!reason)onSave(battleBackpack(transferItem(game,id,side==="bag"?"warehouse":"bag")));}}>
    <span className="storage-icon"><CampItemMark id={id}/><b>{qty}</b></span>
    <span>{label(id)}</span><small>{combat?"战斗物品":"不可携带"}</small>
  </button>;
 }
 return <section className="storage-editor">
  <div className="storage-columns">
   <section aria-label="背包"><h3>背包 <small>{total}/20件</small></h3><ItemPages label="背包物品" size={5} roomySize={10} className="storage-grid">
    {Object.keys(bag).map(id=>cell(id,"bag"))}
    {Array.from({length:Math.ceil(Math.max(1,Object.keys(bag).length)/5)*5-Object.keys(bag).length},(_,i)=><span className="storage-empty" aria-hidden="true" key={i}/>)}
   </ItemPages></section>
   <section aria-label="仓库"><h3>仓库 <small>剩余物品</small></h3><ItemPages label="仓库物品" size={5} roomySize={10} className="storage-grid">
    {ids.map(id=>cell(id,"warehouse"))}
   </ItemPages>{!ids.length&&<p>仓库暂无物品，可先前往商店购买。</p>}</section>
  </div>
  <div className="storage-inspect" aria-live="polite">{(()=>{
   const id=inspected??Object.keys(bag)[0]??ids[0];
   return id?<><CampItemMark id={id}/><div><b>{label(id)}</b><p>{battleMedicines.find(m=>m.id===id)?.description??products.find(p=>p.id===id)?.description??'成长物品，在营地对应功能中使用。'}</p></div><small>背包 {bag[id]??0}　仓库 {warehouseQuantity(game,id)}</small></>:<p>行囊尚空。可在商店购买药品，或在药坊调和。</p>;
  })()}</div>
  <p className="storage-help">点击物品转移1件 · 背包上限20件，每种最多5件 · 成长物品不可携带 · 购买与调和产物进入仓库</p>
 </section>;
}
