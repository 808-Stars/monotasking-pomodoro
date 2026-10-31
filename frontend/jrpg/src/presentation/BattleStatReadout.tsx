import type { Unit } from "../game/battle.ts";
import { battleStatAxes, baseBattleStat, battleStatMultiplier, effectiveBattleStat } from "../game/battleStats.ts";

/** Pure rendering from the currently displayed battle snapshot, never cached state. */
export function BattleStatReadout({unit,weapon}:{unit:Unit;weapon?:string}) {
  const requested=weapon??unit.activeWeapon;
  const selected=requested&&unit.weapons.includes(requested)?requested:unit.weapons[0];
  return <dl className="battle-live-stats" aria-label={`${unit.name}即时属性`}>
    {battleStatAxes.map(([stat,label])=>{
      const multiplier=battleStatMultiplier(unit,stat);
      const value=effectiveBattleStat(unit,stat,selected);
      const base=baseBattleStat(unit,stat,selected);
      const direction=multiplier>1?"up":multiplier<1?"down":"neutral";
      const name=stat==="attack"&&selected?`${label}·${selected}`:label;
      const special=stat==="speed"&&unit.linkedSpeed!==undefined?"双人舞交换后的有效速度":
        stat==="attack"&&unit.supports?.includes("warrior-support-3")&&unit.hp<unit.maxHp*.75?"含百战不殆独立被动乘区":"";
      const title=special?`${name}：${value}（${special}；普通状态倍率${multiplier}）`:
        `${name}：${base} × ${multiplier} ＝ ${value}${stat==="speed"?"；不含行动排序随机因子":""}`;
      return <div key={stat} className={`live-stat stat-${stat} stat-${direction}`} title={title}>
        <dt aria-label={name}>{label}</dt>
        <dd><b>{value}</b>{direction!=="neutral"&&<span aria-label={direction==="up"?"上升":"下降"}>{direction==="up"?"↑":"↓"}</span>}</dd>
      </div>;
    })}
  </dl>;
}
