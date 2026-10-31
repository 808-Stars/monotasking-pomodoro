import { heroStats, levelForExp, random, type GameState } from "./economy.ts";
import type { Resource } from "./economy.ts";
import {
  resourceEncounter,
  doorCleared,
  doorDiscovery,
  finalEncounter,
  type Difficulty,
} from "./dungeons.ts";
import { medicineEffects, battleMedicines } from "./camp/medicineEffects.ts";
import { appendBattleLog, type BattleLogEntry } from "./battleLog.ts";
import { learnedIds } from "./camp/jobs.ts";
import { jobSkills } from "./camp/jobData.ts";
import { features, hasFeature } from "./camp/memory.ts";
import { confirmedSkills, confirmedById, ppCapacity } from "./confirmedSkills.ts";
import { confirmedEffect, weaponTypes } from "./confirmedSkillEffects.ts";
import type { BuildSnapshot } from "./tavern.ts";
import { applyStatBuff, effectiveBattleStat } from "./battleStats.ts";
import {
  applyAP,
  captureAbnormalityAction,
  finishAbnormalityAction,
  cleanseAbnormalities,
  type APUnit,
  type StatusId,
} from "./abnormality.ts";
export type { StatusId } from "./abnormality.ts";
export type BuffId =
  | "物攻提升"
  | "物攻下降"
  | "属攻提升"
  | "属攻下降"
  | "物防提升"
  | "物防下降"
  | "属防提升"
  | "属防下降"
  | "速度提升"
  | "速度下降";
export interface Unit extends APUnit {
  tauntTurns?: number;
  spreadTurns?: number;
  weaponAffinityTurns?: number;
  spDiscountCharges?: number;
  speedSwap?: { partnerId:string; turns:number };
  linkedSpeed?: number;
  usedRestDefense?: boolean;
  itemAllTurns?: number;
  supports?: string[];
  usedAutoRevive?: boolean;
  usedKnownWeakness?: boolean;
  damageBonus?: number;
  spellCharges?: { large: number; grand: number };
  investment?: { hp: number; extraHp: number; sp: number };
  skills?: string[];
  medicineRecovery?: Partial<Record<"hp" | "sp", number>>;
  weaponAttacks?: Record<string, number>;
  /** Last action's physical panel reference; optional for older saves. */
  activeWeapon?: string;
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  maxSp: number;
  sp: number;
  attack: number;
  magic: number;
  defense: number;
  resistance: number;
  speed: number;
  evasionCharges: number;
  physicalEvasionCharges?: number;
  weapons: string[];
  bp: number;
  latent: number;
  spentBP: boolean;
  defending: boolean;
  frontRound: number;
  buffs: Partial<Record<BuffId, number>>;
  shield: number;
  maxShield: number;
  weaknesses: string[];
  breakUntil: number;
  pendingHeavy: boolean;
  phase: boolean;
  intent: string;
}
export interface Node {
  fixedOrder?: number;
  commandChain?: boolean;
  id: string;
  unitId: string;
  round: number;
  kind: "normal" | "extra" | "end";
  factor: number;
  priority: number;
}
export interface BattleState {
  difficulty?: Difficulty;
  finale?: {
    stage: 1 | 2;
    snapshot: BuildSnapshot;
    lockedGame: GameState;
    first?: {
      rounds: number;
      started: number;
      ended: number;
      heroes: GameState["heroes"];
    };
  };
  startRequestId?: string;
  startedAt?: number;
  endedAt?: number;
  resource?: Resource;
  id: string;
  round: number;
  party: Unit[];
  enemies: Unit[];
  current: Node[];
  next: Node[];
  rng: { state: number; cursor: number };
  outcome: "active" | "victory" | "defeat" | "retreat";
  inventory: Record<string, number>;
  carriedInventory?: Record<string, number>;
  discoveredWeaknesses: string[];
  discoveredSkills: string[];
  sandbox: boolean;
  level: number;
  preparedNode: string | null;
  log: string[];
  logEntries?: BattleLogEntry[];
}
export interface VisualEvent {
  type:
    | "SkillStart"
    | "Damage"
    | "Heal"
    | "Evade"
    | "Critical"
    | "Weak"
    | "ShieldDamage"
    | "Break"
    | "Buff"
    | "Status"
    | "APChange"
    | "StateSync"
    | "KO"
    | "IntentChange"
    | "TargetChange";
  target: string;
  value?: number;
  text: string;
  /** Presentation metadata only; never used by battle arithmetic or RNG. */
  source?: string;
  attribute?: string;
  actionKind?: "attack" | "skill" | "item" | "defend";
  sequence?: number;
  hpAfter?: number;
  spAfter?: number;
  bpAfter?: number;
  ppAfter?: number;
  apAfter?: number;
  statusesAfter?: Unit["statuses"];
  buffsAfter?: Unit["buffs"];
  weaponAfter?: string;
  supportAction?: boolean;
  /** Optional display boundaries; never used by command arithmetic or RNG. */
  reactionOf?: string;
  reactionEnd?: boolean;
}
export interface Command {
  order?: string[];
  usePP?: boolean;
  buff?: BuffId;
  targets?: string[];
  type: "attack" | "skill" | "item" | "defend" | "retreat";
  bp?: number;
  weapon?: string;
  skill?: string;
  item?: string;
  target?: string;
}
export const names: Record<string, string> = {
  warrior: "剑士",
  dancer: "舞娘",
  merchant: "商人",
  scholar: "学者",
  thief: "盗贼",
  cleric: "神官",
  hunter: "猎人",
  apothecary: "药师",
};
export const skillBook: Record<
  string,
  {
    name: string;
    sp: number;
    weapon?: string;
    element?: string;
    magic?: boolean;
    heal?: boolean;
    all?: boolean;
    random?: boolean;
    criticalAtBP?: number;
    ally?: boolean;
    self?: boolean;
    revive?: boolean;
    direct?: boolean;
    bothSides?: boolean;
    targetCount?: number[];
    ppOnly?: boolean;
    effect?:
      | "buff"
      | "steal"
      | "heal-ally"
      | "bp"
      | "evasion"
      | "clean-buff-attack"
      | "reveal"
      | "revive-all"
      | "random-buff"
      | "investment"
      | "large-spell"
      | "grand-spell"
      | "ap"
      | "medicine-all"
      | "confirmed";
    spell?: boolean;
    requireBP?: number;
    costHalf?: boolean;
    buffs?: BuffId[];
    afterBuff?: BuffId;
    drain?: "hp" | "sp";
    tailBP?: boolean;
    buff?: BuffId;
    shieldPierce?: boolean;
    ks: number[];
    hits?: number[];
    ap?: { type: StatusId; amounts: number[] };
  }
