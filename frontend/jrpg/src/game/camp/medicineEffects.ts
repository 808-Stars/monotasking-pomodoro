import { medicines } from "../economy.ts";
import { recipes } from "./medicine.ts";
export interface MedicineEffect {
  hp?: number | "full";
  sp?: number | "full";
  revive?: number;
  bp?: number;
  all?: boolean;
  cleanse?: boolean;
  buff?: "物攻提升" | "属攻提升" | "物防提升" | "属防提升";
  slow?: "hp" | "sp";
}
export const medicineEffects: Record<string, MedicineEffect> = {
  hp: { hp: 500 },
  sp: { sp: 30 },
  revive: { revive: 0.25 },
  bp: { bp: 1 },
  cleanse: { cleanse: true },
  "hp-concentrated": { hp: 1500 },
  "sp-concentrated": { sp: 60 },
  "revive-concentrated": { revive: 0.5 },
  "bp-concentrated": { bp: 2 },
  "hp-full": { hp: "full" },
  "sp-full": { sp: "full" },
  "revive-full": { revive: 1 },
  "bp-high": { bp: 3 },
  "hp-spray": { hp: 300, all: true },
  "sp-spray": { sp: 15, all: true },
  "cleanse-spray": { cleanse: true, all: true },
  "hp-slow": { slow: "hp" },
  "sp-slow": { slow: "sp" },
  restore: { hp: 500, sp: 30 },
  "cleanse-hp": { hp: 500, cleanse: true },
  "attack-tonic": { hp: 500, buff: "物攻提升" },
  "magic-tonic": { sp: 30, buff: "属攻提升" },
  "defense-tonic": { hp: 500, buff: "物防提升" },
  "resistance-tonic": { sp: 30, buff: "属防提升" },
};
export const battleMedicines = [
  ...medicines,
  ...recipes
    .filter((r) => medicineEffects[r.id])
    .map((r) => ({ id: r.id, name: r.name, description: r.effect })),
];
