export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  tier: 0 | 1 | 2;
  job?: string;
}
export const jobNames: Record<string, string> = {
  warrior: "剑士",
  dancer: "舞娘",
  merchant: "商人",
  scholar: "学者",
  thief: "盗贼",
  cleric: "神官",
  hunter: "猎人",
  apothecary: "药师",
};
export const products: Product[] = [
  {id:'shop-pass-professional',name:'专业购买凭证',price:3000,description:'存于仓库即可进入专业商店；不消耗，本周目有效。',tier:0},
  {id:'shop-pass-mystery',name:'神秘购买凭证',price:15000,description:'存于仓库即可进入神秘商店；不消耗，本周目有效。',tier:0},
  {
    id: "hp",
    name: "回复药",
    price: 100,
    description: "单体恢复500 HP",
    tier: 0,
  },
  {
    id: "sp",
    name: "清神药",
    price: 150,
    description: "单体恢复30 SP",
    tier: 0,
  },
  {
    id: "cleanse",
    name: "净蚀药",
    price: 100,
    description: "解除单体侵蚀",
    tier: 0,
  },
  {
    id: "revive",
    name: "复苏药",
    price: 300,
    description: "复活单体至25% HP",
    tier: 0,
  },
  {
    id: "bp",
    name: "活力药",
    price: 800,
    description: "单体恢复1 BP",
    tier: 0,
  },
  ...(
    [
      ["concentrate", "浓缩精华", 200, "增强基础药效果"],
      ["diffuse", "扩散粉", 300, "调和全体药"],
      ["slow", "缓释胶", 150, "调和持续恢复药"],
      ["mix", "调和液", 150, "融合两种药效"],
      ["salt", "净化盐", 200, "扩展异常净化"],
      ["attack-herb", "猛攻草", 200, "物攻强化"],
      ["magic-flower", "灵思花", 200, "属攻强化"],
      ["defense-fruit", "铁皮果", 200, "物防强化"],
      ["resistance-bud", "宁心蕊", 200, "属防强化"],
    ] as const
  ).map(([id, name, price, description]) => ({
    id,
    name,
    price,
    description,
    tier: 1 as const,
  })),
  ...Object.entries(jobNames).map(([job, name]) => ({
    id: `certificate-${job}`,
    name: `${name}资格证`,
    price: 5000,
    description: "消耗一张解锁指定角色的该副职；每月累计限7张",
    tier: 2 as const,
    job,
  })),
  ...(
    [
      ["memory-scroll", "溯流卷", "仅撤销普通属性节点，含连带断连的普通节点；每节点1卷，返还实际支付旧忆。永久与功能节点不可撤销，脱节后保留效果"],
      ["forget-flower", "忘却花", "每撤销一项付费技能消耗1朵，含连带奥义"],
      ["formula-dew", "解方露", "一份成品单层分解，返还直接投入"],
      ["gem-sand", "返璞砂", "尘玉单层逆向；炼玉规则待定，暂未开放"],
    ] as const
  ).map(([id, name, description]) => ({
    id,
    name,
    price: 1000,
    description,
    tier: 2 as const,
  })),
];
export function itemName(id: string) {
  return products.find((p) => p.id === id)?.name ?? id;
}
export function positiveQuantity(n: number) {
  if (!Number.isSafeInteger(n) || n <= 0) throw Error("数量须为正整数");
}
