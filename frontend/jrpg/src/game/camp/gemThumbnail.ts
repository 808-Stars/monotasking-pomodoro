import type { GameState } from "../economy.ts";
import {
  equippedGemSelection,
  parseGem,
  type GemFamily,
  type GemTier,
} from "./gems.ts";

const families = {
  火灼玉: { base: 1, familyClass: 0, order: 0 },
  水澜玉: { base: 1, familyClass: 0, order: 1 },
  木华玉: { base: 1, familyClass: 0, order: 2 },
  风凌玉: { base: 2, familyClass: 1, order: 0 },
  土砂玉: { base: 2, familyClass: 1, order: 1 },
  雷鸣玉: { base: 2, familyClass: 1, order: 2 },
  冷玉: { base: 3, familyClass: 2, order: 0 },
  暖玉: { base: 6, familyClass: 3, order: 0 },
  彩玉: { base: 9, familyClass: 4, order: 0 },
} as const;

export interface GemThumbnail {
  id: string;
  family: GemFamily;
  tier: GemTier;
  value: number;
}

/** Sort supplied quantities; use topEquippedGems for the actual game config. */
export function topGems(
  selection: Record<string, number>,
  count = 8,
): GemThumbnail[] {
  if (!Number.isSafeInteger(count) || count < 0)
    throw Error("展示数量必须是非负整数");
  const entries = Object.entries(selection).map(([id, n]) => {
    if (!Number.isSafeInteger(n) || n < 0)
      throw Error("尘玉数量必须是非负整数");
    const { key, family, tier } = parseGem(id);
    const gem: GemThumbnail = {
      id: key,
      family,
      tier,
      value: families[family].base * 3 ** (tier - 1),
    };
    return { gem, n };
  });
  entries.sort(
    ({ gem: a }, { gem: b }) =>
      b.value - a.value ||
      b.tier - a.tier ||
      families[b.family].familyClass - families[a.family].familyClass ||
      families[a.family].order - families[b.family].order,
  );
  const result: GemThumbnail[] = [];
  for (const { gem, n } of entries) {
    const take = Math.min(n, count - result.length);
    for (let i = 0; i < take; i++) result.push({ ...gem });
    if (result.length === count) break;
  }
  return result;
}

export function topEquippedGems(g: GameState, count = 8): GemThumbnail[] {
  return topGems(equippedGemSelection(g), count);
}
