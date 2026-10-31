export const demoRules = {
  DEMO_ONLY_VARIANT_A: "固定A：枪、扇、火、雷。正式月度锚点待定。",
  DEMO_ONLY_AI:
    "重剑待发 > 无物攻强化时核账 > 两人低血或有人防御时金砂 > 铸金斩。",
  DEMO_STAMINA_GRANT: "酒馆可模拟打卡+20或补充测试体力+500；不接真实工作记录。",
  DEMO_DEFAULT_PARTY_LOCK:
    "战斗固定剑士、学者、神官、商人。其余四人仅营地登记。",
  DEMO_PHARMACY_SUBSET: "仅基础药库存与调和占位，不设药包容量。",
  DEMO_LATENT_DISPLAY: "PP真实积累与存档；专属PP指令暂未实现。",
  DETERMINISTIC_COMBAT:
    "普通直接伤害Hit默认命中；无命中率、随机回避率、暴击率。回避以可叠加次数逐Hit抵消；会心只由明确条件触发。",
} as const;
