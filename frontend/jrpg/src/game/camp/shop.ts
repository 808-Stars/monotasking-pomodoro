import type { GameState } from "../economy.ts";
import { products } from "./catalog.ts";
import { reconcileBackpack } from "./backpack.ts";
import { migrateCamp } from "./migrate.ts";
export const shopThresholds = [0, 3000, 15000] as const;
export function shopSpending(g: GameState): number {
  const value = g.camp?.shopSpent ?? 0;
  if (!Number.isSafeInteger(value) || value < 0) throw Error("商店消费记录无效");
  return value;
}
export function shopLevel(g: GameState): number {
  const spent = shopSpending(g);
  return spent >= shopThresholds[2] ? 2 : spent >= shopThresholds[1] ? 1 : 0;
}
export function checkout(
  input: GameState,
  cart: Record<string, number>,
): GameState {
  let cost = 0;
  for (const [id, n] of Object.entries(cart)) {
    if (!Number.isSafeInteger(n) || n < 0) throw Error("数量无效");
    if (!n) continue;
    const p = products.find((p) => p.id === id);
    if (!p) throw Error("未知商品");
    if (!Number.isSafeInteger((input.inventory[id] ?? 0) + n))
      throw Error("库存数量超出安全整数范围");
    if (p.tier > shopLevel(input))
      throw Error("尚未开放该货架");
    if (p.job && (input.camp?.certificatePurchases[p.job] ?? 0) + n > 7)
      throw Error("本周目该资格证累计供应7张");
    cost += p.price * n;
  }
  if (!Number.isSafeInteger(cost) || cost <= 0) throw Error("购物清单无效");
  if (input.coins < cost) throw Error("古币不足");
  // 固定旧档默认携带快照，再入库，避免新购药品被默认规则自动装包。
  const g = reconcileBackpack(migrateCamp(structuredClone(input)));
  const spent = shopSpending(g) + cost;
  if (!Number.isSafeInteger(spent)) throw Error("累计消费超出安全整数范围");
  g.coins -= cost;
  g.camp!.shopSpent = spent;
  for (const [id, n] of Object.entries(cart)) {
    if (!n) continue;
    const p = products.find((p) => p.id === id)!;
    g.inventory[id] = (g.inventory[id] ?? 0) + n;
    if (p.job)
      g.camp!.certificatePurchases[p.job] =
        (g.camp!.certificatePurchases[p.job] ?? 0) + n;
  }
  return g;
}