> = {
  rain: {
    name: "五月雨斩",
    sp: 9,
    weapon: "剑",
    random: true,
    ks: [0.6, 0.6, 0.6, 0.6],
    hits: [3, 4, 5, 6],
  },
  spear: {
    name: "会心之枪",
    sp: 12,
    weapon: "枪",
    ks: [1.5, 2.25, 3, 4.5],
    criticalAtBP: 1,
  },
  fire: {
    name: "火焰魔法",
    sp: 14,
    element: "火",
    magic: true,
    all: true,
    ks: [1.6, 2.4, 3.2, 4.8],
  },
  water: {
    name: "水流魔法",
    sp: 14,
    element: "水",
    magic: true,
    all: true,
    ks: [1.6, 2.4, 3.2, 4.8],
  },
  heal: {
    name: "恢复魔法",
    sp: 15,
    heal: true,
    all: true,
    ks: [1, 1.5, 2, 2.5],
  },
  tide: {
    name: "圣潮",
    sp: 6,
    element: "水",
    magic: true,
    ks: [1.5, 2.25, 3, 4.5],
  },
  lucky: { name: "幸运枪刺", sp: 8, weapon: "枪", ks: [1.5, 2.25, 3, 4.5] },
  rest: { name: "稍作休息", sp: 0, heal: true, ks: [0.1, 0.2, 0.3, 0.4] },
};
export const learned: Record<string, string[]> = {
  warrior: ["warrior-1", "warrior-2"],
  scholar: ["fire", "water"],
  cleric: ["heal", "tide"],
  merchant: ["lucky", "rest"],
};
const basicK = [1.5, 2.25, 3, 4.5];
const starterRules: Record<string, (typeof skillBook)[string]> = {
  "warrior-1": skillBook.rain,
  "warrior-2": skillBook.spear,
  "merchant-1": skillBook.lucky,
  "merchant-2": { ...skillBook.rest, self: true },
  "scholar-1": skillBook.fire,
  "scholar-2": skillBook.water,
  "cleric-1": skillBook.heal,
  "cleric-2": skillBook.tide,
  "dancer-1": {
    name: "狮子之舞",
    sp: 4,
    ally: true,
    heal: true,
    effect: "buff",
    buff: "物攻提升",
    ks: [3, 5, 7, 9],
  },
  "dancer-2": { name: "猛踢要害", sp: 10, shieldPierce: true, ks: basicK },
  "thief-1": { name: "夺势", sp: 2, effect: "steal", ks: [2, 3, 4, 5] },
  "thief-2": { name: "地袭", sp: 7, element: "土", magic: true, ks: basicK },
  "hunter-1": {
    name: "狙击",
    sp: 6,
    weapon: "弓",
    hits: [2, 3, 4, 5],
    ks: [0.6, 0.6, 0.6, 0.6],
  },
  "hunter-2": { name: "森灵", sp: 7, element: "木", magic: true, ks: basicK },
  "apothecary-1": {
    name: "治疗术",
    sp: 6,
    ally: true,
    heal: true,
    revive: true,
    effect: "heal-ally",
    ks: [1, 1.5, 2, 2.5],
  },
  "apothecary-2": {
    name: "木刺",
    sp: 7,
    element: "木",
    magic: true,
    ks: basicK,
  },
};
Object.assign(skillBook, starterRules);
const moreRules: Record<string, Partial<(typeof skillBook)[string]>> = {
  "warrior-3": {
    heal: true,
    self: true,
    effect: "buff",
    buff: "物攻提升",
    ks: [3, 5, 7, 9],
  },
  "warrior-4": {
    weapon: "剑",
    effect: "clean-buff-attack",
    ks: [1.5, 2, 2.5, 3],
  },
  "warrior-5": {
    heal: true,
    self: true,
    effect: "buff",
    buff: "物防提升",
    ks: [3, 5, 7, 9],
  },
  "warrior-8": { weapon: "剑", requireBP: 3, ks: [10, 10, 10, 10] },
  "dancer-3": {
    ally: true,
    heal: true,
    effect: "buff",
    buff: "属攻提升",
    ks: [3, 5, 7, 9],
  },
  "dancer-4": { element: "火", magic: true },
  "dancer-6": {
    weapon: "扇",
    all: true,
    ks: [1.2, 1.8, 2.4, 3.6],
    ap: { type: "爆破", amounts: [0, 0, 25, 50] },
  },
  "merchant-3": { element: "雷", magic: true },
  "merchant-4": { ally: true, heal: true, effect: "bp", ks: [1, 2, 3, 4] },
  "merchant-5": { self: true, heal: true, effect: "investment" },
  "merchant-6": { self: true, heal: true, effect: "evasion", ks: [1, 2, 3, 4] },
  "merchant-7": {
    weapon: "枪",
    sp: 0,
    costHalf: true,
    ks: [1.2, 1.5, 1.8, 2.4],
  },
  "merchant-8": { magic: true, requireBP: 3, tailBP: true, ks: [8, 8, 8, 8] },
  "scholar-3": {
    element: "雷",
    magic: true,
    all: true,
    ks: [1.6, 2.4, 3.2, 4.8],
  },
  "scholar-4": { effect: "reveal", ks: [1, 2, 3, 99] },
  "scholar-5": {
    self: true,
    heal: true,
    effect: "random-buff",
    ks: [2, 3, 4, 5],
  },
  "scholar-7": {
    ally: true,
    heal: true,
    effect: "large-spell",
    ks: [2, 3, 4, 5],
  },
  "scholar-8": {
    ally: true,
    heal: true,
    effect: "grand-spell",
    requireBP: 3,
    ks: [3, 3, 3, 3],
  },
  "thief-3": {
    sp: 8,
    weapon: "扇",
    hits: [2, 2, 2, 2],
    ks: [0.8, 1.2, 1.6, 2.4],
    drain: "hp",
  },
  "thief-5": {
    self: true,
    heal: true,
    effect: "buff",
    buff: "速度提升",
    ks: [3, 5, 7, 9],
  },
  "thief-6": { effect: "buff", buff: "物防下降", ks: [2, 4, 6, 8] },
  "thief-7": { effect: "buff", buff: "物攻下降", ks: [2, 4, 6, 8] },
  "cleric-3": {
    ally: true,
    heal: true,
    effect: "buff",
    buffs: ["物防提升", "属防提升"],
    ks: [2, 4, 6, 8],
  },
  "cleric-4": {
    weapon: "杖",
    hits: [2, 2, 2, 2],
    ks: [0.8, 1.2, 1.6, 2.4],
    drain: "sp",
  },
  "cleric-5": {
    element: "风",
    magic: true,
    all: true,
    ks: [1.6, 2.4, 3.2, 4.8],
  },
  "cleric-7": {
    heal: true,
    all: true,
    effect: "revive-all",
    ks: [0.1, 0.25, 0.5, 0.75],
  },
  "hunter-3": { weapon: "斧", afterBuff: "物防下降" },
  "hunter-4": { weapon: "弓", afterBuff: "速度下降", ks: [1, 1.5, 2, 3] },
  "hunter-8": {
    weapon: "弓",
    all: true,
    requireBP: 3,
    hits: [3, 3, 3, 3],
    ks: [2.5, 2.5, 2.5, 2.5],
  },
  "apothecary-4": { weapon: "斧", all: true, ks: [1.2, 1.8, 2.4, 3.6] },
  "apothecary-5": {
    name: "侵蚀散剂",
    sp: 9,
    effect: "ap",
    ap: { type: "侵蚀", amounts: [100, 150, 200, 250] },
  },
  "apothecary-8": {
    heal: true,
    ally: true,
    effect: "medicine-all",
    requireBP: 3,
    ks: [3, 3, 3, 3],
  },
};
for (const [id, rule] of Object.entries(moreRules)) {
  const info = jobSkills.find((s) => s.id === id)!;
  skillBook[id] = {
    name: info.name,
    sp: parseInt(info.sp ?? "0"),
    ks: basicK,
    ...rule,
  };
}
for (const id of ["scholar-1", "scholar-2", "scholar-3", "cleric-5"])
  skillBook[id].spell = true;
