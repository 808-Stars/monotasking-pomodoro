export interface BattleLogEntry {
  kind: "action" | "system" | "legacy";
  round?: number;
  actor?: string;
  command: string;
  bp?: number;
  lines: string[];
}

interface LogState {
  log: string[];
  logEntries?: BattleLogEntry[];
}

/** Old flat records have no reliable action boundaries; preserve them verbatim. */
export function battleLogEntries(state: LogState): BattleLogEntry[] {
  return state.logEntries ?? (state.log.length
    ? [{kind:"legacy",command:"历史记录（旧版未按指令分组）",lines:[...state.log]}]
    : []);
}

/** Retain complete entries, never trim the middle of an attack sequence. */
export function appendBattleLog(state: LogState, entry: BattleLogEntry): void {
  state.logEntries=[...battleLogEntries(state),entry].slice(-60);
  // Preserve the old field for existing consumers without a second truncation.
  state.log=state.logEntries.flatMap(item=>item.lines);
}
