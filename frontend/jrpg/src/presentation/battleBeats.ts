import type { VisualEvent } from "../game/battle.ts";
import { effectFor, actionIconFor, poseFor } from "./motion.ts";
import type { Unit } from "../game/battle.ts";
export function theatrePose(u:Unit,events:readonly VisualEvent[],reduced:boolean):string {
  if(u.hp<=0) return "down";
  if(reduced) return "idle";
  if(events.some(e=>e.type==="Heal" || (e.type==="KO"&&e.hpAfter!==undefined&&e.hpAfter>0))) return "support";
  if(events.some(e=>e.type==="Evade")) return "evade";
  if(events.some(e=>e.type==="Damage")) return "hurt";
  if(events.some(e=>e.type==="Buff")) return "support";
  return poseFor(u.id,u.hp,events[0]??null);
}
export function theatreActionIcon(e:VisualEvent|null):string|null {
  if(e?.type==="SkillStart" && /恢复魔法|大恢复魔法|复活魔法|休息/.test(e.text)) return "heal";
  return actionIconFor(e);
}
export interface BattleBeat {
  events: VisualEvent[];
  duration: number;
  source?: string;
  actionName?: string;
  reactionOf?: string;
  reactionEnd?: boolean;
}
export function theatreEffectFor(e: VisualEvent): string|null {
  if(e.type === "Evade") return "evade";
  if(e.type === "Critical") return "critical";
  if(e.type === "KO") return "ko";
  if(e.type === "Status" && /解除|净化/.test(e.text)) return "cleanse";
  if(e.type === "Buff") return /下降|减弱/.test(e.text) ? "debuff" :
    /回避/.test(e.text) ? "evade" : /防御/.test(e.text) ? "shield" : "boost";
  return effectFor(e);
}
const impacts = new Set(["Damage", "Evade"]);
const annotations = new Set(["Critical", "Weak", "ShieldDamage", "Break", "KO", "Status", "APChange"]);
function family(e: VisualEvent): string {
  return impacts.has(e.type) ? "impact" : e.type;
}
/** Groups display only. Every engine event stays in its original order. */
export function buildBattleBeats(events: readonly VisualEvent[], speed: number, reduced: boolean): BattleBeat[] {
  const result: BattleBeat[] = [];
  let source: string|undefined, actionName: string|undefined, reactionOf: string|undefined;
  const actionNames = new Map<string,string>();
  const returnFromReaction = () => {
    if (reactionOf) {source=reactionOf;actionName=actionNames.get(reactionOf);}
    reactionOf=undefined;
  };
  for (const event of events) {
    if(event.type === "SkillStart") { source=event.source ?? event.target; actionName=event.text; reactionOf=event.reactionOf;actionNames.set(source,actionName); }
    const last = result.at(-1);
    if(event.type === "StateSync" && last) {
      last.events.push({...event});
      if (event.reactionEnd) {last.reactionEnd = true;returnFromReaction();}
      continue;
    }
    const attached = last && !last.reactionEnd && annotations.has(event.type) &&
      last.events.some(e => e.target === event.target && impacts.has(e.type));
    // Casualties can refresh the boss intent between targets of one AoE.
    // Keep that ordered metadata on the impact, not a new pacing boundary.
    const intentOnImpact=last && !last.reactionEnd && event.type==="IntentChange" && impacts.has(last.events[0].type);
    const simultaneous = last && !last.reactionEnd && event.type !== "SkillStart" &&
      family(last.events[0]) === family(event) &&
      last.source === (event.source ?? source ?? last.source) &&
      !last.events.some(e => e.target === event.target && !annotations.has(e.type));
    if (attached || intentOnImpact || simultaneous) last!.events.push({...event});
    else result.push({events:[{...event}],duration:0,source:event.source ?? source,actionName,reactionOf});
    if (event.reactionEnd) { result.at(-1)!.reactionEnd = true; returnFromReaction(); }
  }
  for (const beat of result) {
    const types = beat.events.map(e => e.type);
    const duration = types.includes("Break") ? 760 : types.includes("KO") ? 600 :
      types.includes("SkillStart") ? 360 :
      types.some(t => t === "Damage" || t === "Evade") ? 440 :
      types.includes("IntentChange") ? 360 : types.includes("TargetChange") ? 700 : 480;
    beat.duration = reduced || types.every(t=>t==="StateSync") ? 0 : duration / (Number.isFinite(speed) ? Math.max(1, speed) : 1);
  }
  return result;
}
export function feedbackFor(events: readonly VisualEvent[]): {headline:string; tone:string; tags:string[]} {
  const main = events.find(e => e.type === "Damage" || e.type === "Heal" || e.type === "Evade") ?? events[0];
  if (!main) return {headline:"",tone:"neutral",tags:[]};
  const tags = events.filter(e => e !== main && annotations.has(e.type))
    .map(e => e.type === "Weak" ? e.text.replace("WEAK", "弱点") : e.text);
  return {
    headline: main.type === "Damage" ? String(main.value ?? main.text) : main.text,
    tone: main.type === "Damage" ? "damage" : main.type === "Heal" ? "heal" :
      main.type === "Evade" ? "evade" : main.type === "Status" ? "status" : "neutral",
    tags: [...new Set(tags)],
  };
}