for (const entry of confirmedSkills.filter(x=>x.kind!=="support"&&x.id!=="warrior-pp")) {
  const direct=!["无","爆破延时伤害"].includes(entry.attribute);
  const ally=entry.id!=="dancer-ex1"&&(entry.target.startsWith("我方")||entry.id==="warrior-7");
  skillBook[entry.id]={name:entry.name,sp:entry.sp,ks:[1,1,1,1],effect:"confirmed",
    direct,heal:!direct,ally,self:entry.target==="自身"||["dancer-8","dancer-pp","hunter-pp"].includes(entry.id),
    all:entry.target==="敌方全体",magic:entry.attribute==="火",weapon:direct&&entry.attribute!=="火"?entry.attribute.split("→")[0]:undefined,
    element:entry.attribute==="火"?"火":undefined,
    requireBP:entry.slot==="U"?3:undefined,ppOnly:entry.kind==="pp",
    bothSides:entry.id==="dancer-ex1",
    buff:entry.id==="dancer-1"?"物攻提升":entry.id==="dancer-2"?"属攻提升":entry.id==="dancer-5"?"速度提升":undefined,
    targetCount:entry.id==="dancer-6"?[2,2,2,2]:entry.id==="warrior-ex1"?[1,2,3,4]:undefined,
  };
}
export function isDirectBattleSkill(id:string) {
  const sk=skillBook[id];return !!sk&&!sk.ppOnly&&(sk.direct??(!sk.heal&&(!sk.effect||sk.effect==="clean-buff-attack")));
}
export function battleSkillCost(a:Unit,id:string,usePP=false) {
  const sk=skillBook[id];if(!sk)return 0;
  if(usePP&&a.id==="warrior")return 0;
  const raw=sk.costHalf?Math.floor(a.sp/2):sk.sp;
  return sk.magic&&sk.element&&(a.spDiscountCharges??0)>0?Math.ceil(raw/2):raw;
}
export function availableBattleSkills(u: Unit) {
  return u.skills ?? learned[u.id] ?? [];
}
const supports = (u: Unit, id: string) => u.supports?.includes(id) ?? false;
const units = (s: BattleState) => [...s.party, ...s.enemies];
const living = (us: Unit[]) => us.filter((u) => u.hp > 0);
export const isBroken = (s: BattleState, u: Unit) => u.breakUntil > s.round;
export function damageFormula(
  attack: number,
  defense: number,
  k: number,
  {
    i = 1,
    weak = false,
    broken = false,
    criticalHit = false,
    defending = false,
    attackBuff = false,
    attackDebuff = false,
    defenseBuff = false,
    defenseDebuff = false,
    variance = 1,
    limit = 9999,
  } = {},
) {
  return Math.min(
    limit,
    Math.max(
      1,
      Math.floor(
        (applyStatBuff(attack, attackBuff, attackDebuff) * i -
          applyStatBuff(defense, defenseBuff, defenseDebuff) / 2) *
          k *
          (broken ? 2 : weak ? 1.3 : 1) *
          (criticalHit ? 1.25 : 1) *
          (defending ? 0.5 : 1) *
          variance,
      ),
    ),
  );
}
export function evaluateEnemyIntent(s: BattleState, e: Unit): string {
  if (e.id === "mint-spear")
    return e.pendingHeavy ? "蓄势重刺" : s.round % 3 === 2 ? "蓄矛" : "矛刺";
  if (e.id === "mint-shield") {
    const ally = living(s.enemies).find((u) => u.id !== e.id) ?? e;
    return ally.buffs["物防提升"] ? "盾击" : "护库架盾";
  }
  if (e.pendingHeavy) return "重剑清算";
  if (!e.buffs["物攻提升"]) return "核账";
  if (
    living(s.party).filter((u) => u.hp / u.maxHp <= 0.6).length >= 2 ||
    living(s.party).some((u) => u.defending)
  )
    return "金砂迸射";
  return "铸金斩";
}
function refresh(s: BattleState, events: VisualEvent[] = []) {
  const nativeSpeeds=Object.fromEntries(s.party.map(u=>[u.id,effectiveBattleStat({...u,linkedSpeed:undefined},"speed")]));
  for(const u of s.party){
    const other=s.party.find(v=>v.id===u.speedSwap?.partnerId&&v.hp>0&&v.speedSwap?.partnerId===u.id);
    if(u.hp>0&&u.speedSwap&&other)u.linkedSpeed=nativeSpeeds[other.id];
    else {delete u.speedSwap;delete u.linkedSpeed;}
  }
  for (const e of s.enemies) {
    const intent = evaluateEnemyIntent(s, e);
    if (e.intent !== intent) {
      e.intent = intent;
      events.push({ type: "IntentChange", target: e.id, text: intent });
    }
  }
  s.current = s.current.filter((n) => {
    const u = units(s).find((u) => u.id === n.unitId);
    return u && u.hp > 0 && !isBroken(s, u);
  });
  s.next = s.next.filter((n) => {
    const u = units(s).find((u) => u.id === n.unitId);
    return u && u.hp > 0 && u.breakUntil <= n.round;
  });
  sortNodes(s, s.next);
}
function sortNodes(s: BattleState, ns: Node[]) {
  ns.sort((a, b) => {
    if(a.fixedOrder!==undefined||b.fixedOrder!==undefined)
      return (a.fixedOrder??Number.MAX_SAFE_INTEGER)-(b.fixedOrder??Number.MAX_SAFE_INTEGER);
    const ua = units(s).find((u) => u.id === a.unitId)!;
    const ub = units(s).find((u) => u.id === b.unitId)!;
    const speedA = effectiveBattleStat(ua, "speed");
    const speedB = effectiveBattleStat(ub, "speed");
    const pa =
      a.priority +
      (ua.frontRound === a.round ? 1 : 0) +
      (ua.breakUntil === a.round ? 2 : 0);
    const pb =
      b.priority +
      (ub.frontRound === b.round ? 1 : 0) +
      (ub.breakUntil === b.round ? 2 : 0);
    return (
      pb -
        pa +
        (pa === pb
          ? speedB * b.factor - speedA * a.factor
          : 0) || a.id.localeCompare(b.id)
    );
  });
}
function makeNodes(s: BattleState, round: number) {
  const ns = living(units(s))
    .filter((u) => u.breakUntil <= round)
    .map((u) => ({
      id: `${round}:${u.id}:normal`,
      unitId: u.id,
      round,
      kind: "normal" as const,
      factor: 0.9 + random(s.rng) * 0.2,
      priority: 0,
    }));
  sortNodes(s, ns);
  return ns;
}
function initialUnit(
  id: string,
  level: number | GameState,
  hp: number,
  sp: number,
): Unit {
  const stats = heroStats(id, level);
  return {
    ...stats,
    activeWeapon: stats.weapons[0],
    weaponAttacks: Object.fromEntries(
      stats.weapons.map((w) => [w, heroStats(id, level, w).attack]),
    ),
    id,
    name: names[id],
    hp: Math.min(hp, stats.maxHp),
    sp: Math.min(sp, stats.maxSp),
    bp: 0,
    latent: 0,
    ap: 0,
    spentBP: false,
    defending: false,
    frontRound: 0,
    buffs: {},
    statuses: {},
    evasionCharges: 0,
    shield: 0,
    maxShield: 0,
    weaknesses: [],
    breakUntil: 0,
    pendingHeavy: false,
    phase: false,
    intent: "",
  };
}
export function createBattle(
  game: GameState,
  resource: Resource = "coin",
  options: {
    finalStage?: 1 | 2;
    sandbox?: boolean;
    difficulty?: Difficulty;
  } = {},
): BattleState {
  const difficulty = options.difficulty ?? "normal";
  const panel = resourceEncounter(resource, difficulty);
  const door = options.finalStage ? finalEncounter(options.finalStage) : panel;
  const discovery = doorDiscovery(game, resource, difficulty);
  const level = game.camp ? 0 : levelForExp(game.exp);
  const rng = structuredClone(game.rng);
  const nonce = Math.floor(random(rng) * 0xffffffff);
  const party = (
    game.camp?.party ?? ["warrior", "scholar", "cleric", "merchant"]
  ).map((id) =>
    initialUnit(
      id,
      game.camp ? game : level,
      game.heroes[id].hp,
      game.heroes[id].sp,
    ),
  );
  if (game.camp)
    for (const u of party) {
      const sub = game.camp.equippedSubjobs[u.id];
      const jobs = [
        u.id,
        ...(sub && game.camp.subjobUnlocks[u.id]?.includes(sub) ? [sub] : []),
      ];
      u.skills = [...new Set(jobs.flatMap((j) => learnedIds(game, u.id, j)))];
      for(const [flag,suffix] of [[features.ex1,"ex1"],[features.ex2,"ex2"]] as const)
        if(hasFeature(game,flag)&&skillBook[`${u.id}-${suffix}`])u.skills.push(`${u.id}-${suffix}`);
      u.supports = [...(game.camp.supports[u.id] ?? [])];
    }
  if (!living(party).length)
    throw new Error("队伍无人能够出战；请从挑战入口开始新会话。");
  const enemy: Unit = {
    ...initialUnit("warrior", 0, 18000, 0),
    id: "guardian",
    name: door.boss,
    maxHp: door.hp,
    hp: door.hp,
    maxSp: 0,
    attack: panel.attack,
    magic: panel.magic,
    defense: panel.defense,
    resistance: panel.resistance,
    speed: panel.speed,
    // Temporary Demo value; formal boss tenacity remains unbalanced.
    tenacity: 100,
    weapons: [],
    weaponAttacks: undefined,
    activeWeapon: undefined,
    shield: door.shield,
    maxShield: door.shield,
    weaknesses: [...door.weaknesses],
  };
  const s: BattleState = {
    difficulty,
    resource,
    id: `battle-${nonce}-${rng.cursor}`,
    round: 1,
    party,
    enemies: [enemy],
    current: [],
    next: [],
    rng,
    outcome: "active",
    inventory: structuredClone(game.inventory),
    discoveredWeaknesses: [...discovery.weaknesses],
    discoveredSkills: [...discovery.skills],
    sandbox: options.sandbox ?? !!doorCleared(game, resource, difficulty),
    level,
    preparedNode: null,
    log: [],
    logEntries: [],
  };
  party.forEach((u) => {
    u.bp = supports(u, "merchant-support-2") ? 2 : 1;
    if (supports(u, "merchant-support-4")) u.latent = ppCapacity(u);
    if (supports(u, "hunter-support-1")) u.buffs["速度提升"] = 2;
    if (supports(u, "scholar-support-1")) {
      const unknown = enemy.weaknesses.find(
        (w) => !s.discoveredWeaknesses.includes(w),
      );
      if (unknown) s.discoveredWeaknesses.push(unknown);
    }
  });
  s.current = makeNodes(s, 1);
  s.next = makeNodes(s, 2);
  refresh(s);
  appendBattleLog(s,{kind:"system",round:s.round,command:"战斗开始",lines:[`遭遇${enemy.name}`]});
  prepare(s);
  return s;
}
function prepare(s: BattleState) {
  const n = s.current[0];
  if (n && n.id !== s.preparedNode) {
    const u = units(s).find((u) => u.id === n.unitId)!;
    u.defending = false;
    if (u.investment && u.hp > 0) {
      const pending = u.investment;
      delete u.investment;
      heal(u, pending.hp + pending.extraHp, false, []);
      heal(u, pending.sp, true, []);
      u.latent = Math.min(ppCapacity(u), u.latent + 20);
      appendBattleLog(s,{kind:"system",round:s.round,command:"行动前结算",lines:[`${u.name}的风险投资兑现`]});
    }
    s.preparedNode = n.id;
    refresh(s);
  }
}
const oppositeBuff: Record<BuffId, BuffId> = {
  物攻提升: "物攻下降",
  物攻下降: "物攻提升",
  属攻提升: "属攻下降",
  属攻下降: "属攻提升",
  物防提升: "物防下降",
  物防下降: "物防提升",
  属防提升: "属防下降",
  属防下降: "属防提升",
  速度提升: "速度下降",
  速度下降: "速度提升",
};
function buff(u: Unit, id: BuffId, turns: number, events: VisualEvent[], source?:Unit, s?:BattleState, propagated=false) {
  if(!propagated&&id.endsWith("提升")&&source&&supports(source,"dancer-support-3"))turns++;
  const received=turns;
  const opposingId = oppositeBuff[id];
  const opposingTurns = u.buffs[opposingId] ?? 0;
  const cancelled = Math.min(opposingTurns, turns);
  const remainingOpposing = opposingTurns - cancelled;
  const remainingIncoming = turns - cancelled;
  if (remainingOpposing) u.buffs[opposingId] = remainingOpposing;
  else delete u.buffs[opposingId];
  if (remainingIncoming) {
    u.buffs[id] = Math.min(9, (u.buffs[id] ?? 0) + remainingIncoming);
    events.push({
      type: "Buff",
      target: u.id,
      text: `${id} ${u.buffs[id]}轮`,
      buffsAfter: structuredClone(u.buffs),
    });
  } else {
    events.push({
      type: "Buff",
      target: u.id,
      text: `${opposingId} ${remainingOpposing}轮`,
      buffsAfter: structuredClone(u.buffs),
    });
  }
  if(!propagated&&s&&id.endsWith("提升")&&remainingIncoming>0&&(u.spreadTurns??0)>0)
    for(const ally of living(s.party).filter(t=>t!==u))buff(ally,id,received,events,undefined,s,true);
}
function heal(u: Unit, value: number, sp: boolean, events: VisualEvent[]) {
  const field = sp ? "sp" : "hp",
    max = sp ? u.maxSp : u.maxHp;
  const actual = Math.max(0, Math.min(value, max - u[field]));
  u[field] += actual;
  events.push({
    type: "Heal",
    target: u.id,
    value: actual,
    text: `${sp ? "SP" : "HP"} +${actual}`,
    hpAfter: u.hp,
    spAfter: u.sp,
  });
}
function ko(s: BattleState, u: Unit, events: VisualEvent[]) {
  if (u.hp <= 0) {
    u.hp = 0;
    u.bp = 0;
    u.latent = 0;
    u.buffs = {};
    u.statuses = {};
    u.ap = 0;
    delete u.apLastType;
    delete u.apImmunities;
    delete u.apInputMultipliers;
    delete u.apProtectionCharges;
    delete u.temporaryTenacity;
    u.medicineRecovery = {};
    delete u.itemAllTurns;
    delete u.investment;
    delete u.spellCharges;
    delete u.tauntTurns;delete u.spreadTurns;delete u.weaponAffinityTurns;delete u.spDiscountCharges;
    delete u.speedSwap;delete u.linkedSpeed;
    u.defending = false;
    if ((supports(u, "cleric-support-4")||supports(u,"dancer-support-1")) && !u.usedAutoRevive) {
      u.usedAutoRevive = true;
      u.hp = Math.max(1, Math.floor(u.maxHp * 0.25));
      if(!s.next.some(n=>n.unitId===u.id))s.next.push({id:`${s.round+1}:${u.id}:revived`,unitId:u.id,round:s.round+1,kind:"normal",factor:1,priority:0});
      events.push({
        type: "Heal",
        target: u.id,
        text: "自动复活",
        buffsAfter: {},
        value: u.hp,
        hpAfter: u.hp,
        bpAfter: u.bp,
        ppAfter: u.latent,
        apAfter: u.ap,
        statusesAfter: {},
      });
    }
    events.push({
      type: "KO",
      target: u.id,
      text: "倒地",
      buffsAfter: {},
      hpAfter: u.hp,
      bpAfter: u.bp,
      ppAfter: u.latent,
      apAfter: u.ap,
      statusesAfter: {},
    });
    refresh(s, events);
  }
}
interface HitOptions {
  physical?: boolean;
  shieldPierce?: boolean;
  weapon?: string;
  criticalHit?: boolean;
  canBeEvaded?: boolean;
  ignoresEvasion?: boolean;
  ap?: { type: StatusId; amount: number };
}
/** Demo-only damage baselines; separate from directly inflicted attack damage. */
export function addAbnormalityAP(
  t: Unit,
  type: StatusId,
  amount: number,
  events: VisualEvent[] = [],
  source?: Unit,
) {
  if(source&&supports(source,"dancer-support-2"))amount=Math.ceil(amount*1.25);
  const result = applyAP(t, type, amount, {
    damagePerLayer:
      type === "爆破"
        ? Math.max(1, Math.floor(t.maxHp * 0.05))
        : type === "侵蚀"
          ? Math.max(1, Math.floor(t.maxHp * 0.01))
          : 0,
  });
  if (result.input || result.blocked)
    events.push({
      type: result.layers ? "Status" : "APChange",
      target: t.id,
      value: result.layers,
      text: result.blocked
        ? `${type}AP被防护阻止`
        : `${type} AP +${result.input}${result.layers ? ` · 新增${result.layers}层` : ""}`,
      apAfter: t.ap,
      statusesAfter: structuredClone(t.statuses),
    });
  return result;
}
function consumeEvasion(
  t: Unit,
  events: VisualEvent[],
  {
    canBeEvaded = true,
    ignoresEvasion = false,
    physical = false,
  }: HitOptions = {},
) {
  if (!canBeEvaded || ignoresEvasion) return false;
  if (physical && (t.physicalEvasionCharges ?? 0) > 0)
    t.physicalEvasionCharges!--;
  else if (t.evasionCharges > 0) t.evasionCharges--;
  else return false;
  events.push({
    type: "Evade",
    target: t.id,
    value: t.evasionCharges,
    text: `回避 · 通用${t.evasionCharges}次 / 物理${t.physicalEvasionCharges ?? 0}次`,
  });
  return true;
}
export function grantEvasion(u: Unit, charges: number) {
  if (!Number.isInteger(charges) || charges < 0)
    throw new Error("回避次数必须是非负整数");
  u.evasionCharges += charges;
}
function removeShield(s:BattleState,a:Unit,t:Unit,amount:number,events:VisualEvent[]) {
  if(t.hp<=0||isBroken(s,t)||t.shield<=0)return;
  t.shield=Math.max(0,t.shield-amount);
  events.push({type:"ShieldDamage",target:t.id,value:t.shield,text:`盾 ${t.shield}`});
  if(!t.shield){
    t.breakUntil=s.round+2;t.pendingHeavy=false;
    a.latent=Math.min(ppCapacity(a),a.latent+20);
    if(supports(a,"warrior-support-2"))heal(a,10,true,events);
    if(supports(a,"apothecary-support-3"))heal(a,10,true,events);
    events.push({type:"Break",target:t.id,text:"BREAK"});refresh(s,events);
  }
}
function explodeNow(s:BattleState,t:Unit,multiplier:number,events:VisualEvent[]) {
  const explosion=t.statuses["爆破"];if(!explosion)return;
  delete t.statuses["爆破"];
  if(!consumeEvasion(t,events)){
    const damage=Math.min(t.hp,Math.max(0,Math.floor((explosion.potency??0)*multiplier)));
    t.hp-=damage;
    events.push({type:"Damage",target:t.id,text:`引爆全场 ${damage}`,value:damage,hpAfter:t.hp});
    if(s.party.includes(t)&&t.hp>0)t.latent=Math.min(ppCapacity(t),t.latent+damage/t.maxHp*100);
    ko(s,t,events);
  }
  events.push({type:"StateSync",target:t.id,text:"爆破已结算并移除",statusesAfter:structuredClone(t.statuses),apAfter:t.ap});
}
function hit(
  s: BattleState,
  a: Unit,
  t: Unit,
  k: number,
  magic: boolean,
  attribute: string | undefined,
  events: VisualEvent[],
  options: HitOptions = {},
) {
  if (t.hp <= 0 || consumeEvasion(t, events, { ...options, physical: !magic }))
    return;
  if(!magic&&(a.weaponAffinityTurns??0)>0&&attribute&&weaponTypes.includes(attribute))
    attribute=t.weaknesses.find(w=>weaponTypes.includes(w))??attribute;
  const weak = !!attribute && t.weaknesses.includes(attribute);
  const broken = isBroken(s, t);
  const firstKnown =
    weak &&
    s.discoveredWeaknesses.includes(attribute!) &&
    supports(a, "hunter-support-2") &&
    !a.usedKnownWeakness;
  if (firstKnown) a.usedKnownWeakness = true;
  const criticalHit = !!options.criticalHit || firstKnown;
  const attack = effectiveBattleStat(a,magic?"magic":"attack",options.weapon);
  let multiplier = magic ? (a.damageBonus ?? 1) : 1;
  if (
    !magic &&
    supports(a, "thief-support-4") &&
    (Object.keys(t.statuses).length ||
      Object.keys(t.buffs).some((k) => k.endsWith("下降")))
  )
    multiplier *= 1.2;
  if (
    !magic &&
    !broken &&
    weak &&
    options.weapon &&
    supports(a, "hunter-support-3")
  )
    multiplier *= 1.2;
  const d = damageFormula(
    attack,
    magic ? t.resistance : t.defense,
    k * multiplier,
    {
      limit: supports(a, "warrior-support-4") ? 99999 : 9999,
      weak,
      broken,
      criticalHit,
      defending: t.defending,
      defenseBuff: !!t.buffs[magic ? "属防提升" : "物防提升"],
      defenseDebuff: !!t.buffs[magic ? "属防下降" : "物防下降"],
      variance: 0.98 + random(s.rng) * 0.04,
    },
  );
  const endure =
    supports(t, "merchant-support-3") && t.hp >= t.maxHp * 0.25 && d >= t.hp;
  const actual = Math.min(t.hp - (endure ? 1 : 0), d);
  t.hp -= actual;
  events.push({
    type: "Damage",
    target: t.id,
    source: a.id,
    attribute,
    hpAfter: t.hp,
    value: d,
    text: `${d}`,
  });
  if (criticalHit)
    events.push({ type: "Critical", target: t.id, text: "会心" });
  if (weak) {
    if (!s.discoveredWeaknesses.includes(attribute!))
      s.discoveredWeaknesses.push(attribute!);
    events.push({ type: "Weak", target: t.id, text: `WEAK · ${attribute}` });
  }
  if ((weak || options.shieldPierce) && !broken && t.shield > 0 && t.hp > 0) {
    removeShield(s,a,t,1,events);
  }
  if (s.party.includes(t) && t.hp > 0)
    t.latent = Math.min(
      ppCapacity(t),
      t.latent + (actual / t.maxHp) * 100,
    );
  const diedFromHit = t.hp <= 0;
  ko(s, t, events);
  if (!diedFromHit && t.hp > 0 && options.ap)
    addAbnormalityAP(t, options.ap.type, options.ap.amount, events,a);
}
function randomTarget(s: BattleState, options: Unit[]) {
  const weights=options.map(u=>(u.tauntTurns??0)>0?4:1);
  let point=random(s.rng)*weights.reduce((sum,n)=>sum+n,0);
  return options.find((_,i)=>(point-=weights[i])<0)??options[options.length-1];
}
function endAction(
  s: BattleState,
  actor: Unit,
  events: VisualEvent[],
  start: ReturnType<typeof captureAbnormalityAction>,
  logCommand?: {bp:number;name?:string},
) {
  const statusesBefore = JSON.stringify(actor.statuses);
  const delayed = finishAbnormalityAction(actor, start);
  let diedFromErosion = false;
  if (delayed.erosion && actor.hp > 0) {
    const value = Math.min(actor.hp, delayed.erosion);
    actor.hp -= value;
    diedFromErosion = actor.hp <= 0;
    events.push({
      type: "Damage",
      target: actor.id,
      value,
      text: `侵蚀 ${value}`,
      hpAfter: actor.hp,
    });
    ko(s, actor, events);
  }
  // Death clears the old pending abnormality, including after an automatic revive.
  if (!diedFromErosion && actor.hp > 0 && delayed.explosion) {
    if (!consumeEvasion(actor, events)) {
      const value = Math.min(actor.hp, delayed.explosion);
      actor.hp -= value;
      events.push({
        type: "Damage",
        target: actor.id,
        value,
        text: `爆破 ${value}`,
        hpAfter: actor.hp,
      });
      ko(s, actor, events);
    }
  }
  if (JSON.stringify(actor.statuses) !== statusesBefore)
    events.push({
      type: "StateSync",
      target: actor.id,
      text: "行动结束 · 异常层更新",
      apAfter: actor.ap,
      statusesAfter: structuredClone(actor.statuses),
    });
  for (const e of s.enemies)
    if (e.id === "guardian" && e.hp > 0 && !e.phase && e.hp <= e.maxHp * 0.5) {
      e.phase = true;
      buff(e, "物防提升", 3, events);
    }
  refresh(s, events);
  if (!living(s.enemies).length) s.outcome = "victory";
  else if (!living(s.party).length) s.outcome = "defeat";
  const opening=events.find(e=>e.type==="SkillStart");
  const logLines=(items:VisualEvent[])=>items.filter(e=>e!==opening).map(e=>{
    const name=units(s).find(u=>u.id===e.target)?.name;
    return name&&!e.text.includes(name)?`${name}：${e.text}`:e.text;
  });
  appendBattleLog(s,{kind:"action",round:s.round,actor:actor.name,
    command:logCommand?.name??opening?.text??"行动",bp:logCommand?.bp,
    lines:logLines(events)});
  if (s.outcome === "active" && !s.current.length) {
    const startIndex=events.length,previousRound=s.round;
    nextRound(s, events);
    appendBattleLog(s,{kind:"system",round:s.round,command:`轮次更替：${previousRound} → ${s.round}`,
      lines:logLines(events.slice(startIndex))});
  }
  if(s.outcome!=="active") appendBattleLog(s,{kind:"system",round:s.round,
    command:s.outcome==="victory"?"战斗胜利":"战斗失败",lines:[]});
  if (s.outcome === "active") prepare(s);
}
function nextRound(s: BattleState, events: VisualEvent[]) {
  for (const u of living(units(s))) {
    for(const key of ["tauntTurns","spreadTurns","weaponAffinityTurns"] as const)
      if(u[key]&&!--u[key]!)delete u[key];
    if(u.speedSwap&&!--u.speedSwap.turns){delete u.speedSwap;delete u.linkedSpeed;}
    if (u.itemAllTurns && !--u.itemAllTurns) delete u.itemAllTurns;
    for (const field of ["hp", "sp"] as const)
      if (u.medicineRecovery?.[field]) {
        heal(u, field === "hp" ? 300 : 15, field === "sp", events);
        if (!--u.medicineRecovery[field]!) delete u.medicineRecovery[field];
      }
    const hadBuffs = Object.keys(u.buffs).length > 0;
    for (const id of Object.keys(u.buffs) as BuffId[]) {
      u.buffs[id]!--;
      if (!u.buffs[id]) delete u.buffs[id];
    }
    if (hadBuffs) events.push({
      type: "StateSync", target: u.id, text: "轮末 · 属性状态更新",
      buffsAfter: structuredClone(u.buffs),
    });
  }
  s.round++;
  for (const u of living(units(s))) {
    if (u.breakUntil === s.round) u.shield = u.maxShield;
    if (s.party.includes(u)) {
      if (!u.spentBP) u.bp = Math.min(5, u.bp + 1);
      u.spentBP = false;
    }
  }
  s.current = s.next;
  s.preparedNode = null;
  sortNodes(s, s.current);
  s.next = makeNodes(s, s.round + 1);
  refresh(s, events);
  if (!living(s.enemies).length) s.outcome = "victory";
  else if (!living(s.party).length) s.outcome = "defeat";
}
export function commandError(s: BattleState, c: Command): string | null {
  if (s.outcome !== "active") return "战斗已结束。";
  if (c.type === "retreat") return null;
  const a = s.party.find((u) => u.id === s.current[0]?.unitId);
  if (!a) return "现在是敌方行动。";
  if(c.usePP){
    if(a.latent<ppCapacity(a))return "PP未满。";
    if(s.current[0]?.commandChain)return "连续指令中不能再次发动PP。";
    const valid=a.id==="apothecary"&&c.type==="item" || a.id==="warrior"&&c.type==="skill"&&isDirectBattleSkill(c.skill??"")&&weaponTypes.includes(c.weapon??"") ||
      ["dancer","cleric","hunter"].includes(a.id)&&c.type==="skill"&&c.skill===`${a.id}-pp`;
    if(!valid)return "当前角色或指令不能使用此PP。";
  }
  const b = c.bp ?? 0;
  if (!Number.isInteger(b) || b < 0 || b > 3 || b > a.bp)
    return "BP不足或投入超出0—3。";
  if (b && a.statuses["凝滞"]) return "凝滞：不能投入BP。";
  if ((c.type === "item" || c.type === "defend") && b)
    return "此指令不接受BP。";
  const skill = c.skill ? skillBook[c.skill] : undefined;
  if (
    c.type === "skill" &&
    (!skill || !(availableBattleSkills(a).includes(c.skill!)||c.usePP&&skill.ppOnly&&c.skill===`${a.id}-pp`))
  )
    return "技能尚未开放。";
  if (c.type === "skill" && skill) {
    if(skill.ppOnly&&!c.usePP)return "专属指令需要消耗满槽PP。";
    if(c.skill==="warrior-7"&&c.target===a.id)return "轮换防区需要一名其他队友。";
    if(skill.targetCount){
      const ids=c.targets??(c.target?[c.target]:[]),count=skill.targetCount[b];
      if(!ids.length||new Set(ids).size!==ids.length||ids.length>count||ids.some(id=>!s.party.some(u=>u.id===id&&u.hp>0))||c.skill==="dancer-6"&&ids.length!==2)
        return c.skill==="dancer-6"?"请选择两名不同的存活队友。":`请选择1至${count}名不同的存活队友。`;
    }
    if(skill.bothSides&&!units(s).some(u=>u.id===c.target&&u.hp>0&&u.statuses["爆破"]))return "请选择拥有爆破的存活角色或敌人。";
    if(c.skill==="dancer-pp"){
      const ids=c.order??[];
      if(ids.length!==Math.min(3+b,s.next.length)||new Set(ids).size!==ids.length||ids.some(id=>!s.next.some(n=>n.id===id)))return `请按顺序选择次轮${Math.min(3+b,s.next.length)}个不同节点。`;
    }
    if (skill.effect === "investment" && b) return "风险投资不接受BP增幅。";
    if (skill.requireBP !== undefined && b !== skill.requireBP)
      return `此奥义必须投入${skill.requireBP} BP。`;
    if (skill.effect === "bp" && c.target === a.id)
      return "传递BP不能指定自己。";
    if (skill.effect === "revive-all" && !s.party.some((t) => t.hp === 0))
      return "没有倒地队友。";
    if (
      skill.ally &&
      !s.party.some((t) => t.id === c.target && (skill.revive || t.hp > 0))
    )
      return "请选择合法队友。";
    if (
      skill.effect === "steal" &&
      (!c.buff ||
        !c.buff.endsWith("提升") ||
        !s.enemies.find((t) => t.id === c.target)?.buffs[c.buff])
    )
      return "请选择敌人已有的普通强化。";
    if (
      c.targets && !skill.targetCount&&
      (!c.targets.length ||
        c.targets.length > (skill.hits?.[b] ?? 1) ||
        c.targets.some((id) => !s.enemies.some((t) => t.id === id && t.hp > 0)))
    )
      return "分段目标无效。";
    if (a.sp < battleSkillCost(a,c.skill!,c.usePP)) return "SP不足。";
    if (
      a.statuses["沉默"] &&
      isDirectBattleSkill(c.skill!)
    )
      return "沉默：不能使用直接伤害技能。";
    if (a.statuses["悬浮"] && (skill.weapon||c.usePP&&a.id==="warrior")) return "悬浮：不能使用武器技能。";
  }
  if (c.type === "attack") {
    if (a.statuses["悬浮"]) return "悬浮：不能普通攻击。";
    if (!c.weapon || !a.weapons.includes(c.weapon)) return "请选择可用武器。";
  }
  if (c.type === "item") {
    if (!medicineEffects[c.item ?? ""] || !(s.inventory[c.item!] > 0))
      return "药品不足。";
    const effect = medicineEffects[c.item!];
    if (effect.all || a.itemAllTurns) {
      if (!s.party.some((t) => (effect.revive ? t.hp <= 0 : t.hp > 0)))
        return "没有合法药品目标。";
    } else {
      const target = s.party.find((u) => u.id === c.target);
      if (
        !target ||
        (medicineEffects[c.item!].revive ? target.hp > 0 : target.hp <= 0)
      )
        return "请选择合法队友。";
    }
  }
  if (
    c.type === "attack" ||
    (c.type === "skill" && skill && !skill.heal && !skill.all && !skill.random)
  ) {
    if (!s.enemies.some((u) => u.id === c.target && u.hp > 0))
      return "请选择存活敌人。";
  }
  return null;
}
export function resolveCommand(
  input: BattleState,
  c: Command,
): { state: BattleState; events: VisualEvent[] } {
  const error = commandError(input, c);
  if (error) throw new Error(error);
  const s = structuredClone(input),
    events: VisualEvent[] = [];
  if (c.type === "retreat") {
    s.outcome = "retreat";
    appendBattleLog(s,{kind:"action",round:s.round,actor:"我方队伍",command:"撤退",lines:["已撤出战斗"]});
    return { state: s, events };
  }
  const a = s.party.find((u) => u.id === s.current[0].unitId)!;
  const abnormalityStart = captureAbnormalityAction(a);
  const nodeId = s.current[0].id;
  const b = c.bp ?? 0;
  a.bp -= b;
  if (b) a.spentBP = true;
  const originalSkill = c.type==="skill"&&c.skill ? skillBook[c.skill] : undefined;
  const sk = c.usePP&&a.id==="warrior"&&originalSkill
    ?{...originalSkill,weapon:c.weapon,element:undefined,magic:false}:originalSkill;
  // Weapon skills and normal attacks show their actual panel throughout replay.
  // Unarmed physical skills still use this engine's default physical panel.
  const actionWeapon = c.type === "attack" ? c.weapon
    : sk && !sk.magic && !sk.ally ? sk.weapon ?? a.weapons[0]
    : a.activeWeapon ?? a.weapons[0];
  if (actionWeapon && a.weapons.includes(actionWeapon)) a.activeWeapon = actionWeapon;
  events.push({
    type: "SkillStart",
    target: a.id,
    source: a.id,
    actionKind: c.type,
    weaponAfter: a.activeWeapon,
    supportAction: !!sk?.ally,
    bpAfter: a.bp,
    attribute: c.type === "attack" ? c.weapon : (sk?.element ?? sk?.weapon),
    text:
      c.type === "attack"
        ? `${c.weapon}攻击 ×${1 + b}`
        : (sk?.name ?? (c.type === "defend" ? "防御" : "使用药品")),
  });
  if(c.usePP){a.latent=0;events[0].ppAfter=0;events[0].text=`${confirmedById[`${a.id}-pp`]?.name??"节约"} · ${events[0].text}`;}
  if(c.type==="skill"&&c.skill==="hunter-pp"){
    s.current.splice(0,1,...Array.from({length:2+b},(_,i)=>({id:`${s.round}:${a.id}:chain:${nodeId}:${i}`,unitId:a.id,round:s.round,kind:"extra" as const,factor:1,priority:0,commandChain:true})));
    s.preparedNode=null;
    appendBattleLog(s,{kind:"action",round:s.round,actor:a.name,command:"连令",bp:b,lines:[`获得${2+b}次连续指令；各自支付资源`]});
    refresh(s,events);prepare(s);return {state:s,events};
  }
  let target = c.target;
  let resolvedTargets=c.targets;
  if (
    a.statuses["混乱"] &&
    ((c.type === "item" && !medicineEffects[c.item!]?.all && !a.itemAllTurns) ||
      c.type === "attack" ||
      (c.type === "skill" && sk && !sk.self && !sk.all && !sk.random))
  ) {
    const pool =
      sk?.bothSides?living(units(s)).filter(u=>!!u.statuses["爆破"]):c.type === "item" || sk?.ally
        ? s.party.filter(
            (u) =>
              (c.type === "item" && medicineEffects[c.item!]?.revive
                ? u.hp <= 0
                : sk?.revive || u.hp > 0) &&
              !((sk?.effect === "bp"||c.skill==="warrior-7") && u.id === a.id),
          )
        : living(s.enemies);
    const actual = randomTarget(s, pool);
    events.push({
      type: "TargetChange",
      target: a.id,
      text: `混乱：${units(s).find((u) => u.id === target)?.name} → ${actual.name}`,
    });
    target = actual.id;
    if(sk?.targetCount){
      const remaining=[...pool];resolvedTargets=[];
      for(let i=0;i<(c.targets?.length??1)&&remaining.length;i++){
        const picked=randomTarget(s,remaining);remaining.splice(remaining.indexOf(picked),1);resolvedTargets.push(picked.id);
      }
      target=resolvedTargets[0];
    }
  }
  if (c.type === "defend") {
    a.defending = true;
    a.frontRound = s.round + 1;
    events.push({ type: "Buff", target: a.id, text: "防御 · 承伤减半" });
    if(supports(a,"warrior-support-1")&&!a.usedRestDefense){a.usedRestDefense=true;const gain=Math.min(1,5-a.bp);a.bp+=gain;events.push({type:"Heal",target:a.id,text:`以逸待劳 BP +${gain}`,bpAfter:a.bp});}
  }
  if (c.type === "item") {
    if (c.usePP) {
      a.latent = 0;
      events[0].ppAfter = a.latent;
    } else s.inventory[c.item!]--;
    const effect = medicineEffects[c.item!];
    const targets =
      effect.all || a.itemAllTurns
        ? s.party.filter((t) => (effect.revive ? t.hp <= 0 : t.hp > 0))
        : [s.party.find((u) => u.id === target)!];
    for (const t of targets) {
      if (effect.hp)
        heal(
          t,
          Math.floor(
            (effect.hp === "full" ? t.maxHp : effect.hp) *
              (supports(a, "apothecary-support-1") && t.hp <= t.maxHp * 0.25
                ? 1.25
                : 1),
          ),
          false,
          events,
        );
      if (effect.sp)
        heal(t, effect.sp === "full" ? t.maxSp : effect.sp, true, events);
      if (effect.buff) buff(t, effect.buff, 3, events,a,s);
      if (effect.slow) {
        t.medicineRecovery ??= {};
        t.medicineRecovery[effect.slow] =
          (t.medicineRecovery[effect.slow] ?? 0) + 3;
      }
      if (effect.cleanse) {
        cleanseAbnormalities(t, "侵蚀");
        events.push({
          type: "Status",
          target: t.id,
          text: "侵蚀解除",
          apAfter: t.ap,
          statusesAfter: structuredClone(t.statuses),
        });
      }
      if (effect.revive) {
        t.hp = Math.max(1, Math.floor(t.maxHp * effect.revive));
        events.push({
          type: "Heal",
          target: t.id,
          value: t.hp,
          text: `复苏 ${t.hp}`,
          hpAfter: t.hp,
        });
        if (!s.next.some((n) => n.unitId === t.id))
          s.next.push({
            id: `${s.round + 1}:${t.id}:normal`,
            unitId: t.id,
            round: s.round + 1,
            kind: "normal",
            factor: 0.9 + random(s.rng) * 0.2,
            priority: 0,
          });
      }
      if (effect.bp) {
        const actual = Math.min(5 - t.bp, effect.bp);
        t.bp += actual;
        events.push({
          type: "Heal",
          target: t.id,
          text: `BP +${actual}`,
          bpAfter: t.bp,
        });
      }
    }
  }
  if (c.type === "attack") {
    for (let i = 0; i < 1 + b; i++)
      hit(
        s,
        a,
        s.enemies.find((u) => u.id === target)!,
        1,
        false,
        c.weapon,
        events,
        { weapon: c.weapon },
      );
  }
  if (c.type === "skill" && sk) {
    a.damageBonus =
      supports(a, "scholar-support-3") && a.sp >= a.maxSp * 0.5 ? 1.1 : 1;
    const paid = battleSkillCost(a,c.skill!,c.usePP);
    if(paid>0&&originalSkill?.magic&&originalSkill.element&&(a.spDiscountCharges??0)>0)a.spDiscountCharges!--;
    a.sp -= paid;
    events[0].spAfter = a.sp;
    const beneficiary = sk.self
      ? a
      : sk.ally
        ? s.party.find((u) => u.id === target)!
        : s.enemies.find((u) => u.id === target)!;
    let spellTier = 0;
    if ((sk.spell || c.skill === "cleric-1") && a.spellCharges) {
      if (a.spellCharges.grand > 0) {
        a.spellCharges.grand--;
        spellTier = 2;
      } else if (a.spellCharges.large > 0) {
        a.spellCharges.large--;
        spellTier = 1;
      }
    }
    if (sk.effect === "confirmed") {
      confirmedEffect({s,a,c:{...c,targets:resolvedTargets},b,target,events,
        hit:(t,k,attribute,magic=false,amount)=>hit(s,a,t,k,c.usePP&&a.id==="warrior"?false:magic,c.usePP&&a.id==="warrior"?c.weapon:attribute,events,
          {weapon:c.usePP&&a.id==="warrior"?c.weapon:magic?undefined:attribute,ap:amount?{type:"爆破",amount}:undefined}),
        buff:(t,id,n,exact)=>buff(t,id,n,events,exact?undefined:a,s),shield:(t,n)=>removeShield(s,a,t,n,events),
        heal:(t,n,sp=false)=>heal(t,n,sp,events),ap:(t,n)=>addAbnormalityAP(t,"爆破",n,events,a),
        explode:(t,m)=>explodeNow(s,t,m,events),refresh:()=>refresh(s,events),
      });
    } else if (sk.effect === "ap" && sk.ap) {
      addAbnormalityAP(beneficiary, sk.ap.type, sk.ap.amounts[b], events,a);
    } else if (sk.effect === "medicine-all") {
      beneficiary.itemAllTurns = Math.min(
        9,
        (beneficiary.itemAllTurns ?? 0) + 3,
      );
      events.push({
        type: "Buff",
        target: beneficiary.id,
        text: `灵药公的恩惠：单体药全体化 ${beneficiary.itemAllTurns}轮`,
      });
    } else if (sk.effect === "buff")
      for (const stat of sk.buffs ?? [sk.buff!])
        buff(beneficiary, stat, sk.ks[b], events,a,s);
    else if (sk.effect === "investment") {
      const hp = Math.min(Math.floor(a.maxHp * 0.5), Math.max(0, a.hp - 1));
      a.hp -= hp;
      a.investment = {
        hp,
        extraHp: Math.floor(a.maxHp * 0.1),
        sp: Math.floor(a.maxSp * 0.1),
      };
      events.push({
        type: "Damage",
        target: a.id,
        text: `投入 ${hp} HP`,
        value: hp,
        hpAfter: a.hp,
      });
    } else if (sk.effect === "large-spell" || sk.effect === "grand-spell") {
      beneficiary.spellCharges ??= { large: 0, grand: 0 };
      beneficiary.spellCharges[
        sk.effect === "large-spell" ? "large" : "grand"
      ] += sk.ks[b];
      events.push({
        type: "Buff",
        target: beneficiary.id,
        text: `${sk.effect === "large-spell" ? "大魔法" : "特大魔法"} +${sk.ks[b]}次`,
      });
    } else if (sk.effect === "bp") {
      const actual = Math.min(5 - beneficiary.bp, sk.ks[b]);
      beneficiary.bp += actual;
      events.push({
        type: "Heal",
        target: beneficiary.id,
        text: `BP +${actual}`,
        bpAfter: beneficiary.bp,
      });
      if (actual > 0 && beneficiary !== a && supports(a, "merchant-support-1"))
        heal(a, 10, true, events);
    } else if (sk.effect === "evasion") {
      a.physicalEvasionCharges = (a.physicalEvasionCharges ?? 0) + sk.ks[b];
      events.push({ type: "Buff", target: a.id, text: `回避 +${sk.ks[b]}次` });
    } else if (sk.effect === "reveal") {
      s.discoveredWeaknesses.push(
        ...beneficiary.weaknesses
          .filter((w) => !s.discoveredWeaknesses.includes(w))
          .slice(0, sk.ks[b]),
      );
      events.push({
        type: "Weak",
        target: beneficiary.id,
        text: `调查：HP ${beneficiary.hp}/${beneficiary.maxHp}`,
      });
    } else if (sk.effect === "random-buff") {
      const stats: BuffId[] = [
        "物攻提升",
        "属攻提升",
        "物防提升",
        "属防提升",
        "速度提升",
      ];
      for (let i = 0; i < sk.ks[b]; i++)
        buff(a, stats[Math.floor(random(s.rng) * 5)], 3, events,a,s);
    } else if (sk.effect === "revive-all") {
      for (const t of s.party.filter((t) => t.hp === 0)) {
        t.hp = Math.max(1, Math.floor(t.maxHp * sk.ks[b]));
        events.push({
          type: "Heal",
          target: t.id,
          text: `复苏 ${t.hp}`,
          value: t.hp,
          hpAfter: t.hp,
        });
        s.next.push({
          id: `${s.round + 1}:${t.id}:normal`,
          unitId: t.id,
          round: s.round + 1,
          kind: "normal",
          factor: 0.9 + random(s.rng) * 0.2,
          priority: 0,
        });
      }
    } else if (sk.effect === "steal") {
      const t = s.enemies.find((u) => u.id === target)!;
      if (c.buff && t.buffs[c.buff]) {
        delete t.buffs[c.buff];
        events.push({type:"StateSync",target:t.id,text:"强化被夺取",buffsAfter:structuredClone(t.buffs)});
        buff(a, c.buff, sk.ks[b], events,a,s);
      }
    } else if (sk.effect === "heal-ally") {
      const t = s.party.find((u) => u.id === target)!;
      const wasDead = t.hp <= 0;
      const effectiveE = effectiveBattleStat(a, "resistance");
      heal(t, Math.floor((200 + 3 * effectiveE) * sk.ks[b]), false, events);
      if (wasDead && t.hp > 0 && !s.next.some((n) => n.unitId === t.id))
        s.next.push({
          id: `${s.round + 1}:${t.id}:normal`,
          unitId: t.id,
          round: s.round + 1,
          kind: "normal",
          factor: 0.9 + random(s.rng) * 0.2,
          priority: 0,
        });
    } else if (c.skill === "heal" || c.skill === "cleric-1")
      for (const t of living(s.party))
        heal(
          t,
          Math.floor(
            (100 +
              2 *
                effectiveBattleStat(a, "resistance")) *
              sk.ks[b] *
              (spellTier === 2 ? 2 : spellTier === 1 ? 1.5 : 1),
          ),
          false,
          events,
        );
    else if (c.skill === "rest" || c.skill === "merchant-2") {
      heal(a, Math.floor(a.maxHp * sk.ks[b]), false, events);
      heal(a, Math.floor(a.maxSp * sk.ks[b]), true, events);
      cleanseAbnormalities(a);
      events.push({
        type: "Status",
        target: a.id,
        text: "六异常解除 · AP保留",
        apAfter: a.ap,
        statusesAfter: {},
      });
    } else {
      let multiplier = sk.costHalf ? 1 + paid / 100 : 1;
      if (sk.effect === "clean-buff-attack") {
        let count = 0;
        for (const id of Object.keys(a.buffs) as BuffId[])
          if (id.endsWith("提升")) {
            delete a.buffs[id];
            count++;
          }
        multiplier *= 1 + 0.5 * count;
        if (count) events.push({type:"StateSync",target:a.id,text:"攻击前清除自身强化",buffsAfter:structuredClone(a.buffs)});
      }
      const hits = sk.spell ? 1 + spellTier : (sk.hits?.[b] ?? 1);
      const coefficient =
        sk.spell && spellTier
          ? (spellTier === 1 ? [1.2, 1.8, 2.4, 3.6] : [1, 1.5, 2, 3])[b]
          : sk.ks[b];
      for (let i = 0; i < hits; i++) {
        const targets = sk.all
          ? living(s.enemies)
          : sk.random
            ? living(s.enemies).length
              ? [randomTarget(s, living(s.enemies))]
              : []
            : [s.enemies.find((u) => u.id === (c.targets?.[i] ?? target))!];
        for (const t of targets) {
          const before = events.length;
          const hpBefore = t.hp;
          const qualifies =
            isBroken(s, t) || t.weaknesses.includes(sk.weapon ?? "");
          hit(
            s,
            a,
            t,
            coefficient * multiplier,
            !!sk.magic,
            sk.weapon ?? sk.element,
            events,
            {
              weapon: sk.weapon,
              shieldPierce: sk.shieldPierce,
              criticalHit:
                sk.criticalAtBP !== undefined && b >= sk.criticalAtBP,
              ap: sk.ap
                ? { type: sk.ap.type, amount: sk.ap.amounts[b] }
                : undefined,
            },
          );
          if (t.hp < hpBefore) {
            if (sk.drain)
              heal(
                a,
                Math.floor((hpBefore - t.hp) * (sk.drain === "hp" ? 0.5 : 0.1)),
                sk.drain === "sp",
                events,
              );
            if (sk.afterBuff && t.hp > 0) buff(t, sk.afterBuff, 2, events,a,s);
          }
          if (
            (c.skill === "lucky" || c.skill === "merchant-1") &&
            qualifies &&
            events.slice(before).some((e) => e.type === "Damage")
          )
            buff(a, "速度提升", 2, events,a,s);
        }
      }
      if (sk.tailBP)
        for (const u of living(s.party)) {
          const amount = Math.min(1, 5 - u.bp);
          u.bp += amount;
          events.push({
            type: "Heal",
            target: u.id,
            text: `BP +${amount}`,
            bpAfter: u.bp,
          });
          if (amount > 0 && u !== a && supports(a, "merchant-support-1"))
            heal(a, 10, true, events);
        }
    }
  }
  delete a.damageBonus;
  s.current = s.current.filter((n) => n.id !== nodeId);
  endAction(s, a, events, abnormalityStart,{bp:b,
    name:c.type==="item" ? `${c.usePP?"节约 · ":""}${battleMedicines.find(m=>m.id===c.item)?.name??"使用药品"}` : undefined});
  return { state: s, events };
}
export function resolveEnemy(input: BattleState): {
  state: BattleState;
  events: VisualEvent[];
} {
  const s = structuredClone(input),
    events: VisualEvent[] = [];
  if (s.outcome !== "active") throw new Error("战斗已结束");
  const a = s.enemies.find((u) => u.id === s.current[0]?.unitId);
  if (!a) throw new Error("不是敌方行动");
  const abnormalityStart = captureAbnormalityAction(a);
  const nodeId = s.current[0].id;
  const intent = evaluateEnemyIntent(s, a);
  if (!s.discoveredSkills.includes(intent)) s.discoveredSkills.push(intent);
  events.push({
    type: "SkillStart",
    target: a.id,
    source: a.id,
    actionKind: ["核账", "蓄矛", "护库架盾"].includes(intent)
      ? "defend"
      : "skill",
    attribute:
      a.id === "mint-spear"
        ? "枪"
        : a.id === "guardian" && ["铸金斩", "重剑清算"].includes(intent)
          ? "剑"
          : undefined,
    text: intent,
  });
  const isWeaponAttack =
    a.id === "mint-spear"
      ? intent !== "蓄矛"
      : a.id === "mint-shield"
        ? intent === "盾击"
        : ["铸金斩", "重剑清算"].includes(intent);
  const isDirectSkill = !["核账", "蓄矛", "护库架盾"].includes(intent);
  if (
    (a.statuses.沉默 && isDirectSkill) ||
    (a.statuses.悬浮 && isWeaponAttack)
  ) {
    events.push({
      type: "Status",
      target: a.id,
      text: `${intent}被${a.statuses.沉默 ? "沉默" : "悬浮"}阻止`,
    });
  } else if (a.id === "mint-spear") {
    if (intent === "蓄矛") a.pendingHeavy = true;
    else {
      a.pendingHeavy = false;
      const targets = living(s.party);
      if (targets.length)
        hit(
          s,
          a,
          randomTarget(s, targets),
          intent === "蓄势重刺" ? 1.6 : 1,
          false,
          "枪",
          events,
        );
    }
  } else if (a.id === "mint-shield") {
    if (intent === "护库架盾") {
      const ally = living(s.enemies).find((u) => u.id !== a.id) ?? a;
      buff(ally, "物防提升", 2, events);
    } else {
      const targets = living(s.party);
      if (targets.length)
        hit(s, a, randomTarget(s, targets), 0.9, false, undefined, events);
    }
  } else if (intent === "核账") {
    buff(a, "物攻提升", 2, events);
    if (a.phase) buff(a, "属防提升", 2, events);
    a.pendingHeavy = true;
  } else {
    const targets = living(s.party);
    if (intent === "重剑清算") {
      a.pendingHeavy = false;
      for (let i = 0; i < 2 && targets.length; i++) {
        const t = randomTarget(s,targets);
        targets.splice(targets.indexOf(t),1);
        hit(s, a, t, 1.6, false, undefined, events);
      }
    } else if (intent === "金砂迸射") {
      for (const t of targets) {
        // Explicit temporary AP input; never translate old 20% chance to a roll.
        hit(s, a, t, 0.9, true, "土", events, {
          ap: { type: "混乱", amount: 25 },
        });
      }
    } else if (targets.length)
      hit(s, a, randomTarget(s, targets), 1.3, false, undefined, events);
  }
  s.current = s.current.filter((n) => n.id !== nodeId);
  endAction(s, a, events, abnormalityStart);
  return { state: s, events };
}
