import { heroStats, type GameState } from "../economy.ts";
import { memoryLayoutVersion } from "./memoryData.ts";
export function migrateCamp(input: GameState, now = Date.now()): GameState {
  if (input.camp?.memoryVersion === memoryLayoutVersion) return input;
  const game = structuredClone(input);
  if (game.camp) {
    const previousNodes = structuredClone(game.camp.purchasedNodes);
    const previousSupports = structuredClone(game.camp.supports);
    const refundedExp = Object.entries(previousNodes).reduce((sum, [id, paid]) => {
      if (id === "R5C5") return sum;
      if (!Number.isSafeInteger(paid) || paid < 0 || !Number.isSafeInteger(sum + paid))
        throw Error("旧忆存档费用异常，已保留原存档，请先检查。");
      return sum + paid;
    }, 0);
    if (!Number.isSafeInteger(game.exp + refundedExp))
      throw Error("旧忆余额超出安全范围，已保留原存档。");
    game.exp += refundedExp;
    game.camp.memoryMigration = { previousNodes, previousSupports, refundedExp };
    game.camp.memoryVersion = memoryLayoutVersion;
    game.camp.purchasedNodes = { R5C5: 0 };
    for (const id of Object.keys(game.camp.supports))
      game.camp.supports[id] = game.camp.supports[id].slice(0, 1);
    game.camp.migrationNotice = true;
    return clampCampVitals(game);
  }
  game.camp = {
    version: 1,
    memoryVersion: memoryLayoutVersion,
    monthKey: new Date(now + 4 * 3600000).toISOString().slice(0, 7),
    startedAt: now,
    purchasedNodes: { R5C5: 0 },
    skills: {},
    subjobUnlocks: {},
    equippedSubjobs: {},
    supports: {},
    party: ["warrior", "scholar", "cleric", "merchant"],
    certificatePurchases: {},
    claimState: { days: [], mornings: [], lastSupply: now, latestTime: now },
    migrationNotice: true,
  };
  return clampCampVitals(game);
}
export function clampCampVitals(game: GameState): GameState {
  const next = structuredClone(game);
  for (const [id, current] of Object.entries(next.heroes)) {
    const stats = heroStats(id, next);
    current.hp = Math.min(current.hp, stats.maxHp);
    current.sp = Math.min(current.sp, stats.maxSp);
  }
  return next;
}
