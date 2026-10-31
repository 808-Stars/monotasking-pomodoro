import { createGame, type GameState } from "../economy.ts";
import { migrateCamp } from "./migrate.ts";
import { logicalDate } from "./claims.ts";
import { freezeTavern } from "../tavern.ts";
export function isMonthExpired(g: GameState, now = Date.now()) {
  return !!g.camp && logicalDate(now).slice(0, 7) > g.camp.monthKey;
}
export function rollMonth(input: GameState, now = Date.now()): GameState {
  if (!isMonthExpired(input, now)) return input;
  const c = input.camp!;
  const next = migrateCamp(createGame(input.rng.state), now);
  next.achievements = [...input.achievements];
  if (input.tavern)
    next.tavern = freezeTavern(input.tavern, next.camp!.monthKey);
  next.camp!.migrationNotice = false;
  next.camp!.archives = [
    ...(c.archives ?? []),
    {
      monthKey: c.monthKey,
      spent: input.spent,
      firstWin: input.firstWin,
      advancedWins: [...(input.advancedWins ?? [])],
      dungeonWins: [
        ...new Set([
          ...(input.dungeonWins ?? []),
          ...(input.firstWin ? ["coin"] : []),
        ]),
      ],
      nodes: { ...c.purchasedNodes },
      days: [...c.claimState.days],
      gems: { ...input.gems },
      battles: input.settledBattleIds.length,
      skills: [...input.discoveredSkills],
    },
  ];
  return next;
}
