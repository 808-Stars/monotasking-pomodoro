import type { GameState } from "../economy.ts";
import { medicineEffects } from "./medicineEffects.ts";
import {storedBackpack, warehouseQuantity} from "./storage.ts";
export {warehouseQuantity} from "./storage.ts";

// The parent adds this optional field to CampState when integrating the module.
type BackpackCamp = NonNullable<GameState["camp"]> & {
  backpack?: Record<string, number>;
};

function selectionShape(selection: Record<string, number>): void {
  if (!selection || typeof selection !== "object" || Array.isArray(selection))
    throw Error("背包配置无效");
  let total = 0;
  for (const [id, n] of Object.entries(selection)) {
    if (!Object.hasOwn(medicineEffects, id)) throw Error("只能携带战斗药品");
    if (!Number.isSafeInteger(n) || n < 0) throw Error("数量必须是非负整数");
    if (n > 5) throw Error("每种药品最多携带5件");
    total += n;
    if (total > 20) throw Error("背包最多携带20件药品");
  }
}

function owned(g: GameState, id: string): number {
  const n = Object.hasOwn(g.inventory, id) ? g.inventory[id] : 0;
  if (!Number.isSafeInteger(n) || n < 0) throw Error("药品库存数量无效");
  return n;
}

function savedSelection(g: GameState): Record<string, number> {
  return storedBackpack(g);
}

export function validateBackpack(
  g: GameState,
  selection: Record<string, number>,
): void {
  selectionShape(selection);
  for (const [id, n] of Object.entries(selection))
    if (n > owned(g, id)) throw Error("携带量不能超过实际库存");
}

export function setBackpack(
  g: GameState,
  selection: Record<string, number>,
): GameState {
  validateBackpack(g, selection);
  if (!g.camp) throw Error("请先初始化营地");
  const next = structuredClone(g);
  (next.camp as BackpackCamp).backpack = Object.fromEntries(
    Object.entries(selection).filter(([, n]) => n > 0),
  );
  return next;
}

export function battleBackpack(g: GameState): Record<string, number> {
  const selection = savedSelection(g);
  validateBackpack(g, selection);
  return Object.fromEntries(Object.entries(selection).filter(([, n]) => n > 0));
}

export function transferItem(g: GameState, id: string, to: "bag" | "warehouse"): GameState {
  const selection = battleBackpack(g);
  if (!Object.hasOwn(medicineEffects, id)) throw Error("成长物品不能放入战斗背包");
  if (to === "bag") {
    if (warehouseQuantity(g, id) < 1) throw Error("仓库中没有该物品");
    if ((selection[id] ?? 0) >= 5) throw Error("该物品已携带5/5件");
    if (Object.values(selection).reduce((a,b)=>a+b,0) >= 20) throw Error("背包已满20/20件");
    selection[id] = (selection[id] ?? 0) + 1;
  } else {
    if (!(selection[id] > 0)) throw Error("背包中没有该物品");
    selection[id] -= 1;
  }
  return setBackpack(g, selection);
}

export function reconcileBackpack(g: GameState): GameState {
  const selection = savedSelection(g);
  selectionShape(selection);
  const remaining = Object.fromEntries(
    Object.entries(selection)
      .map(([id, n]) => [id, Math.min(n, owned(g, id))] as const)
      .filter(([, n]) => n > 0),
  );
  // A legacy game without a camp can still obtain its default battle snapshot.
  if (!g.camp) return structuredClone(g);
  return setBackpack(g, remaining);
}
