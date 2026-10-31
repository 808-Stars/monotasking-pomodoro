import type { Unit } from "./battle.ts";

export const battleStatAxes = [
  ["attack", "物攻"],
  ["defense", "物防"],
  ["magic", "属攻"],
  ["resistance", "属防"],
  ["speed", "速度"],
] as const;
export type BattleStat = (typeof battleStatAxes)[number][0];
type StatUnit = Pick<Unit, BattleStat | "buffs" | "weaponAttacks" | "activeWeapon"> & Partial<Pick<Unit,"hp"|"maxHp"|"supports"|"linkedSpeed">>;

/** Ordinary states change attributes once, never the final damage multiplier. */
export function applyStatBuff(base:number, up=false, down=false):number {
  // Opposite ordinary states are normally cancelled when applied. Neutral is
  // also safe for malformed legacy snapshots containing both directions.
  const fifths=up===down ? 5 : up ? 6 : 4;
  return Math.floor(base*fifths/5);
}

export function battleStatMultiplier(unit:Pick<Unit,"buffs">, stat:BattleStat):number {
  const label=battleStatAxes.find(([key])=>key===stat)![1];
  const upId=`${label}提升` as const, downId=`${label}下降` as const;
  const up=(unit.buffs[upId]??0)>0;
  const down=(unit.buffs[downId]??0)>0;
  return up===down ? 1 : up ? 1.2 : .8;
}

/** Read permanent weapon panels; do not multiply or overwrite saved base stats. */
export function baseBattleStat(unit:StatUnit,stat:BattleStat,weapon?:string):number {
  const selected=weapon??unit.activeWeapon;
  return stat==="attack"&&selected ? unit.weaponAttacks?.[selected]??unit.attack : unit[stat];
}

export function effectiveBattleStat(unit:StatUnit,stat:BattleStat,weapon?:string):number {
  if(stat==="speed"&&unit.linkedSpeed!==undefined)return unit.linkedSpeed;
  const multiplier=battleStatMultiplier(unit,stat);
  let base=baseBattleStat(unit,stat,weapon);
  if(stat==="attack"&&unit.supports?.includes("warrior-support-3")&&unit.maxHp&&unit.hp!==undefined){
    const ratio=unit.hp/unit.maxHp;
    base=Math.floor(base*(ratio<.25?1.75:ratio<.5?1.5:ratio<.75?1.25:1));
  }
  return applyStatBuff(base,multiplier>1,multiplier<1);
}
