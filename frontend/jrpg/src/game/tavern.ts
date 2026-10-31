import { jobs, type GameState } from "./economy.ts";
import { battleBackpack } from "./camp/backpack.ts";
import { growthFor } from "./camp/memory.ts";
import { logicalDate } from "./camp/claims.ts";

export interface BuildSnapshot {
  version: string;
  monthKey: string;
  teams: string[][];
  nodes: Record<string, number>;
  growth: ReturnType<typeof growthFor>;
  subjobs: Record<string, string>;
  supports: Record<string, string[]>;
  backpack: Record<string, number>;
  gems: Record<string, Record<string, string>>;
}

export interface DemonRecord {
  id: string;
  ownerId: string;
  monthKey: string;
  version: string;
  snapshot: BuildSnapshot;
  rounds: [number, number];
  started: [number, number];
  ended: [number, number];
  totalRounds: number;
  elapsedMs: number;
  spent: number;
  createdAt: number;
  verification: "unverified";
}

export interface BoardEntry extends DemonRecord {
  /** The entry's id is independent of the source victory id. */
  recordId: string;
  code: string;
  uploadedAt: number;
  frozen: boolean;
  invalidatedAt?: number;
  views: number;
  favorites: number;
  imports: number;
  adopted: number;
  heat: number;
  summaryStatus: "pending-medicine-valuation";
}

export interface TavernState {
  /** This identity and every code live in one saved local profile, not an account. */
  scope: "local";
  ownerId: string;
  monthKey: string;
  records: DemonRecord[];
  /** Includes historical entries and invalidated replacement tombstones. */
  entries: BoardEntry[];
  recordedIds: string[];
  requests: Record<string, { recordId: string; entryId: string }>;
  interactions: Record<
    string,
    Record<string, { viewed: boolean; favorite: boolean; imported: boolean }>
  >;
}

export type TavernBoard = "achiever" | "explorer" | "social" | "killer";
export type DemonVictory = Pick<
  DemonRecord,
  "id" | "snapshot" | "rounds" | "started" | "ended"
>;
const buildVersion = "jrpg-local-11.7-confirmed-skills-20261018";

function monthKey(value: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw Error("月份无效");
}

function timestamp(value: number): string {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 8.64e15 - 4 * 3600000
  )
    throw Error("时间无效");
  return logicalDate(value).slice(0, 7);
}

function identifier(value: string): void {
  if (typeof value !== "string" || !value.trim()) throw Error("标识不能为空");
}

function teamsValid(teams: string[][]): void {
  if (
    !Array.isArray(teams) ||
    teams.length !== 2 ||
    teams.some((t) => !Array.isArray(t) || t.length !== 4) ||
    new Set(teams.flat()).size !== 8 ||
    teams.flat().some((id) => !jobs.includes(id))
  )
    throw Error("队伍配置无效：需要两支不重叠的四人队伍");
}

export function snapshotBuild(g: GameState): BuildSnapshot {
  if (!g.camp) throw Error("请先初始化营地");
  monthKey(g.camp.monthKey);
  const first = [...g.camp.party];
  const teams = [first, jobs.filter((id) => !first.includes(id))];
  teamsValid(teams);
  return structuredClone({
    version: buildVersion,
    monthKey: g.camp.monthKey,
    teams,
    nodes: g.camp.purchasedNodes,
    growth: growthFor(g),
    subjobs: g.camp.equippedSubjobs,
    supports: g.camp.supports,
    backpack: battleBackpack(g),
    gems: g.camp.gemEquipment ?? {},
  });
}

export function ensureTavern(g: GameState): GameState {
  if (!g.camp) throw Error("请先初始化营地");
  monthKey(g.camp.monthKey);
  if (g.tavern) {
    // A late history interaction may already have frozen the month before camp rolls.
    if (g.camp.monthKey <= g.tavern.monthKey) return g;
    const next = structuredClone(g);
    next.tavern = freezeTavern(g.tavern, g.camp.monthKey);
    return next;
  }
  const next = structuredClone(g);
  next.tavern = {
    scope: "local",
    ownerId: `local-owner-${crypto.randomUUID()}`,
    monthKey: g.camp.monthKey,
    records: [],
    entries: [],
    recordedIds: [],
    requests: {},
    interactions: {},
  };
  return next;
}

