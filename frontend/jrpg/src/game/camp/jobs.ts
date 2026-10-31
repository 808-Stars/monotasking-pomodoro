import type { GameState } from "../economy.ts";
import { heroStats } from "../economy.ts";
import { jobNames } from "./catalog.ts";
import { jobSkills } from "./jobData.ts";
import { migrateCamp } from "./migrate.ts";
import { supportSlots, hasFeature, features } from "./memory.ts";
export { jobSkills };
function checkJob(g: GameState, hero: string, job: string) {
  if (
    !jobNames[hero] ||
    !jobNames[job] ||
    (hero !== job && !g.camp?.subjobUnlocks[hero]?.includes(job))
  )
    throw Error("尚未解锁此角色的职业资格");
}
export function learnedIds(g: GameState, hero: string, job: string) {
  checkJob(g, hero, job);
  return [
    `${job}-1`,
    `${job}-2`,
    ...Object.keys(g.camp?.skills[hero]?.[job] ?? {}),
  ];
}
export function learningCost(
  g: GameState,
  hero: string,
  job: string,
  id: string,
) {
  checkJob(g, hero, job);
  const s = jobSkills.find(
    (s) => s.id === id && s.job === job && s.kind === "active",
  );
  if (!s) throw Error("未知技能");
  const learned = learnedIds(g, hero, job);
  if (learned.includes(id)) throw Error("已学会");
  if (id === `${job}-8`) {
    if (learned.length !== 7) throw Error("奥义需要先学会其他七项");
    return 5000;
  }
  return [30, 100, 500, 1000, 3000][
    learned.filter((x) => x !== `${job}-8`).length - 2
  ];
}
export function learnSkill(
  input: GameState,
  hero: string,
  job: string,
  id: string,
) {
  const cost = learningCost(input, hero, job, id);
  if (!Number.isSafeInteger(cost) || input.jp[hero] < cost)
    throw Error("残响不足");
  const g = migrateCamp(structuredClone(input));
  g.jp[hero] -= cost;
  g.camp!.skills[hero] ??= {};
  g.camp!.skills[hero][job] ??= {};
  g.camp!.skills[hero][job][id] = cost;
  return g;
}
export function previewSkillRefund(
  g: GameState,
  hero: string,
  job: string,
  id: string,
) {
  checkJob(g, hero, job);
  const paid = g.camp?.skills[hero]?.[job] ?? {};
  if (paid[id] === undefined) throw Error("只能撤销已付费技能");
  const ids = [id];
  if (id !== `${job}-8` && paid[`${job}-8`] !== undefined) ids.push(`${job}-8`);
  return {
    ids,
    cost: ids.length,
    refund: ids.reduce((n, x) => n + paid[x], 0),
  };
}
export function availableSupports(g: GameState, hero: string) {
  return [hero, ...(g.camp?.subjobUnlocks[hero] ?? [])].flatMap((job) => {
    const count = learnedIds(g, hero, job).length;
    return jobSkills
      .filter((s) => s.job === job && s.kind === "support")
      .slice(0, Math.max(0, Math.min(4, count - 3)))
      .map((s) => s.id);
  });
}
export function refundSkill(
  input: GameState,
  hero: string,
  job: string,
  id: string,
) {
  const p = previewSkillRefund(input, hero, job, id);
  if ((input.inventory["forget-flower"] ?? 0) < p.cost)
    throw Error(`需要忘却花${p.cost}朵`);
  const g = structuredClone(input);
  g.inventory["forget-flower"] -= p.cost;
  g.jp[hero] += p.refund;
  p.ids.forEach((x) => delete g.camp!.skills[hero][job][x]);
  g.camp!.supports[hero] = (g.camp!.supports[hero] ?? []).filter((x) =>
    availableSupports(g, hero).includes(x),
  );
  return g;
}
export function unlockSubjob(input: GameState, hero: string, job: string) {
  const g = migrateCamp(structuredClone(input));
  if (!hasFeature(g, features.subjob))
    throw Error("需先购买旧忆网“可解锁副职业”节点");
  if (
    !jobNames[hero] ||
    !jobNames[job] ||
    hero === job ||
    input.camp?.subjobUnlocks[hero]?.includes(job)
  )
    throw Error("不可重复或解锁自身主职");
  if (!(input.inventory[`certificate-${job}`] > 0))
    throw Error("缺少对应职业资格证");
  g.inventory[`certificate-${job}`]--;
  g.camp!.subjobUnlocks[hero] ??= [];
  g.camp!.subjobUnlocks[hero].push(job);
  return g;
}
export function equipSubjob(
  input: GameState,
  hero: string,
  job: string | null,
) {
  if (!jobNames[hero]) throw Error("未知角色");
  if (job) {
    checkJob(input, hero, job);
    if (hero === job) throw Error("副职不能等于主职");
  }
  const g = migrateCamp(structuredClone(input));
  if (job) g.camp!.equippedSubjobs[hero] = job;
  else delete g.camp!.equippedSubjobs[hero];
  // Gems belong to inventory, not the job. Removing a weapon qualification
  // releases only its socket; no gem is destroyed or sold.
  const weapons = heroStats(hero, g).weapons;
  for (const slot of Object.keys(g.camp!.gemEquipment?.[hero] ?? {})) {
    if (
      ["剑", "枪", "弓", "扇", "斧", "杖"].includes(slot) &&
      !weapons.includes(slot)
    )
      delete g.camp!.gemEquipment![hero][slot];
  }
  return g;
}
export function setParty(input: GameState, ids: string[]) {
  if (
    ids.length !== 4 ||
    new Set(ids).size !== 4 ||
    ids.some((id) => !jobNames[id])
  )
    throw Error("请选择四名不同角色");
  const g = migrateCamp(structuredClone(input));
  g.camp!.party = [...ids];
  return g;
}
export function equipSupports(input: GameState, hero: string, ids: string[]) {
  if (
    ids.length > supportSlots(input) ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !availableSupports(input, hero).includes(id))
  )
    throw Error("辅助栏不足、重复或尚未解锁");
  const g = migrateCamp(structuredClone(input));
  g.camp!.supports[hero] = [...ids];
  return g;
}
