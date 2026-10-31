/** Shared by reward generation and its player-facing explanations. */
export const rewardTiers = [
  { rarity: "N", probability: 10, normal: 1, advanced: 10 },
  { rarity: "R", probability: 50, normal: 2, advanced: 20 },
  { rarity: "SR", probability: 30, normal: 5, advanced: 50 },
  { rarity: "SSR", probability: 10, normal: 8, advanced: 80 },
] as const;

/** Actual base resources redeemed per reward unit, before memory-node bonuses. */
export const rewardDenominations = { coin: 1000, exp: 100, jp: 10, gem: 1 } as const;

export function rewardRarityForRoll(roll: number) {
  let threshold = 0;
  for (const tier of rewardTiers) {
    threshold += tier.probability;
    if (roll < threshold / 100) return tier.rarity;
  }
  return "SSR";
}