export function freezeTavern(
  input: TavernState,
  newMonthKey: string,
): TavernState {
  monthKey(newMonthKey);
  if (newMonthKey < input.monthKey) throw Error("不能回退历史月份");
  if (newMonthKey === input.monthKey) return input;
  const next = structuredClone(input);
  next.monthKey = newMonthKey;
  next.records = [];
  next.recordedIds = [];
  for (const entry of next.entries)
    if (entry.monthKey < newMonthKey) entry.frozen = true;
  return next;
}

function currentMonth(g: GameState, now: number): string {
  const month = timestamp(now);
  if (
    !g.camp ||
    g.camp.monthKey !== month ||
    (g.tavern && g.tavern.monthKey > month)
  )
    throw Error("周目月份不符，请先开启本月");
  return month;
}

export function recordDemonVictory(
  g: GameState,
  input: DemonVictory,
  now: number,
): GameState {
  const month = currentMonth(g, now);
  identifier(input.id);
  identifier(input.snapshot.version);
  if (input.snapshot.monthKey !== month)
    throw Error("跨月战斗不能记录为本月成绩");
  teamsValid(input.snapshot.teams);
  if (
    ![input.rounds, input.started, input.ended].every(
      (pair) => Array.isArray(pair) && pair.length === 2,
    ) ||
    input.rounds.some((n) => !Number.isSafeInteger(n) || n <= 0) ||
    !Number.isSafeInteger(input.rounds[0] + input.rounds[1])
  )
    throw Error("需要完整两场的正整数轮次和计时");
  for (let i = 0; i < 2; i++) {
    if (
      timestamp(input.started[i]) !== month ||
      timestamp(input.ended[i]) !== month
    )
      throw Error("跨月战斗不能记录为本月成绩");
    if (input.ended[i] <= input.started[i] || input.ended[i] > now)
      throw Error("每场战斗必须有正的真实经过时间且已结束");
  }
  if (input.started[1] < input.ended[0]) throw Error("两场战斗计时不能重叠");
  if (!Number.isSafeInteger(g.spent) || g.spent < 0)
    throw Error("净体力消费无效");
  const initialized = ensureTavern(g);
  if (initialized.tavern!.recordedIds.includes(input.id)) return initialized;
  const next = structuredClone(initialized);
  const state = next.tavern!;
  const record: DemonRecord = {
    ...structuredClone(input),
    ownerId: state.ownerId,
    monthKey: month,
    version: input.snapshot.version,
    totalRounds: input.rounds[0] + input.rounds[1],
    elapsedMs:
      input.ended[0] - input.started[0] + input.ended[1] - input.started[1],
    spent: g.spent,
    createdAt: now,
    verification: "unverified",
  };
  state.records = [...state.records, record].slice(-4);
  state.recordedIds.push(record.id);
  next.finalCleared = true;
  return next;
}

export function uploadRecord(
  g: GameState,
  recordId: string,
  requestId: string,
  replaceEntryId?: string,
  now = Date.now(),
): GameState {
  const month = currentMonth(g, now);
  identifier(recordId);
  identifier(requestId);
  const initialized = ensureTavern(g);
  const state = initialized.tavern!;
  const receipt = Object.hasOwn(state.requests, requestId)
    ? state.requests[requestId]
    : undefined;
  if (receipt) {
    if (receipt.recordId !== recordId)
      throw Error("请求标识已用于另一条胜利记录");
    const original = state.entries.find((e) => e.id === receipt.entryId);
    if (!original || original.monthKey !== month)
      throw Error("不能上传历史月份记录");
    // Even after eviction/replacement, retries must never resurrect the old entry.
    return initialized;
  }
  const existing = state.entries.find(
    (e) =>
      e.recordId === recordId &&
      e.ownerId === state.ownerId &&
      e.monthKey === month &&
      e.invalidatedAt === undefined &&
      !e.frozen,
  );
  if (existing) {
    const next = structuredClone(initialized);
    next.tavern!.requests = {
      ...state.requests,
      [requestId]: { recordId, entryId: existing.id },
    };
    return next;
  }
  const record = state.records.find(
    (r) =>
      r.id === recordId && r.ownerId === state.ownerId && r.monthKey === month,
  );
  if (!record) throw Error("本月本地魔王记录不存在或已被挤出");
  const target =
    replaceEntryId === undefined
      ? undefined
      : state.entries.find((e) => e.id === replaceEntryId);
  if (replaceEntryId !== undefined) {
    if (!target) throw Error("覆盖目标不存在");
    if (target.ownerId !== state.ownerId) throw Error("只能覆盖本人条目");
    if (target.monthKey !== month || target.frozen)
      throw Error("不能覆盖历史冻结条目");
    if (target.invalidatedAt !== undefined) throw Error("覆盖目标已失效");
  }
  const count = state.entries.filter(
    (e) =>
      e.ownerId === state.ownerId &&
      e.monthKey === month &&
      e.invalidatedAt === undefined,
  ).length;
  if (!target && count >= 4) throw Error("本月已满4条，请明确选择覆盖条目");

  // All validations precede identifier creation; the copy is the atomic local commit.
  const next = structuredClone(initialized);
  const token = crypto.randomUUID();
  const entry: BoardEntry = {
    ...structuredClone(record),
    id: `local-entry-${token}`,
    recordId,
    code: `LOCAL-${token}`,
    uploadedAt: now,
    frozen: false,
    views: 0,
    favorites: 0,
    imports: 0,
    adopted: 0,
    heat: 0,
    summaryStatus: "pending-medicine-valuation",
  };
  if (target)
    next.tavern!.entries.find((e) => e.id === target.id)!.invalidatedAt = now;
  next.tavern!.entries.push(entry);
  next.tavern!.requests = {
    ...state.requests,
    [requestId]: { recordId, entryId: entry.id },
  };
  return next;
}

