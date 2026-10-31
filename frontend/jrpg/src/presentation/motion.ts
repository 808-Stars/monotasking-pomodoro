import type { VisualEvent, BattleState } from "../game/battle.ts";
export const effectNames: Record<string, string> = {
  physical: "剑击",
  spear: "枪击",
  bow: "箭击",
  fan: "扇击",
  axe: "斧击",
  staff: "杖击",
  fire: "火",
  water: "水",
  wood: "木",
  wind: "风",
  earth: "土",
  thunder: "雷",
  explosion: "爆破",
  stasis: "凝滞",
  silence: "沉默",
  float: "悬浮",
  erosion: "侵蚀",
  confusion: "混乱",
  heal: "HP恢复",
  energy: "SP／BP／PP恢复",
  cleanse: "净化",
  shield: "防御／会心",
  boost: "强化",
  weak: "弱点",
  break: "Break",
  reward: "营地／奖励",
};
const attributes: Record<string, string> = {
  剑: "physical",
  枪: "spear",
  弓: "bow",
  扇: "fan",
  斧: "axe",
  杖: "staff",
  火: "fire",
  水: "water",
  木: "wood",
  风: "wind",
  土: "earth",
  雷: "thunder",
};
const statuses: Record<string, string> = {
  爆破: "explosion",
  爆炸: "explosion", // Legacy event replay only.
  凝滞: "stasis",
  沉默: "silence",
  悬浮: "float",
  侵蚀: "erosion",
  混乱: "confusion",
};
export function effectFor(e: VisualEvent): string | null {
  if (e.type === "Damage")
    return (
      attributes[e.attribute ?? ""] ??
      (/爆破|爆炸/.test(e.text)
        ? "explosion"
        : e.text.includes("侵蚀")
          ? "erosion"
          : "physical")
    );
  if (e.type === "Status")
    return (
      Object.entries(statuses).find(([name]) => e.text.includes(name))?.[1] ??
      "cleanse"
    );
  if (e.type === "Heal") return /SP|BP|PP/.test(e.text) ? "energy" : "heal";
  if (e.type === "Evade") return "wind";
  if (e.type === "Critical") return "shield";
  if (e.type === "Weak") return "weak";
  if (e.type === "ShieldDamage") return "shield";
  if (e.type === "Break") return "break";
  if (e.type === "Buff") return "boost";
  if (e.type === "SkillStart" && e.actionKind === "defend") return "shield";
  return null;
}
export function poseFor(
  id: string,
  hp: number,
  e: VisualEvent | null,
): "idle" | "action" | "support" | "hurt" | "down" {
  if (hp <= 0) return "down";
  if (e?.target !== id) return "idle";
  if (e.type === "Damage") return "hurt";
  if (e.type === "SkillStart")
    return e.supportAction ||
      e.actionKind === "item" ||
      e.actionKind === "defend"
      ? "support"
      : "action";
  return "idle";
}
export function eventDuration(
  e: VisualEvent,
  speed: number,
  reduced: boolean,
): number {
  if (reduced) return 0;
  return (
    (e.type === "SkillStart"
      ? 360
      : e.type === "Break"
        ? 400
        : e.type === "Damage" || e.type === "Heal"
          ? 240
          : 160) / Math.max(1, speed)
  );
}
export function motionFrames(key: string): number[] {
  return key === "fire" ? [2, 3] : [0, 1];
}
export function poseSource(id: string, pose: string): string {
  void pose;
  return id === "guardian"
    ? "/jrpg/assets/battle-rear/guardian-front.webp"
    : `/jrpg/assets/battle-rear/${id}.webp`;
}
export function actionIconFor(e: VisualEvent | null): string | null {
  if (e?.type !== "SkillStart") return null;
  if (e.actionKind === "defend") return "shield";
  if (e.actionKind === "item") return "potion";
  if (e.supportAction)
    return /治疗|恢复HP|回复HP/.test(e.text) ? "heal" : "boost";
  const key = attributes[e.attribute ?? ""];
  return key === "physical" ? "sword" : (key ?? "staff");
}
/** A disposable UI snapshot. The already-saved authoritative battle is untouched. */
export function presentEvent(state: BattleState, e: VisualEvent): BattleState {
  const update = (units: BattleState["party"]) =>
    units.map((u) =>
      u.id !== e.target
        ? u
        : {
            ...u,
            hp: e.hpAfter ?? (e.type === "KO" ? 0 : u.hp),
            sp: e.spAfter ?? u.sp,
            bp: e.bpAfter ?? u.bp,
            latent: e.ppAfter ?? u.latent,
            ap: e.apAfter ?? u.ap,
            statuses: e.statusesAfter ? structuredClone(e.statusesAfter) : u.statuses,
            buffs: e.buffsAfter ? structuredClone(e.buffsAfter) : u.buffs,
            activeWeapon: e.weaponAfter ?? u.activeWeapon,
            shield:
              e.type === "ShieldDamage" ? (e.value ?? u.shield) : u.shield,
            breakUntil: e.type === "Break" ? state.round + 2 : u.breakUntil,
            intent: e.type === "IntentChange" ? e.text : u.intent,
          },
    );
  return {
    ...state,
    party: update(state.party),
    enemies: update(state.enemies),
    current:
      e.type === "Break"
        ? state.current.filter((n) => n.unitId !== e.target)
        : state.current,
    next:
      e.type === "Break"
        ? state.next.filter((n) => n.unitId !== e.target)
        : state.next,
  };
}
