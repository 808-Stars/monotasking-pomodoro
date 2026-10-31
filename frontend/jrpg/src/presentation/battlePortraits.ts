import type { bossAppearance } from "./enemyArt.ts";

export function portraitSource(unitId: string, appearance: ReturnType<typeof bossAppearance>): string {
  return `/jrpg/assets/portraits/${unitId === "guardian" ? appearance.portraitId : unitId}.webp`;
}
