import {
  applyBattleInventory,
  heroStats,
  jobs,
  settleBattle,
  type Resource,
} from "./economy.ts";
import type { Save } from "./persistence.ts";
import { createBattle } from "./battle.ts";
import {
  dungeons,
  doorCleared,
  requireDifficulty,
  type Difficulty,
} from "./dungeons.ts";
import { isMonthExpired } from "./camp/month.ts";
import { logicalDate } from "./camp/claims.ts";
import { battleBackpack } from "./camp/backpack.ts";
import { snapshotBuild, recordDemonVictory } from "./tavern.ts";
import { equipSubjob, equipSupports } from "./camp/jobs.ts";
import { equippedGemSelection } from "./camp/gems.ts";

export interface StartOptions {
  difficulty?: Difficulty;
  resource?: Resource;
  requestId: string;
  now?: number;
  final?: boolean;
  sandbox?: boolean;
}
export function continueFinalChallenge(save: Save, now = Date.now()): Save {
  const b = save.battle;
  if (!b?.finale) throw Error("不是魔王双战会话");
  if (b.finale.stage === 2) return save;
  if (b.outcome !== "victory") throw Error("第一场尚未胜利");
  if (isMonthExpired(save.game, now)) throw Error("周目已结束，不能开始第二场");
  const locked = structuredClone(b.finale.lockedGame);
  locked.camp!.party = [...b.finale.snapshot.teams[1]];
  locked.inventory = structuredClone(b.inventory);
  locked.rng = structuredClone(b.rng);
  const second = createBattle(locked, "coin", {
    finalStage: 2,
    sandbox: b.sandbox,
  });
  second.id = b.id;
  second.startRequestId = b.startRequestId;
  second.startedAt = now;
  second.carriedInventory = structuredClone(b.carriedInventory);
  second.finale = {
    ...b.finale,
    stage: 2,
    first: {
      rounds: b.round,
      started: b.startedAt!,
      ended: b.endedAt ?? now,
      heroes: Object.fromEntries(
        b.party.map((u) => [u.id, { hp: u.hp, sp: u.sp }]),
      ),
    },
  };
  return { ...save, battle: second };
}

