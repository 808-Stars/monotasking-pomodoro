import { heroStats, jobs, type GameState } from "../economy.ts";
import { positiveQuantity } from "./catalog.ts";
import { features, hasFeature } from "./memory.ts";

export const gemFamilies = [
  "火灼玉",
  "水澜玉",
  "木华玉",
  "风凌玉",
  "土砂玉",
  "雷鸣玉",
  "冷玉",
  "暖玉",
  "彩玉",
] as const;
export type GemFamily = (typeof gemFamilies)[number];
export type GemTier = 1 | 2 | 3 | 4;
export type GemSlot =
  | "剑"
  | "枪"
  | "弓"
  | "扇"
  | "斧"
  | "杖"
  | "helmet"
  | "armor"
  | "shield"
  | "accessory1"
  | "accessory2";
const tierLabels = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ"] as const;
const allSlots: readonly GemSlot[] = [
  "helmet",
  "armor",
  "剑",
  "枪",
  "弓",
  "扇",
  "斧",
  "杖",
  "shield",
  "accessory1",
  "accessory2",
];

export const gemEffectsNotice =
  "尘玉装备仅保存配置；装备效果尚未确定，当前不提供数值加成。";
export const gemReverseDisabledReason =
  "九族尘玉逆向细则尚未确认，返璞砂操作暂未开放。";

export function gemKey(family: GemFamily, tier: GemTier): string {
  if (
    !gemFamilies.includes(family) ||
    !Number.isInteger(tier) ||
    tier < 1 ||
    tier > 4
  )
    throw Error("未知尘玉家族或阶级");
  return family + (tier === 1 ? "" : tierLabels[tier - 1]);
}

export function parseGem(key: string): {
  key: string;
  family: GemFamily;
  tier: GemTier;
} {
  for (const family of gemFamilies) {
    const suffix = key.startsWith(family)
      ? key.slice(family.length)
      : undefined;
    const tier =
      suffix === "" ? 1 : tierLabels.findIndex((label) => label === suffix) + 1;
    if (tier > 0) {
      const t = tier as GemTier;
      return { key: gemKey(family, t), family, tier: t };
    }
  }
  throw Error("未知尘玉家族或阶级");
}

export function gemName(key: string): string {
  const gem = parseGem(key);
  return gem.family + tierLabels[gem.tier - 1];
}

function checkHero(hero: string): void {
  if (!jobs.includes(hero)) throw Error("未知角色");
}

export function availableGemSlots(g: GameState, hero: string): GemSlot[] {
  checkHero(hero);
  if (!g.camp) return [];
  const slots: GemSlot[] = ["helmet", "armor"];
  if (hasFeature(g, features.weapons))
    slots.push(...(heroStats(hero, g).weapons as GemSlot[]));
  if (hasFeature(g, features.shield)) slots.push("shield");
  if (hasFeature(g, features.accessory)) slots.push("accessory1", "accessory2");
  return slots;
}

function gemKeys(family: GemFamily, tier: GemTier): string[] {
  const key = gemKey(family, tier);
  return tier === 1 ? [key, family + "Ⅰ"] : [key];
}

function ownedGemQuantity(
  g: GameState,
  family: GemFamily,
  tier: GemTier,
): number {
  let total = 0;
  for (const key of gemKeys(family, tier)) {
    const n = g.gems[key] ?? 0;
    if (!Number.isSafeInteger(n) || n < 0 || !Number.isSafeInteger(total + n))
      throw Error("尘玉库存数量无效");
    total += n;
  }
  return total;
}

/** Counts all eight heroes' actual equipment, never unassigned inventory. */
export function equippedGemSelection(g: GameState): Record<string, number> {
  const selection: Record<string, number> = {};
  for (const [hero, slots] of Object.entries(g.camp?.gemEquipment ?? {})) {
    const legalSlots = availableGemSlots(g, hero);
    for (const [slot, key] of Object.entries(slots)) {
      if (!legalSlots.includes(slot as GemSlot))
        throw Error("尘玉装备栏尚未开放或武器不可用");
      const gem = parseGem(key);
      const count = (selection[gem.key] ?? 0) + 1;
      if (count > ownedGemQuantity(g, gem.family, gem.tier))
        throw Error("已装备尘玉数量不能超过实际库存");
      selection[gem.key] = count;
    }
  }
  return selection;
}

