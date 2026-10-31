import type { GameState } from "../economy.ts";
import { migrateCamp } from "./migrate.ts";
export type ClaimKind = "checkin" | "morning" | "supply";
export function logicalDate(now: number) {
  return new Date(now + 4 * 3600000).toISOString().slice(0, 10);
}
export function claimAvailability(g: GameState, now: number) {
  const c = g.camp!;
  const day = logicalDate(now);
  const hour = new Date(now + 8 * 3600000).getUTCHours();
  const valid =
    Number.isFinite(now) &&
    now >= c.claimState.latestTime &&
    day.slice(0, 7) === c.monthKey;
  return {
    checkin: valid && !c.claimState.days.includes(day),
    morning:
      valid && hour >= 6 && hour < 8 && !c.claimState.mornings.includes(day),
    supply: valid && now - c.claimState.lastSupply >= 5 * 3600000,
  };
}
export function claimReward(
  input: GameState,
  kind: ClaimKind,
  now: number,
): GameState {
  const g = migrateCamp(structuredClone(input), now);
  if (!claimAvailability(g, now)[kind])
    throw Error("尚未达到领取条件，或已经领取／周目已结束");
  const c = g.camp!,
    day = logicalDate(now);
  let n = 0;
  if (kind === "checkin") {
    c.claimState.days.push(day);
    n = c.claimState.days.length * 20;
  }
  if (kind === "morning") {
    c.claimState.mornings.push(day);
    n = 100;
  }
  if (kind === "supply") {
    c.claimState.lastSupply = now;
    n = 50;
  }
  c.claimState.latestTime = now;
  g.stamina += n;
  return g;
}