export function findEntry(g: GameState, code: string): BoardEntry | undefined {
  const entry = g.tavern?.entries.find(
    (e) => e.code === code && e.invalidatedAt === undefined,
  );
  return entry ? structuredClone(entry) : undefined;
}

export function leaderboard(
  g: GameState,
  board: TavernBoard,
  month?: string,
): (BoardEntry & { rank: number })[] {
  if (!["achiever", "explorer", "social", "killer"].includes(board))
    throw Error("未知榜单");
  const selectedMonth = month ?? g.tavern?.monthKey ?? g.camp?.monthKey;
  if (!selectedMonth) return [];
  monthKey(selectedMonth);
  const metric = (e: BoardEntry) =>
    board === "achiever"
      ? e.totalRounds
      : board === "explorer"
        ? e.spent
        : board === "killer"
          ? e.elapsedMs
          : e.heat;
  const entries = structuredClone(g.tavern?.entries ?? [])
    .filter(
      (e) => e.monthKey === selectedMonth && e.invalidatedAt === undefined,
    )
    .sort((a, b) => (metric(a) - metric(b)) * (board === "social" ? -1 : 1));
  let rank = 0;
  return entries.map((e, i) => {
    if (i === 0 || metric(e) !== metric(entries[i - 1])) rank = i + 1;
    return { ...e, rank };
  });
}

export function interact(
  g: GameState,
  entryId: string,
  actorId: string,
  kind: "view" | "favorite" | "import" | "adopt",
  now: number,
  enabled?: boolean,
): GameState {
  identifier(entryId);
  identifier(actorId);
  const month = timestamp(now);
  if (kind === "adopt") throw Error("药品缩略价值及排序待定，采用匹配暂不可用");
  if (!["view", "favorite", "import"].includes(kind))
    throw Error("未知互动行为");
  if (enabled !== undefined && typeof enabled !== "boolean")
    throw Error("互动开关无效");
  const initialized = ensureTavern(g);
  if (month < initialized.tavern!.monthKey)
    throw Error("不能写入过去月份的互动");
  const next = structuredClone(initialized);
  if (month > next.tavern!.monthKey)
    next.tavern = freezeTavern(next.tavern!, month);
  const state = next.tavern!;
  const entry = state.entries.find(
    (e) => e.id === entryId && e.invalidatedAt === undefined,
  );
  if (!entry) throw Error("条目不存在或代码已失效");
  const actors = Object.hasOwn(state.interactions, entryId)
    ? state.interactions[entryId]
    : {};
  const prior = Object.hasOwn(actors, actorId)
    ? actors[actorId]
    : { viewed: false, favorite: false, imported: false };
  const action = { ...prior };
  if (kind === "favorite") action.favorite = enabled ?? !prior.favorite;
  else if (enabled !== false)
    action[kind === "view" ? "viewed" : "imported"] = true;
  state.interactions = {
    ...state.interactions,
    [entryId]: { ...actors, [actorId]: action },
  };
  if (!entry.frozen && actorId !== entry.ownerId) {
    entry.views += Number(action.viewed) - Number(prior.viewed);
    entry.favorites += Number(action.favorite) - Number(prior.favorite);
    entry.imports += Number(action.imported) - Number(prior.imported);
    entry.heat =
      entry.views +
      entry.favorites * 3 +
      entry.imports * 6 +
      entry.adopted * 10;
  }
  return next;
}