export function finishChallenge(save: Save, now = Date.now()): Save {
  const b = save.battle;
  if (!b) return save;
  if (b.outcome === "active") throw Error("战斗尚未结束");
  if (b.finale?.stage === 1 && b.outcome === "victory")
    return continueFinalChallenge(save, now);
  if (isMonthExpired(save.game, now)) return { ...save, battle: null };
  if (!b.finale) {
    const result = settleBattle(save.game, {
      ...b,
      outcome: b.outcome,
      heroes: Object.fromEntries(
        b.party.map((u) => [u.id, { hp: u.hp, sp: u.sp }]),
      ),
    });
    return { ...save, game: result.game, battle: null };
  }
  if (save.game.settledBattleIds.includes(b.id))
    return { ...save, battle: null };
  let game = b.sandbox
    ? structuredClone(save.game)
    : applyBattleInventory(save.game, b.inventory, b.carriedInventory);
  if (!b.sandbox) {
    game.heroes = {
      ...game.heroes,
      ...b.finale.first?.heroes,
      ...Object.fromEntries(b.party.map((u) => [u.id, { hp: u.hp, sp: u.sp }])),
    };
    game.rng = structuredClone(b.rng);
    game.needsRest = false;
  }
  game.settledBattleIds.push(b.id);
  if (
    !b.sandbox &&
    b.outcome === "victory" &&
    b.finale.stage === 2 &&
    b.finale.first
  ) {
    game = recordDemonVictory(
      game,
      {
        id: b.id,
        snapshot: b.finale.snapshot,
        rounds: [b.finale.first.rounds, b.round],
        started: [b.finale.first.started, b.startedAt!],
        ended: [b.finale.first.ended, b.endedAt ?? now],
      },
      now,
    );
    game.finalCleared = true;
  }
  // Final defeat item tier is still TODO in the formal design. Do not silently
  // choose ordinary/advanced rewards or route the result through a resource door.
  return { ...save, game, battle: null };
}
export function startChallenge(save: Save, options: StartOptions): Save {
  const resource = options.resource ?? "coin";
  const difficulty = options.difficulty ?? "normal";
  requireDifficulty(difficulty);
  if (options.final && difficulty !== "normal")
    throw Error("魔王没有普通／进阶难度选择");
  const now = options.now ?? Date.now();
  if (!options.requestId.trim() || !Number.isFinite(now) || !dungeons[resource])
    throw Error("入场请求无效");
  if (save.battle) {
    if (
      save.battle.startRequestId === options.requestId &&
      !!save.battle.finale === !!options.final &&
      (!options.final || save.battle.sandbox === !!options.sandbox) &&
      (options.final ||
        (save.battle.resource === resource &&
          (save.battle.difficulty ?? "normal") === difficulty))
    )
      return save;
    throw Error("已有战斗，请恢复当前会话");
  }
  if (save.game.settledBattleIds.includes(`entry:${options.requestId}`))
    throw Error("此入场请求已经结算，不能重复开始");
  if (
    isMonthExpired(save.game, now) ||
    (save.game.camp && logicalDate(now).slice(0, 7) !== save.game.camp.monthKey)
  )
    throw Error("周目已结束，请先开启本月");
  const party = save.game.camp?.party ?? [
    "warrior",
    "scholar",
    "cleric",
    "merchant",
  ];
  if (
    party.length !== 4 ||
    new Set(party).size !== 4 ||
    party.some((id) => !jobs.includes(id))
  )
    throw Error("配置无效：请选择四名不同角色");
  if (options.final && !save.game.camp) throw Error("请先初始化营地");
  for (const id of jobs) {
    const sub = save.game.camp?.equippedSubjobs[id];
    if (sub) equipSubjob(save.game, id, sub);
    if (save.game.camp)
      equipSupports(save.game, id, save.game.camp.supports[id] ?? []);
  }
  if (options.final && options.sandbox && !save.game.finalCleared)
    throw Error("首次通关后才开放魔王沙盒");
  if (difficulty === "advanced" && !doorCleared(save.game, resource))
    throw Error("本门普通首胜后才开放进阶挑战");
  const sandbox = options.final
    ? !!options.sandbox
    : !!doorCleared(save.game, resource, difficulty);
  const backpack = battleBackpack(save.game);
  equippedGemSelection(save.game);
  if (
    !sandbox &&
    (!Number.isSafeInteger(save.game.stamina) || save.game.stamina < 20)
  )
    throw Error("挑战需要20体力");
  if (
    !sandbox &&
    (!Number.isSafeInteger(save.game.spent) ||
      save.game.spent < 0 ||
      !Number.isSafeInteger(save.game.spent + 20))
  )
    throw Error("体力消耗记录无效");
  // Preparation works on a copy; only the single checkpoint transaction commits it.
  const prepared = structuredClone(save.game);
  for (const id of jobs) {
    const stats = heroStats(id, prepared);
    prepared.heroes[id] = { hp: stats.maxHp, sp: stats.maxSp };
  }
  if (!sandbox) {
    prepared.stamina -= 20;
    prepared.spent += 20;
    prepared.needsRest = false; // retire old saved marker, never use it as a gate
  }
  const battle = createBattle(prepared, resource, {
    difficulty,
    sandbox,
    ...(options.final ? { finalStage: 1 as const } : {}),
  });
  battle.startRequestId = options.requestId;
  battle.startedAt = now;
  battle.id = `entry:${options.requestId}`;
  battle.inventory = structuredClone(backpack);
  battle.carriedInventory = structuredClone(backpack);
  if (options.final) {
    const lockedGame = structuredClone(prepared);
    delete lockedGame.tavern;
    battle.finale = { stage: 1, snapshot: snapshotBuild(prepared), lockedGame };
  }
  return { ...save, game: sandbox ? save.game : prepared, battle };
}