/** Configuration only: this does not consume inventory or apply gem effects. */
export function equipGem(
  g: GameState,
  hero: string,
  slot: GemSlot,
  gem: string | null,
): GameState {
  checkHero(hero);
  if (!g.camp) throw Error("请先初始化营地");
  if (!allSlots.includes(slot)) throw Error("未知尘玉装备栏");
  if (gem !== null && !availableGemSlots(g, hero).includes(slot))
    throw Error("尘玉装备栏尚未开放或武器不可用");
  const next = structuredClone(g);
  next.camp!.gemEquipment ??= {};
  next.camp!.gemEquipment[hero] ??= {};
  if (gem === null) delete next.camp!.gemEquipment[hero][slot];
  else next.camp!.gemEquipment[hero][slot] = parseGem(gem).key;
  equippedGemSelection(next);
  return next;
}

export interface GemRecipe {
  output: GemFamily;
  inputs: readonly GemFamily[];
}
export const gemRecipes: readonly GemRecipe[] = [
  { output: "雷鸣玉", inputs: ["火灼玉", "水澜玉"] },
  { output: "土砂玉", inputs: ["火灼玉", "木华玉"] },
  { output: "风凌玉", inputs: ["水澜玉", "木华玉"] },
  { output: "冷玉", inputs: ["火灼玉", "水澜玉", "木华玉"] },
  { output: "暖玉", inputs: ["风凌玉", "土砂玉", "雷鸣玉"] },
  { output: "彩玉", inputs: ["冷玉", "暖玉"] },
];

function consumeGem(
  g: GameState,
  family: GemFamily,
  tier: GemTier,
  n: number,
): void {
  for (const key of gemKeys(family, tier)) {
    if (!n) break;
    const used = Math.min(n, g.gems[key] ?? 0);
    if (Object.hasOwn(g.gems, key)) g.gems[key] -= used;
    n -= used;
  }
}

function addGem(
  g: GameState,
  family: GemFamily,
  tier: GemTier,
  n: number,
): void {
  const total = ownedGemQuantity(g, family, tier) + n;
  for (const key of gemKeys(family, tier))
    if (Object.hasOwn(g.gems, key)) g.gems[key] = 0;
  g.gems[gemKey(family, tier)] = total;
}

/** Each listed input contributes one gem of the specified tier per output. */
export function combineGem(
  input: GameState,
  outputFamily: GemFamily,
  tier: GemTier,
  count = 1,
): GameState {
  positiveQuantity(count);
  gemKey(outputFamily, tier);
  const recipe = gemRecipes.find((recipe) => recipe.output === outputFamily);
  if (!recipe) throw Error("该尘玉没有种类合成配方");
  const equipped = equippedGemSelection(input);
  for (const family of recipe.inputs) {
    const free =
      ownedGemQuantity(input, family, tier) -
      (equipped[gemKey(family, tier)] ?? 0);
    if (free < count) throw Error("未装备的同阶尘玉不足");
  }
  if (
    !Number.isSafeInteger(ownedGemQuantity(input, outputFamily, tier) + count)
  )
    throw Error("数量过大");
  const g = structuredClone(input);
  for (const family of recipe.inputs) consumeGem(g, family, tier, count);
  addGem(g, outputFamily, tier, count);
  return g;
}

/** The key identifies the input tier; each output consumes three of that tier. */
export function upgradeGem(
  input: GameState,
  key: string,
  count = 1,
): GameState {
  positiveQuantity(count);
  const gem = parseGem(key);
  if (gem.tier === 4) throw Error("普通尘玉最高为Ⅳ阶");
  if (!Number.isSafeInteger(count * 3)) throw Error("数量过大");
  const equipped = equippedGemSelection(input);
  const free =
    ownedGemQuantity(input, gem.family, gem.tier) - (equipped[gem.key] ?? 0);
  if (free < count * 3) throw Error("未装备的同阶尘玉不足");
  const nextTier = (gem.tier + 1) as GemTier;
  if (
    !Number.isSafeInteger(ownedGemQuantity(input, gem.family, nextTier) + count)
  )
    throw Error("数量过大");
  const g = structuredClone(input);
  consumeGem(g, gem.family, gem.tier, count * 3);
  addGem(g, gem.family, nextTier, count);
  return g;
}
