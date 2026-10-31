import type { GameState } from "../economy.ts";
import { positiveQuantity } from "./catalog.ts";
import { warehouseQuantity, storageSnapshot } from "./storage.ts";
export interface Recipe {
  id: string;
  name: string;
  inputs: string[];
  effect: string;
  blocked?: string;
}
export const recipes: Recipe[] = [
  {
    id: "hp-concentrated",
    name: "浓缩回复药",
    inputs: ["hp", "concentrate"],
    effect: "单体恢复1500 HP",
  },
  {
    id: "sp-concentrated",
    name: "浓缩清神药",
    inputs: ["sp", "concentrate"],
    effect: "单体恢复60 SP",
  },
  {
    id: "revive-concentrated",
    name: "浓缩复苏药",
    inputs: ["revive", "concentrate"],
    effect: "复活至50%最大HP",
  },
  {
    id: "bp-concentrated",
    name: "浓缩活力药",
    inputs: ["bp", "concentrate"],
    effect: "单体恢复2 BP",
  },
  {
    id: "hp-full",
    name: "全回复药",
    inputs: ["hp-concentrated", "concentrate"],
    effect: "单体恢复全部HP",
  },
  {
    id: "sp-full",
    name: "全清神药",
    inputs: ["sp-concentrated", "concentrate"],
    effect: "单体恢复全部SP",
  },
  {
    id: "revive-full",
    name: "完全复苏药",
    inputs: ["revive-concentrated", "concentrate"],
    effect: "复活并恢复全部HP",
  },
  {
    id: "bp-high",
    name: "高浓活力药",
    inputs: ["bp-concentrated", "concentrate"],
    effect: "单体恢复3 BP",
  },
  {
    id: "hp-spray",
    name: "回复喷雾",
    inputs: ["hp", "diffuse"],
    effect: "全体存活角色各恢复300 HP",
  },
  {
    id: "sp-spray",
    name: "清神喷雾",
    inputs: ["sp", "diffuse"],
    effect: "全体存活角色各恢复15 SP",
  },
  {
    id: "cleanse-spray",
    name: "净化喷雾",
    inputs: ["cleanse", "salt", "diffuse"],
    effect: "全体存活角色解除侵蚀",
  },
  {
    id: "hp-slow",
    name: "缓释回复药",
    inputs: ["hp", "slow"],
    effect: "3轮，每轮结束恢复300 HP",
  },
  {
    id: "sp-slow",
    name: "缓释清神药",
    inputs: ["sp", "slow"],
    effect: "3轮，每轮结束恢复15 SP",
  },
  {
    id: "restore",
    name: "复元药",
    inputs: ["hp", "sp", "mix"],
    effect: "单体恢复500 HP与30 SP",
  },
  {
    id: "cleanse-hp",
    name: "净蚀回复药",
    inputs: ["hp", "cleanse", "mix"],
    effect: "单体恢复500 HP并解除侵蚀",
  },
  {
    id: "purify-body",
    name: "净身药",
    inputs: ["hp", "undefined-antidote", "salt", "mix"],
    effect: "单体恢复500 HP并解除普通异常",
    blocked: "配方引用未定义的解毒药，等待设计确认",
  },
  {
    id: "attack-tonic",
    name: "振奋药",
    inputs: ["hp", "attack-herb"],
    effect: "单体恢复500 HP，物攻提升3轮",
  },
  {
    id: "magic-tonic",
    name: "灵感药",
    inputs: ["sp", "magic-flower"],
    effect: "单体恢复30 SP，属攻提升3轮",
  },
  {
    id: "defense-tonic",
    name: "坚韧药",
    inputs: ["hp", "defense-fruit"],
    effect: "单体恢复500 HP，物防提升3轮",
  },
  {
    id: "resistance-tonic",
    name: "守心药",
    inputs: ["sp", "resistance-bud"],
    effect: "单体恢复30 SP，属防提升3轮",
  },
];
export function craft(input: GameState, id: string, n: number): GameState {
  positiveQuantity(n);
  const r = recipes.find((r) => r.id === id);
  if (!r || r.blocked) throw Error(r?.blocked ?? "未知配方");
  for (const x of r.inputs)
    if (warehouseQuantity(input, x) < n) throw Error("仓库材料不足，请先把背包中的材料移回仓库");
  if (!Number.isSafeInteger((input.inventory[id] ?? 0) + n))
    throw Error("数量过大");
  const g = storageSnapshot(input);
  for (const x of r.inputs) g.inventory[x] -= n;
  g.inventory[id] = (g.inventory[id] ?? 0) + n;
  return g;
}
export function dismantle(input: GameState, id: string, n: number): GameState {
  positiveQuantity(n);
  const r = recipes.find((r) => r.id === id);
  if (!r || r.blocked) throw Error("该物品不能分解");
  if (
    warehouseQuantity(input, id) < n ||
    (input.inventory["formula-dew"] ?? 0) < n
  )
    throw Error("仓库成品或解方露不足，请先将成品移回仓库");
  const g = storageSnapshot(input);
  g.inventory[id] -= n;
  g.inventory["formula-dew"] -= n;
  for (const x of r.inputs) {
    if (!Number.isSafeInteger((g.inventory[x] ?? 0) + n))
      throw Error("数量过大");
    g.inventory[x] = (g.inventory[x] ?? 0) + n;
  }
  return g;
}
