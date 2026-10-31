import type { CampState } from "./camp/types.ts";
import {
  doorCleared,
  doorDiscovery,
  dungeonOrder,
  requireDifficulty,
  type Difficulty,
} from "./dungeons.ts";
import { growthFor, resourceMultiplier } from "./camp/memory.ts";
import type { TavernState } from "./tavern.ts";
import { rewardDenominations, rewardRarityForRoll, rewardTiers } from "./rewardRules.ts";
export type Resource = "coin" | "exp" | "jp" | "gem";
export type Rarity = "N" | "R" | "SR" | "SSR";
export interface Rng {
  state: number;
  cursor: number;
}
export interface GameState {
  finalCleared?: boolean;
  tavern?: TavernState;
  dungeonWins?: Resource[];
  advancedWins?: Resource[];
  advancedDiscoveries?: Partial<
    Record<Resource, { weaknesses: string[]; skills: string[] }>
  >;
  dungeonDiscoveries?: Partial<
    Record<Resource, { weaknesses: string[]; skills: string[] }>
  >;
  camp?: CampState;
  version: 1;
  seed: number;
  rng: Rng;
  exp: number;
  coins: number;
  jp: Record<string, number>;
  stamina: number;
  spent: number;
  inventory: Record<string, number>;
  gems: Record<string, number>;
  firstWin: boolean;
  /** Legacy save marker only. No longer gates any action or provides recovery. */
  needsRest: boolean;
  heroes: Record<string, { hp: number; sp: number }>;
  discoveredWeaknesses: string[];
  discoveredSkills: string[];
  achievements: string[];
  settledBattleIds: string[];
}
export const jobs = [
  "warrior",
  "dancer",
  "merchant",
  "scholar",
  "thief",
  "cleric",
  "hunter",
  "apothecary",
];
export const resourceNames: Record<Resource, string> = {
  coin: "古币",
  exp: "旧忆",
  jp: "残响",
  gem: "尘玉",
};
const weapons: Record<string, Record<string, [number, number]>> = {
  warrior: { 剑: [130, 20], 枪: [120, 10], 弓: [115, 20] },
  dancer: { 扇: [80, 90] },
  merchant: { 枪: [90, 40] },
  scholar: { 杖: [30, 130] },
  thief: { 剑: [110, 20], 扇: [120, 40] },
  cleric: { 杖: [40, 100] },
  hunter: { 斧: [110, 20], 弓: [120, 30] },
  apothecary: { 斧: [100, 80] },
};
// HP, SP, 物攻, 属攻, 物防, 属防, 速度。
const gear: Record<string, number[]> = {
  warrior: [600, 20, 30, 0, 100, 40, 0],
  dancer: [200, 60, 0, 20, 30, 40, 50],
  merchant: [500, 60, 20, 20, 70, 60, 20],
  scholar: [200, 120, 0, 30, 30, 70, 10],
  thief: [300, 20, 20, 0, 50, 30, 60],
  cleric: [400, 80, 0, 20, 50, 100, 20],
  hunter: [400, 30, 30, 0, 60, 30, 40],
  apothecary: [700, 70, 20, 0, 60, 70, 10],
};
const growth = [
  [0.1, 0.05, 0.06, 0.06, 0.04, 0.04, 0.04],
  [0.15, 0.05, 0.08, 0.08, 0.06, 0.06, 0.04],
  [0.2, 0.1, 0.1, 0.1, 0.08, 0.08, 0.05],
  [0.25, 0.1, 0.12, 0.12, 0.1, 0.1, 0.06],
  [0.3, 0.1, 0.14, 0.14, 0.12, 0.12, 0.06],
];
export function heroStats(
  id: string,
  progression: number | GameState,
  weapon?: string,
) {
  const game = typeof progression === "number" ? undefined : progression;
  const level =
    typeof progression === "number"
      ? progression
      : game?.camp
        ? 0
        : levelForExp(progression.exp);
  if (!weapons[id]) throw new Error("未知职业");
  const w = { ...weapons[id] };
  const sub = game?.camp?.equippedSubjobs[id];
  if (sub && game?.camp?.subjobUnlocks[id]?.includes(sub))
    for (const [type, stats] of Object.entries(weapons[sub] ?? {}))
      if (!w[type]) w[type] = stats;
  if (weapon && !w[weapon]) throw new Error("不可用武器");
  const bases = [1000, 100, 100, 100, 100, 100, 100];
  const bonus = Array<number>(7).fill(0);
  const idxByDigit: Partial<Record<number, number>> = {
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    6: 4,
    7: 5,
    9: 6,
  };
  for (let l = 1; l <= Math.min(100, level); l++) {
    const idx = idxByDigit[l % 10];
    if (idx === undefined) continue;
    const row = growth[Math.floor((l - 1) / 20)];
    bonus[idx] += row[idx];
  }
  if (game?.camp) {
    const b = growthFor(game);
    bonus.splice(
      0,
      7,
      b.maxHp,
      b.maxSp,
      b.attack,
      b.magic,
      b.defense,
      b.resistance,
      b.speed,
    );
  }
  bases[2] += w[weapon ?? Object.keys(w)[0]][0];
  bases[3] += Math.max(...Object.values(w).map((v) => v[1]));
  const values = bases.map((v, i) => {
    const raw = (v + gear[id][i]) * (1 + bonus[i]);
    return Math.floor(raw + 1e-8);
  });
  const support = game?.camp?.supports[id] ?? [];
  for (const [key, idx, amount] of [
    ["scholar-support-2", 3, 50],
    ["thief-support-2", 6, 50],
    ["cleric-support-2", 1, 50],
    ["apothecary-support-2", 0, 500],
  ] as const)
    if (support.includes(key)) values[idx] += amount;
  return {
    maxHp: values[0],
    maxSp: values[1],
    attack: values[2],
    magic: values[3],
    defense: values[4],
    resistance: values[5],
    speed: values[6],
    tenacity: Math.floor(
      100 *
        (1 + (game?.camp ? growthFor(game).tenacity : 0)) *
        (support.includes("apothecary-support-4") ? 1.5 : 1),
    ),
    weapons: Object.keys(w),
  };
}
export function expForLevel(level: number) {
  return 10 * level * (level + 17);
}
export function levelForExp(exp: number) {
  let l = 0;
  while (l < 100 && exp >= expForLevel(l + 1)) l++;
  return l;
}
export function random(rng: Rng) {
  let x = rng.state | 0;
  if (!x) x = 0x6d2b79f5;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  rng.state = x >>> 0;
  rng.cursor++;
  return rng.state / 4294967296;
}
export function createGame(seed = 20260922): GameState {
  return {
    version: 1,
    seed,
    rng: { state: seed, cursor: 0 },
    exp: 0,
    coins: 0,
    jp: Object.fromEntries(jobs.map((id) => [id, 0])),
    stamina: 0,
    spent: 0,
    inventory: { hp: 4, sp: 2, revive: 1 },
    gems: {},
    firstWin: false,
    needsRest: false,
    heroes: Object.fromEntries(
      jobs.map((id) => {
        const s = heroStats(id, 0);
        return [id, { hp: s.maxHp, sp: s.maxSp }];
      }),
    ),
    discoveredWeaknesses: [],
    discoveredSkills: [],
    achievements: [],
    settledBattleIds: [],
  };
}
const rewardNames: Record<Resource, string[]> = {
  coin: ["随身盘缠", "丰盈钱袋", "商队钱箱", "王室金匣"],
  exp: ["旅人札记", "冒险手账", "远征日志", "英雄传说"],
  jp: ["练习笔录", "匠人秘笈", "贤者卷轴", "大师遗典"],
  gem: ["流光石样", "溢彩晶簇", "藏晶原石", "富晶矿核"],
};
export function rewardId(
  resource: Resource,
  rarity: Rarity,
  difficulty: Difficulty = "normal",
) {
  requireDifficulty(difficulty);
  return `${resource}-${rarity}${difficulty === "advanced" ? "-advanced" : ""}`;
}
const advancedPrefixes = {
  coin: "有些份量的",
  exp: "有些年代的",
  jp: "有些深奥的",
  gem: "有些奇异的",
};
export const rewards = (["normal", "advanced"] as const).flatMap((difficulty) =>
  (Object.keys(rewardNames) as Resource[]).flatMap((resource, index) =>
    rewardTiers.map((tier, i) => ({
      id: rewardId(resource, tier.rarity, difficulty),
      name:
        (difficulty === "advanced" ? advancedPrefixes[resource] : "") +
        rewardNames[resource][i],
      resource,
      rarity: tier.rarity,
      difficulty,
      iconIndex: index * 4 + i,
      value: tier[difficulty] * rewardDenominations[resource],
    })),
  ),
);
export function rewardValue(g: GameState, resource: Resource, base: number) {
  return g.camp
    ? (resource === "gem" ? Math.ceil : Math.floor)(
        base * resourceMultiplier(g, resource),
      )
    : base;
}
export const medicines = [
  { id: "hp", name: "回复药", price: 100, description: "单体回复500 HP" },
  { id: "sp", name: "清神药", price: 150, description: "单体回复30 SP" },
  { id: "cleanse", name: "净蚀药", price: 100, description: "解除单体侵蚀" },
  {
    id: "revive",
    name: "复苏药",
    price: 300,
    description: "复活并恢复25%最大HP",
  },
  {
    id: "bp",
    name: "活力药",
    price: 800,
    description: "单体恢复1 BP（最多5）",
  },
];
function quantity(n: number) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("数量必须是非负整数");
}
export function grantStamina(input: GameState, n: number) {
  quantity(n);
  const g = structuredClone(input);
  g.stamina += n;
  return g;
}
export function sweep(
  input: GameState,
  count: 1 | 10,
  door: Resource = "coin",
  difficulty: Difficulty = "normal",
) {
  requireDifficulty(difficulty);
  if (count !== 1 && count !== 10) throw new Error("扫荡次数无效");
  if (!dungeonOrder.includes(door) || !doorCleared(input, door, difficulty))
    throw new Error("首次战胜后开放扫荡");
  if (input.stamina < count * 50) throw new Error("体力不足");
  const g = structuredClone(input);
  g.stamina -= count * 50;
  g.spent += count * 50;
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const r = random(g.rng),
      v = random(g.rng);
    const others = dungeonOrder.filter((id) => id !== door);
    const resource: Resource =
      r < 0.85 ? door : others[r < 0.9 ? 0 : r < 0.95 ? 1 : 2];
    const rarity = rewardRarityForRoll(v);
    const id = rewardId(resource, rarity, difficulty);
    g.inventory[id] = (g.inventory[id] ?? 0) + 1;
    result.push(id);
  }
  return { game: g, rewards: result };
}
export function processRewards(
  input: GameState,
  resource: Resource,
  selection: Record<string, number>,
) {
  let total = 0;
  for (const [id, n] of Object.entries(selection)) {
    quantity(n);
    const r = rewards.find((r) => r.id === id && r.resource === resource);
    if (!r || n > (input.inventory[id] ?? 0)) throw new Error("物品或数量无效");
    total += r.value * n;
  }
  if (!total) throw new Error("请选择奖励物品");
  const g = structuredClone(input);
  for (const [id, n] of Object.entries(selection)) g.inventory[id] -= n;
  total = rewardValue(g, resource, total);
  if (resource === "coin") g.coins += total;
  if (resource === "exp")
    g.exp = g.camp ? g.exp + total : Math.min(117000, g.exp + total);
  if (resource === "jp") jobs.forEach((id) => (g.jp[id] += total));
  if (resource === "gem")
    for (let i = 0; i < total; i++) {
      const name = ["火灼玉", "水澜玉", "木华玉"][
        Math.floor(random(g.rng) * 3)
      ];
      g.gems[name] = (g.gems[name] ?? 0) + 1;
    }
  return {
    game: g,
    summary:
      resource === "jp"
        ? `八名角色各获得 ${total} 残响`
        : `${resourceNames[resource]} +${total}`,
  };
}
export function buyMedicines(input: GameState, cart: Record<string, number>) {
  let cost = 0;
  for (const [id, n] of Object.entries(cart)) {
    quantity(n);
    const m = medicines.find((m) => m.id === id);
    if (!m) throw new Error("未知商品");
    cost += m.price * n;
  }
  if (!cost) throw new Error("购物清单为空");
  if (cost > input.coins) throw new Error("古币不足");
  const g = structuredClone(input);
  g.coins -= cost;
  for (const [id, n] of Object.entries(cart))
    g.inventory[id] = (g.inventory[id] ?? 0) + n;
  return g;
}
export interface Settlement {
  difficulty?: Difficulty;
  carriedInventory?: Record<string, number>;
  resource?: Resource;
  id: string;
  outcome: "victory" | "defeat" | "retreat";
  heroes: GameState["heroes"];
  inventory: Record<string, number>;
  rng: Rng;
  discoveredWeaknesses: string[];
  discoveredSkills: string[];
  sandbox: boolean;
}
export function applyBattleInventory(
  input: GameState,
  remaining: Record<string, number>,
  carried?: Record<string, number>,
) {
  const g = structuredClone(input);
  // Legacy running battles stored the full inventory. New sessions store only
  // selected medicine; merge actual consumption, never replace the whole bag.
  if (!carried) {
    g.inventory = structuredClone(remaining);
    return g;
  }
  for (const [id, initial] of Object.entries(carried)) {
    const n = remaining[id] ?? 0;
    if (
      !Number.isSafeInteger(initial) ||
      initial < 0 ||
      !Number.isSafeInteger(g.inventory[id] ?? 0) ||
      !Number.isSafeInteger(n) ||
      n < 0 ||
      n > initial ||
      (g.inventory[id] ?? 0) < initial - n
    )
      throw Error("战斗药品结算无效");
    g.inventory[id] = (g.inventory[id] ?? 0) - (initial - n);
  }
  if (Object.keys(remaining).some((id) => !(id in carried)))
    throw Error("战斗背包出现未携带物品");
  if (g.camp)
    g.camp.backpack = Object.fromEntries(
      Object.entries(remaining).filter(([, n]) => n > 0),
    );
  return g;
}
export function settleBattle(input: GameState, b: Settlement) {
  if (input.settledBattleIds.includes(b.id))
    return { game: input, rewards: [] as string[] };
  const g = b.sandbox
    ? structuredClone(input)
    : applyBattleInventory(input, b.inventory, b.carriedInventory);
  g.settledBattleIds.push(b.id);
  const door = b.resource ?? "coin";
  const difficulty = b.difficulty ?? "normal";
  requireDifficulty(difficulty);
  const old = doorDiscovery(g, door, difficulty);
  const recordKey =
    difficulty === "advanced" ? "advancedDiscoveries" : "dungeonDiscoveries";
  g[recordKey] ??= {};
  g[recordKey][door] = {
    weaknesses: [
      ...new Set([...(old?.weaknesses ?? []), ...b.discoveredWeaknesses]),
    ],
    skills: [...new Set([...(old?.skills ?? []), ...b.discoveredSkills])],
  };
  if (!b.sandbox) g.rng = structuredClone(b.rng);
  if (door === "coin" && difficulty === "normal") {
    g.discoveredWeaknesses = [
      ...new Set([...g.discoveredWeaknesses, ...b.discoveredWeaknesses]),
    ];
    g.discoveredSkills = [
      ...new Set([...g.discoveredSkills, ...b.discoveredSkills]),
    ];
  }
  const drops: string[] = [];
  if (!b.sandbox) {
    g.heroes = { ...g.heroes, ...structuredClone(b.heroes) };
    if (b.outcome === "victory" && !doorCleared(g, door, difficulty)) {
      const winsKey =
        difficulty === "advanced" ? "advancedWins" : "dungeonWins";
      g[winsKey] = [...new Set([...(g[winsKey] ?? []), door])];
      if (door === "coin" && difficulty === "normal") {
        g.firstWin = true;
        g.achievements.push("初叩金门");
      }
      drops.push(rewardId(door, "SSR", difficulty));
    } else if (b.outcome !== "victory") {
      g.needsRest = false;
      if (random(g.rng) < (difficulty === "advanced" ? 0.04 : 0.25))
        drops.push(rewardId(door, "N", difficulty));
    }
    for (const id of drops) g.inventory[id] = (g.inventory[id] ?? 0) + 1;
  }
  return { game: g, rewards: drops };
}
