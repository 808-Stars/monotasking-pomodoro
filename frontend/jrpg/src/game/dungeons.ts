import type { GameState, Resource } from "./economy.ts";
export type Difficulty = "normal" | "advanced";
export function requireDifficulty(value: Difficulty) {
  if (value !== "normal" && value !== "advanced") throw Error("难度无效");
}

// Ordinary-door prototype. Non-coin encounters still reuse the warden AI;
// presentation/enemyArt.ts selects independent artwork for all resource doors.
export const dungeons = {
  coin: {
    name: "铸金穹厅",
    boss: "铸金监守",
    stars: 1,
    hp: 18000,
    shield: 6,
    weaknesses: ["枪", "扇", "火", "雷"],
    hue: 0,
    scene: 2,
  },
  exp: {
    name: "回响书库",
    boss: "回响馆长",
    stars: 2,
    hp: 4500,
    shield: 4,
    weaknesses: ["剑", "杖", "水", "火"],
    hue: 160,
    scene: 6,
  },
  jp: {
    name: "试艺回廊",
    boss: "武艺宗师",
    stars: 3,
    hp: 5500,
    shield: 5,
    weaknesses: ["枪", "弓", "风", "雷"],
    hue: 280,
    scene: 4,
  },
  gem: {
    name: "棱镜矿庭",
    boss: "棱镜核心",
    stars: 4,
    hp: 6500,
    shield: 6,
    weaknesses: ["斧", "扇", "木", "土"],
    hue: 70,
    scene: 0,
  },
} satisfies Record<Resource, unknown>;
export const dungeonOrder: Resource[] = ["coin", "exp", "jp", "gem"];
// Formal draft panels only. Independent advanced actions remain TODO; the local
// prototype still uses the warden action library, not a balanced advanced AI.
const advancedPanels = {
  coin: {
    hp: 100000,
    shield: 10,
    attack: 840,
    magic: 720,
    defense: 360,
    resistance: 300,
    speed: 115,
  },
  exp: {
    hp: 90000,
    shield: 10,
    attack: 760,
    magic: 800,
    defense: 300,
    resistance: 320,
    speed: 125,
  },
  jp: {
    hp: 95000,
    shield: 10,
    attack: 780,
    magic: 780,
    defense: 320,
    resistance: 320,
    speed: 140,
  },
  gem: {
    hp: 78000,
    shield: 10,
    attack: 760,
    magic: 800,
    defense: 320,
    resistance: 340,
    speed: 120,
  },
};
export function resourceEncounter(
  resource: Resource,
  difficulty: Difficulty = "normal",
) {
  requireDifficulty(difficulty);
  const base = {
    ...dungeons[resource],
    attack: 400,
    magic: 360,
    defense: 180,
    resistance: 160,
    speed: 110,
  };
  return difficulty === "advanced"
    ? { ...base, ...advancedPanels[resource], stars: 5 }
    : base;
}
// Single-subject local prototype. Independent final-boss actions remain pending;
// do not restore retired barriers/side wheels from historical design tables.
export function finalEncounter(stage: 1 | 2) {
  return {
    name: stage === 1 ? "终刻王座 · 破律战" : "终刻王座 · 终刻战",
    boss: "终刻魔王",
    stars: 5,
    hp: stage === 1 ? 82000 : 88000,
    shield: stage === 1 ? 10 : 12,
    weaknesses:
      stage === 1 ? ["扇", "杖", "雷", "土"] : ["剑", "弓", "火", "土"],
    hue: 0,
    scene: 1,
  };
}
export function doorCleared(
  g: GameState,
  resource: Resource,
  difficulty: Difficulty = "normal",
) {
  requireDifficulty(difficulty);
  if (difficulty === "advanced") return !!g.advancedWins?.includes(resource);
  return (
    g.dungeonWins?.includes(resource) || (resource === "coin" && g.firstWin)
  );
}
export function doorDiscovery(
  g: GameState,
  resource: Resource,
  difficulty: Difficulty = "normal",
) {
  requireDifficulty(difficulty);
  if (difficulty === "advanced")
    return g.advancedDiscoveries?.[resource] ?? { weaknesses: [], skills: [] };
  return (
    g.dungeonDiscoveries?.[resource] ?? {
      weaknesses: resource === "coin" ? g.discoveredWeaknesses : [],
      skills: resource === "coin" ? g.discoveredSkills : [],
    }
  );
}
