import type { BuffId, StatusId, Unit } from "../game/battle.ts";
export interface UnitStatusIcon {
  key: string;
  icon: string;
  src: string;
  label: string;
  count?: number;
  tag?: string;
}
const abnormalIcons: Record<StatusId, string> = {
  爆破:"explosion",凝滞:"stasis",沉默:"silence",
  悬浮:"float",侵蚀:"erosion",混乱:"confusion",
};
const attributeIcons: Record<BuffId, string> = {
  物攻提升:"physical-attack-up",物攻下降:"physical-attack-down",
  属攻提升:"elemental-attack-up",属攻下降:"elemental-attack-down",
  物防提升:"physical-defense-up",物防下降:"physical-defense-down",
  属防提升:"elemental-defense-up",属防下降:"elemental-defense-down",
  速度提升:"speed-up",速度下降:"speed-down",
};
/** Read-only presentation of currently active states, shared by field and HUD.
 * No invented status, expiry, probability, or state mutation lives here. */
export function unitStatusIcons(unit: Unit, round: number): UnitStatusIcon[] {
  if (unit.hp<=0) return [];
  const icons: UnitStatusIcon[]=[];
  function add(key:string,icon:string,label:string,count?:number,tag?:string) {
    icons.push({key,icon,src:`/jrpg/assets/status-icons/wood-v2/${icon}.webp`,label,count,tag});
  }
  function counted(key:string,icon:string,name:string,count:number|undefined,measure:string,tag?:string) {
    if(count!==undefined && Number.isFinite(count) && count>0)
      add(key,icon,`${name} · ${count}${measure}`,count,tag);
  }
  for(const [name,icon] of Object.entries(abnormalIcons)) {
    const state=unit.statuses[name as StatusId];
    if(name==="爆破" && state && state.turns>0)
      add(name,icon,`爆破 · ${state.damageStacks ?? state.turns}伤害层 · 剩余延迟${state.turns}次行动`,state.damageStacks ?? state.turns);
    else counted(name,icon,name,state?.turns,"层／次行动");
  }
  for(const [name,icon] of Object.entries(attributeIcons))
    counted(name,icon,name,unit.buffs[name as BuffId],"轮");
  counted("回避","evade","回避",unit.evasionCharges,"次");
  counted("物理回避","physical-evade","物理回避",unit.physicalEvasionCharges,"次");
  if(unit.defending) add("防御中","guarding","防御中");
  if(unit.breakUntil>round) add("Break","break","Break · 行动节点暂停");
  counted("HP缓释","hp-regeneration","HP缓释",unit.medicineRecovery?.hp,"轮");
  counted("SP缓释","sp-regeneration","SP缓释",unit.medicineRecovery?.sp,"轮");
  counted("药品全体化","party-medicine","药品全体化",unit.itemAllTurns,"轮");
  counted("大魔法","spell-amplification","大魔法强化",unit.spellCharges?.large,"次","大");
  counted("超魔法","spell-amplification","超魔法强化",unit.spellCharges?.grand,"次","超");
  counted("牵制","guarding","牵制：随机单体目标权重×4",unit.tauntTurns,"轮","牵");
  counted("和弦","spell-amplification","属性技能SP减半",unit.spDiscountCharges,"次","和");
  counted("双人舞","speed-up","双人舞：有效速度交换",unit.speedSwap?.turns,"轮","舞");
  counted("华彩乐段","party-medicine","普通正向属性强化扩散",unit.spreadTurns,"轮","华");
  counted("弱点启示","spell-amplification","武器Hit视为目标第一个武器弱点",unit.weaponAffinityTurns,"轮","启");
  return icons;
}
