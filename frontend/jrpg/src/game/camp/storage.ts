import type { GameState } from "../economy.ts";

export function storedBackpack(g: GameState): Record<string, number> {
  return g.camp?.backpack ?? Object.fromEntries(
    Object.entries({hp:4,sp:2,revive:1}).map(([id,n])=>[id,Math.min(n,g.inventory[id]??0)]).filter(([,n])=>Number(n)>0),
  );
}
export function warehouseQuantity(g: GameState, id: string): number {
  return (g.inventory[id] ?? 0) - (storedBackpack(g)[id] ?? 0);
}
export function storageSnapshot(g: GameState): GameState {
  const next=structuredClone(g);
  if(next.camp) next.camp.backpack={...storedBackpack(g)};
  return next;
}
