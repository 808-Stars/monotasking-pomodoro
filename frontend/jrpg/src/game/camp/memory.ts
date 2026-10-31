import type { GameState, Resource } from "../economy.ts";
import { clampCampVitals, migrateCamp } from "./migrate.ts";
import {
  memoryNodes,
  memoryLayoutVersion,
  type MemoryNode,
} from "./memoryData.ts";
import { legacyMemoryNodes } from "./legacyMemoryData.ts";
export { memoryNodes };
export const features = {
  professional: "R7C9",
  mystery: "R3C9",
  intermediate: "R5C9",
  ex1: "R1C5",
  ex2: "R1C3",
  weapons: "R7C1",
  shield: "R5C1",
  helmet: "initial-helmet",
  armor: "initial-armor",
  accessory: "R3C1",
  subjob: "R9C3",
  support1: "R9C5",
  support2: "R9C7",
  resourceGate: "R1C7",
};
export function hasFeature(g: GameState, id: string) {
  if (id === features.helmet || id === features.armor) return !!g.camp;
  return g.camp?.purchasedNodes[id] !== undefined;
}
export function memoryNodeCategory(n: MemoryNode) {
  if (n.kind === "起点") return "root";
  if (n.kind === "功能") return "function";
  return n.growth === 20 ? "permanent" : "ordinary";
}
export function connectedMemoryNodes(
  g: GameState,
  owned = new Set(Object.keys(g.camp?.purchasedNodes ?? {})),
) {
  const seen = new Set<string>();
  const todo = ["R5C5"];
  while (todo.length) {
    const id = todo.pop()!;
    if (seen.has(id) || !owned.has(id)) continue;
    seen.add(id);
    todo.push(...(memoryNodes.find((n) => n.id === id)?.links ?? []));
  }
  return seen;
}
export function canBuyMemoryNode(
  g: GameState,
  id: string,
  connected = connectedMemoryNodes(g),
) {
  const n = memoryNodes.find((n) => n.id === id);
  return (
    !!n &&
    !hasFeature(g, id) &&
    n.links.some((id) => connected.has(id)) &&
    n.requires.every((id) => hasFeature(g, id))
  );
}
export function canUndoMemoryNode(g: GameState, id: string) {
  const n = memoryNodes.find((n) => n.id === id);
  return !!n && memoryNodeCategory(n) === "ordinary" && hasFeature(g, id);
}
export function buyNode(input: GameState, id: string): GameState {
  const n = memoryNodes.find((n) => n.id === id),
    g = migrateCamp(structuredClone(input));
  if (!n || hasFeature(g, id)) throw Error("节点不存在或已购买");
  if (!canBuyMemoryNode(g, id)) throw Error("需先连通节点并满足前置");
  if (g.exp < n.cost) throw Error("旧忆不足");
  g.exp -= n.cost;
  g.camp!.purchasedNodes[id] = n.cost;
  return g;
}
export function previewNodeRefund(g: GameState, id: string) {
  if (!canUndoMemoryNode(g, id)) throw Error("不能撤销此节点");
  const remaining = new Set(Object.keys(g.camp!.purchasedNodes));
  remaining.delete(id);
  let changed = true;
  while (changed) {
    const seen = connectedMemoryNodes(g, remaining);
    changed = false;
    for (const x of remaining) {
      const n = memoryNodes.find((n) => n.id === x);
      if (n && memoryNodeCategory(n) === "ordinary" && !seen.has(x)) {
        remaining.delete(x);
        changed = true;
      }
    }
  }
  const ids = Object.keys(g.camp!.purchasedNodes).filter(
    (x) => !remaining.has(x),
  );
  return {
    ids,
    cost: ids.length,
    refund: ids.reduce((a, x) => a + g.camp!.purchasedNodes[x], 0),
  };
}
export function refundNode(input: GameState, id: string): GameState {
  const p = previewNodeRefund(input, id);
  if ((input.inventory["memory-scroll"] ?? 0) < p.cost)
    throw Error(`需要溯流卷${p.cost}件`);
  const g = structuredClone(input);
  g.inventory["memory-scroll"] -= p.cost;
  g.exp += p.refund;
  p.ids.forEach((x) => delete g.camp!.purchasedNodes[x]);
  return clampCampVitals(g);
}
export function supportSlots(g: GameState) {
  if (!g.camp) return 0;
  if (g.camp.memoryVersion !== memoryLayoutVersion)
    return hasFeature(g, "R1C6")
      ? 4
      : hasFeature(g, "R1C2")
        ? 3
        : hasFeature(g, "R5C9")
          ? 1
          : 0;
  return (
    1 +
    (hasFeature(g, features.support1) ? 1 : 0) +
    (hasFeature(g, features.support2) ? 2 : 0)
  );
}
export function growthFor(g: GameState) {
  const out = {
    maxHp: 0,
    maxSp: 0,
    attack: 0,
    magic: 0,
    defense: 0,
    resistance: 0,
    speed: 0,
    tenacity: 0,
  };
  const names: Record<string, keyof typeof out> = {
    最大HP: "maxHp",
    最大SP: "maxSp",
    HP: "maxHp",
    SP: "maxSp",
    物攻: "attack",
    属攻: "magic",
    物防: "defense",
    属防: "resistance",
    速度: "speed",
    韧性: "tenacity",
  };
  // Active legacy battles keep their original growth until returning to camp.
  const nodes =
    g.camp && g.camp.memoryVersion !== memoryLayoutVersion
      ? legacyMemoryNodes
      : memoryNodes;
  for (const n of nodes) {
    if (n.kind !== "属性" || !hasFeature(g, n.id)) continue;
    const [name, value] = n.label.split("＋");
    const key = names[name];
    if (key) out[key] += parseInt(value);
  }
  for (const key of Object.keys(out) as (keyof typeof out)[]) out[key] /= 100;
  return out;
}
export function resourceMultiplier(g: GameState, r: Resource) {
  if (!g.camp || g.camp.memoryVersion === memoryLayoutVersion) {
    const current: Record<Resource, string> = {
      coin: "R9C9",
      exp: "R1C9",
      jp: "R9C1",
      gem: "R1C1",
    };
    return hasFeature(g, current[r]) ? 2 : 1;
  }
  const ids: Record<Resource, string[]> = {
    coin: ["R9C8", "R9C3"],
    exp: ["R1C3", "R1C7"],
    jp: ["R9C7", "R9C2"],
    gem: ["R1C4", "R1C8"],
  };
  return hasFeature(g, ids[r][1]) ? 3 : hasFeature(g, ids[r][0]) ? 1.5 : 1;
}
