import type { BattleState } from "../game/battle.ts";

export type BattleScenePhase = "opening" | "main";

/** Presentation only: this checkpoint never resolves a battle or grants resources. */
export interface BattleSceneCheckpoint {
  version: 1;
  key: string;
  phase: BattleScenePhase;
  openingElapsedMs: number;
}

export const openingDurationMs = 2500;

export function sceneKeyFor(battle: Pick<BattleState, "id" | "finale">): string {
  return `${battle.id}:${battle.finale?.stage ?? 0}`;
}

export function createSceneCheckpoint(key: string): BattleSceneCheckpoint {
  return { version: 1, key, phase: "opening", openingElapsedMs: 0 };
}

export function advanceOpening(
  checkpoint: BattleSceneCheckpoint,
  elapsedMs: number,
): BattleSceneCheckpoint {
  if (checkpoint.phase === "main") return checkpoint;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return checkpoint;
  const openingElapsedMs = Math.min(
    openingDurationMs,
    Math.max(checkpoint.openingElapsedMs, elapsedMs),
  );
  return {
    ...checkpoint,
    openingElapsedMs,
    phase: openingElapsedMs >= openingDurationMs ? "main" : "opening",
  };
}

interface BattleInputState {
  phase: BattleScenePhase;
  busy: boolean;
  layoutMoving: boolean;
  outcome: BattleState["outcome"];
}

/** Shared readiness gate; enemy advancement does not require a party actor. */
export function isBattleInputReady(input: BattleInputState): boolean {
  return input.phase === "main" && !input.busy && !input.layoutMoving
    && input.outcome === "active";
}

export function isCommandInputOpen(
  input: BattleInputState & { hasLivingPartyActor: boolean },
): boolean {
  return isBattleInputReady(input) && input.hasLivingPartyActor;
}
