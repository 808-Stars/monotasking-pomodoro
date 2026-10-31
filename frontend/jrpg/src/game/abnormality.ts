/** Shared, deterministic abnormality buildup. No random rolls or HP arithmetic. */
export const abnormalityTypes = ["爆破", "凝滞", "沉默", "悬浮", "侵蚀", "混乱"] as const;
export type StatusId = (typeof abnormalityTypes)[number];
export interface AbnormalityState {
  /** Non-explosion: remaining owner actions. Explosion: remaining delay actions. */
  turns: number;
  potency?: number;
  damageStacks?: number;
}
export interface APUnit {
  hp: number;
  ap: number;
  tenacity: number;
  apLastType?: StatusId;
  statuses: Partial<Record<StatusId, AbnormalityState>>;
  apImmunities?: Partial<Record<StatusId, number>>;
  apProtectionCharges?: number;
  apInputMultipliers?: Partial<Record<StatusId, number>>;
  temporaryTenacity?: { bonus: number; actions: number };
}
export function apThreshold(u: APUnit): number {
  const t = u.tenacity + (u.temporaryTenacity?.bonus ?? 0);
  if (!Number.isSafeInteger(t) || t <= 0) throw new Error("韧性阈值必须是正整数");
  return t;
}
export function applyAP(u: APUnit, type: StatusId, amount: number, options: { damagePerLayer?: number } = {}) {
  if (!abnormalityTypes.includes(type)) throw new Error("未知异常类型");
  if (!Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER)
    throw new Error("AP输入必须是有限非负数");
  const threshold = apThreshold(u);
  const multiplier = u.apInputMultipliers?.[type] ?? 1;
  const potency = options.damagePerLayer ?? 0;
  if (!Number.isFinite(multiplier) || multiplier < 0 || !Number.isFinite(potency) || potency < 0)
    throw new Error("AP倍率和异常伤害必须为有限非负数");
  const input = Math.floor(amount * multiplier);
  if (!Number.isSafeInteger(input) || !Number.isSafeInteger(u.ap) || u.ap < 0 || !Number.isSafeInteger(u.ap + input))
    throw new Error("AP数值超出可精确计算范围");
  const result = { input: 0, layers: 0, blocked: false };
  if (!amount || !input || u.hp <= 0) return result;
  if ((u.apImmunities?.[type] ?? 0) > 0) return { ...result, blocked: true };
  if ((u.apProtectionCharges ?? 0) > 0) {
    u.apProtectionCharges!--;
    return { ...result, blocked: true };
  }
  const total = u.ap + input, layers = Math.floor(total / threshold);
  u.ap = total % threshold;
  u.apLastType = type;
  if (layers) {
    const status = u.statuses[type] ?? (u.statuses[type] = { turns: 0 });
    status.turns += layers;
    if (type === "爆破") {
      status.damageStacks = (status.damageStacks ?? 0) + layers;
      status.potency = (status.potency ?? 0) + Math.floor(potency) * layers;
    } else if (type === "侵蚀" && options.damagePerLayer !== undefined) {
      // Layers extend duration; they never multiply the per-action damage.
      status.potency = Math.floor(potency);
    }
  }
  return { input, layers, blocked: false };
}
export function cleanseAbnormalities(u: APUnit, type?: StatusId) {
  if (type) delete u.statuses[type];
  else u.statuses = {};
  // Intentionally retain AP and its provenance, including for ordinary cleanses.
}
export function captureAbnormalityAction(u: APUnit) {
  return {
    statuses: { ...u.statuses },
    immunities: { ...u.apImmunities },
    temporaryTenacity: u.temporaryTenacity,
  };
}
export function finishAbnormalityAction(u: APUnit, start: ReturnType<typeof captureAbnormalityAction>) {
  const delayed = { explosion: 0, erosion: 0 };
  if (u.hp <= 0) return delayed;
  for (const type of abnormalityTypes) {
    const state = u.statuses[type];
    // Reference identity protects a replacement created after cleansing this action.
    if (!state || state !== start.statuses[type] || state.turns <= 0) continue;
    if (type === "侵蚀") delayed.erosion = state.potency ?? 0;
    state.turns--;
    if (state.turns <= 0) {
      if (type === "爆破") delayed.explosion = state.potency ?? 0;
      delete u.statuses[type];
    }
  }
  for (const [type, duration] of Object.entries(start.immunities)) {
    const key = type as StatusId;
    if (u.apImmunities?.[key] === duration && duration && duration > 0) {
      if (--u.apImmunities[key]! <= 0) delete u.apImmunities[key];
    }
  }
  if (u.temporaryTenacity && u.temporaryTenacity === start.temporaryTenacity && --u.temporaryTenacity.actions <= 0)
    delete u.temporaryTenacity;
  return delayed;
}
