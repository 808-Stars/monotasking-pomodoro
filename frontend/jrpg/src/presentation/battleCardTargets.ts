import { skillBook, type BattleState, type Command, type BuffId, type Unit } from "../game/battle.ts";
import { medicineEffects } from "../game/camp/medicineEffects.ts";

/** Validate an explicit card choice without supplying an automatic fallback. */
export function selectedCardTarget(legalTargets:readonly string[],selected:string|undefined):string|undefined {
  return selected&&legalTargets.includes(selected)?selected:undefined;
}

/** Presentation-only recommendation: no RNG, resource payment or action execution. */
export function recommendedCardTarget(state:BattleState,command:Command,manualTarget?:string):string|undefined {
  const legal=legalCardTargets(state,command);
  const manual=selectedCardTarget(legal,manualTarget);
  if(manual)return manual;
  const candidates=[...state.party,...state.enemies].filter(unit=>legal.includes(unit.id));
  const skill=command.type==="skill"?skillBook[command.skill??""]:undefined;
  const medicine=command.type==="item"?medicineEffects[command.item??""]:undefined;
  const hpRatio=(unit:Unit)=>unit.hp/Math.max(1,unit.maxHp);
  const rank=(unit:Unit):number[]=>{
    if(medicine?.revive||skill?.revive)return [unit.hp<=0?0:1,hpRatio(unit)];
    // Compound medicines follow their primary HP/SP recovery before their added buff.
    if(medicine?.hp||medicine?.slow==="hp"||skill?.effect==="heal-ally")return [hpRatio(unit)];
    if(medicine?.sp||medicine?.slow==="sp")return [-(unit.maxSp-unit.sp)];
    if(medicine?.bp||skill?.effect==="bp")return [-(5-unit.bp)];
    if(skill?.effect==="buff"||skill?.buff||skill?.buffs||medicine?.buff){
      const buffs:BuffId[]=medicine?.buff?[medicine.buff]:skill?.buffs??(skill?.buff?[skill.buff]:[]);
      const durations=buffs.map(buff=>Math.max(0,unit.buffs[buff]??0));
      return [-durations.filter(turns=>turns===0).length,durations.reduce((sum,turns)=>sum+turns,0)];
    }
    if(skill?.effect==="steal"){
      const selected=command.buff&&(unit.buffs[command.buff]??0)>0;
      const any=Object.entries(unit.buffs).some(([buff,turns])=>buff.endsWith("提升")&&(turns??0)>0);
      return [selected?0:any?1:2];
    }
    if(command.type==="attack"||(skill&&!skill.ally&&!skill.heal&&skill.effect!=="reveal"&&skill.effect!=="ap")){
      const attribute=command.type==="attack"?command.weapon:skill?.weapon??skill?.element;
      const knownWeak=!!attribute&&state.discoveredWeaknesses.includes(attribute)&&unit.weaknesses.includes(attribute);
      return [knownWeak?0:1,hpRatio(unit)];
    }
    return [0];
  };
  let best:Unit|undefined;
  let bestRank:number[]=[];
  for(const unit of candidates){
    const score=rank(unit);
    const differing=score.findIndex((value,index)=>value!==bestRank[index]);
    if(!best||(differing>=0&&score[differing]<bestRank[differing])){best=unit;bestRank=score;}
  }
  return best?.id;
}

/** Target eligibility only. Resource costs and command legality remain engine-owned. */
export function legalCardTargets(state: BattleState, command: Command): string[] {
  const actor = state.party.find(unit => unit.id === state.current[0]?.unitId);
  if (!actor || state.outcome !== "active") return [];
  if (command.type === "attack") return state.enemies.filter(unit => unit.hp > 0).map(unit => unit.id);
  if (command.type === "skill") {
    const skill = skillBook[command.skill ?? ""];
    if (!skill || skill.all || skill.self || skill.random) return [];
    if(skill.bothSides)return [...state.party,...state.enemies].filter(u=>u.hp>0&&!!u.statuses["爆破"]).map(u=>u.id);
    if (skill.ally) return state.party.filter(unit => (skill.revive || unit.hp > 0)
      && !((skill.effect === "bp"||command.skill==="warrior-7") && unit.id === actor.id)).map(unit => unit.id);
    return state.enemies.filter(unit => unit.hp > 0).map(unit => unit.id);
  }
  if (command.type === "item") {
    const effect = medicineEffects[command.item ?? ""];
    if (!effect || effect.all || actor.itemAllTurns) return [];
    return state.party.filter(unit => effect.revive ? unit.hp <= 0 : unit.hp > 0).map(unit => unit.id);
  }
  return [];
}
