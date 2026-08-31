export const DAILY_PLAN_TEXT_FIELDS = ['morning_reflection', 'evening_review', 'notes'] as const;
export type DailyPlanTextField = typeof DAILY_PLAN_TEXT_FIELDS[number];

type PlanTextValues = Partial<Record<DailyPlanTextField, string | null | undefined>>;

export function getChangedDailyPlanTextFields(plan: PlanTextValues | null, drafts: PlanTextValues) {
  if (!plan) return {} as Partial<Record<DailyPlanTextField, string>>;

  return DAILY_PLAN_TEXT_FIELDS.reduce<Partial<Record<DailyPlanTextField, string>>>((changes, field) => {
    const value = drafts[field];
    if (value !== undefined && value !== (plan[field] || '')) changes[field] = value ?? '';
    return changes;
  }, {});
}
