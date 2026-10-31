import { createGame, heroStats, type GameState } from "./economy.ts";
import { abnormalityTypes, type StatusId } from "./abnormality.ts";
import { migrateCamp } from "./camp/migrate.ts";
import { memoryLayoutVersion } from "./camp/memoryData.ts";
import type { BattleState, BuffId, Unit } from "./battle.ts";
import { createSceneCheckpoint, sceneKeyFor, openingDurationMs, type BattleSceneCheckpoint } from "../presentation/battleSceneState.ts";
export interface Save {
  revision: number;
  game: GameState;
  battle: BattleState | null;
  battleScene?: BattleSceneCheckpoint;
}
export const STORAGE_KEY = "monopomo-jrpg-demo-v1";
const DB = "monopomo-jrpg-demo-v1";
const currentBuffs = new Set<BuffId>([
  "物攻提升",
  "物攻下降",
  "属攻提升",
  "属攻下降",
  "物防提升",
  "物防下降",
  "属防提升",
  "属防下降",
  "速度提升",
  "速度下降",
]);

const currentEnemySkillName = (name: string) =>
  name === "压金锤" ? "铸金斩" : name === "重锤清算" ? "重剑清算" : name;

export function normalizeSave(input: Save): Save {
  // Rename presentation strings only; retain progress, pending heavy attacks and RNG.
  const save = { ...input };
  const scene = save.battleScene;
  if (!save.battle || !scene || scene.version !== 1 || scene.key !== sceneKeyFor(save.battle)
    || !["opening", "main"].includes(scene.phase) || !Number.isFinite(scene.openingElapsedMs)
    || scene.openingElapsedMs < 0) {
    delete save.battleScene;
  } else {
    const elapsed = Math.min(openingDurationMs, scene.openingElapsedMs);
    save.battleScene = { ...scene, openingElapsedMs: elapsed, phase: elapsed >= openingDurationMs ? "main" : "opening" };
  }
  if (input.game.discoveredSkills || input.game.dungeonDiscoveries) {
    save.game = {
      ...input.game,
      ...(input.game.discoveredSkills
        ? {
            discoveredSkills: [
              ...new Set(
                input.game.discoveredSkills.map(currentEnemySkillName),
              ),
            ],
          }
        : {}),
      ...(input.game.dungeonDiscoveries
        ? {
            dungeonDiscoveries: Object.fromEntries(
              Object.entries(input.game.dungeonDiscoveries).map(
                ([door, record]) => [
                  door,
                  record
                    ? {
                        ...record,
                        skills: [
                          ...new Set(record.skills.map(currentEnemySkillName)),
                        ],
                      }
                    : record,
                ],
              ),
            ),
          }
        : {}),
    };
  }
  if (!save.battle) return { ...save, game: migrateCamp(save.game) };
  // Retire the two vault guards without healing units, rerolling RNG or resetting progress.
  const retired = new Set(["mint-spear", "mint-shield"]);
  if ((save.battle.resource ?? "coin") === "coin" && save.battle.enemies.some(u => retired.has(u.id))) {
    const battle = save.battle;
    const enemies = battle.enemies.filter(u => !retired.has(u.id));
    const victory = battle.outcome === "active" && enemies.length > 0 && enemies.every(u => u.hp <= 0);
    const current = victory ? [] : battle.current.filter(n => !retired.has(n.unitId));
    save.battle = {
      ...battle,
      enemies,
      current,
      next: victory ? [] : battle.next.filter(n => !retired.has(n.unitId)),
      preparedNode: current.some(n => n.id === battle.preparedNode) ? battle.preparedNode : null,
      outcome: victory ? "victory" : battle.outcome,
    };
  }
  const normalizeUnit = (unit: Unit): Unit => {
    const current = { ...unit } as Unit & Record<string, unknown>;
    current.ap = Number.isSafeInteger(unit.ap) && unit.ap >= 0 ? unit.ap : 0;
    current.tenacity = Number.isSafeInteger(unit.tenacity) && unit.tenacity > 0 ? unit.tenacity
      : save.battle!.party.includes(unit) && save.game.camp ? heroStats(unit.id, save.game).tenacity : 100;
    current.statuses = {};
    for (const [oldType, status] of Object.entries(unit.statuses ?? {})) {
      const type = (oldType === "爆炸" ? "爆破" : oldType) as StatusId;
      if (!abnormalityTypes.includes(type) || !Number.isSafeInteger(status?.turns) || status.turns <= 0) continue;
      const old = current.statuses[type];
      const state = { ...status, turns: status.turns + (old?.turns ?? 0) };
      if (type === "爆破") {
        state.damageStacks = (Number.isSafeInteger(status.damageStacks) && status.damageStacks! > 0 ? status.damageStacks! : status.turns)
          + (old?.damageStacks ?? 0);
        state.potency = (Number.isFinite(status.potency) && status.potency! >= 0 ? status.potency! : 0) + (old?.potency ?? 0);
      }
      current.statuses[type] = state;
    }
    if (current.apLastType && !abnormalityTypes.includes(current.apLastType)) delete current.apLastType;
    delete current.accuracy;
    delete current.crit;
    delete current.evasion;
    const charges = current.evasionCharges;
    current.evasionCharges =
      Number.isSafeInteger(charges) && Number(charges) >= 0
        ? Number(charges)
        : 0;
    current.buffs = Object.fromEntries(
      Object.entries(current.buffs ?? {}).filter(
        ([id, turns]) =>
          currentBuffs.has(id as BuffId) &&
          Number.isSafeInteger(turns) &&
          Number(turns) > 0,
      ),
    ) as Unit["buffs"];
    if (current.intent) current.intent = currentEnemySkillName(current.intent);
    return current;
  };
  return {
    ...save,
    battle: {
      ...save.battle,
      ...(save.battle.discoveredSkills
        ? {
            discoveredSkills: [
              ...new Set(
                save.battle.discoveredSkills.map(currentEnemySkillName),
              ),
            ],
          }
        : {}),
      party: save.battle.party.map(normalizeUnit),
      enemies: save.battle.enemies.map(normalizeUnit),
    },
  };
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("checkpoint");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(new Error("存档被其他窗口占用，请关闭其他Demo标签页"));
  });
}
export async function loadSave(): Promise<Save> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("checkpoint", "readwrite");
      const store = tx.objectStore("checkpoint");
      const r = store.get("current");
      let next: Save;
      r.onsuccess = () => {
        try {
          const mirror = r.result ? null : localStorage.getItem(STORAGE_KEY);
          const raw: Save | undefined =
            r.result ?? (mirror ? JSON.parse(mirror) : undefined);
          next = normalizeSave(
            raw ?? { revision: 0, game: createGame(), battle: null },
          );
          const migrating = !!raw
            && raw.game.camp?.memoryVersion !== memoryLayoutVersion
            && next.game.camp?.memoryVersion === memoryLayoutVersion;
          if (migrating) {
            store.put(raw, raw.game.camp ? "backup-before-memory-layout5" : "backup-before-camp-v1");
            next = { ...next, revision: raw.revision + 1 };
          }
          if (!raw && next.game.camp) next.game.camp.migrationNotice = false;
          if (!r.result || migrating) {
            store.put(next, "current");
          }
        } catch (error) {
          tx.abort();
          reject(error);
        }
      };
      tx.oncomplete = () => resolve(next);
      tx.onabort = () =>
        reject(tx.error ?? Error("首次建档或迁移失败，原存档未修改。"));
      tx.onerror = () => reject(tx.error);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function resetUnavailableSave(): Promise<Save> {
  const db = await open();
  try {
    const next = await new Promise<Save>((resolve, reject) => {
      const tx = db.transaction("checkpoint", "readwrite");
      const store = tx.objectStore("checkpoint");
      let fresh: Save;
      const read = store.get("current");
      read.onsuccess = () => {
        fresh = {
          revision: (read.result?.revision ?? 0) + 1,
          game: migrateCamp(createGame()),
          battle: null,
        };
        store.clear();
        store.put(fresh, "current");
      };
      tx.oncomplete = () => resolve(fresh);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("存档重置失败。"));
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* IndexedDB remains authoritative. */
    }
    return next;
  } finally {
    db.close();
  }
}
// One authoritative transaction: battle settlement and game resources cannot tear.
// localStorage is a mirror; a failed mirror cannot invalidate the committed checkpoint.
export async function saveCheckpoint(
  previous: Save,
  game: GameState,
  battle: BattleState | null,
  reset = false,
  scene?: BattleSceneCheckpoint | null,
): Promise<Save> {
  const next: Save = { revision: previous.revision + 1, game, battle };
  if (battle && scene !== null) {
    const key = sceneKeyFor(battle);
    if (scene) {
      if (scene.key !== key) throw Error("开幕进度不属于当前场次。");
      next.battleScene = scene;
    } else if (previous.battleScene?.key === key) next.battleScene = previous.battleScene;
    else if (!previous.battle || sceneKeyFor(previous.battle) !== key) next.battleScene = createSceneCheckpoint(key);
  }
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("checkpoint", "readwrite");
      const store = tx.objectStore("checkpoint");
      let conflict = false;
      const r = store.get("current");
      r.onsuccess = () => {
        if (r.result && r.result.revision !== previous.revision) {
          conflict = true;
          tx.abort();
          return;
        }
        if (r.result && !r.result.game.camp && game.camp) {
          store.put(r.result, "backup-before-camp-v1");
        } else if (r.result && r.result.game.camp?.memoryVersion !== memoryLayoutVersion
          && game.camp?.memoryVersion === memoryLayoutVersion) {
          store.put(r.result, "backup-before-memory-layout5");
        } else if (!r.result && previous.game.camp?.migrationNotice) {
          const mirror = localStorage.getItem(STORAGE_KEY);
          if (mirror) store.put(JSON.parse(mirror), "backup-before-camp-v1");
        }
        if (reset) store.clear();
        store.put(next, "current");
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(
          new Error(
            conflict
              ? "存档已在另一窗口更新，请刷新本页后继续。"
              : "存档写入失败，本次操作未生效。",
          ),
        );
      tx.onerror = () => reject(tx.error);
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* IndexedDB remains authoritative. */
    }
    return next;
  } finally {
    db.close();
  }
}
