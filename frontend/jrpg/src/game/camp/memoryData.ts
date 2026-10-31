// Canonical approved layout: 旧忆网布局_当前采用版.json (layout 5).
export const memoryLayoutVersion = "layout5-20261010";
export interface MemoryNode {
  id: string;
  kind: "属性" | "功能" | "起点";
  label: string;
  cost: number;
  requires: string[];
  links: string[];
  stat?: string;
  growth?: number;
}
export const memoryNodes: MemoryNode[] = [
  {
    "id": "R1C1",
    "kind": "功能",
    "label": "尘玉200%",
    "cost": 10000,
    "requires": [
      "R1C7"
    ],
    "links": [
      "R1C2"
    ]
  },
  {
    "id": "R1C2",
    "kind": "属性",
    "label": "速度＋20%",
    "cost": 2000,
    "requires": [],
    "links": [
      "R2C2",
      "R1C1"
    ],
    "stat": "速度",
    "growth": 20
  },
  {
    "id": "R1C3",
    "kind": "功能",
    "label": "EX2",
    "cost": 5400,
    "requires": [
      "R1C5"
    ],
    "links": [
      "R2C3"
    ]
  },
  {
    "id": "R1C4",
    "kind": "属性",
    "label": "HP＋20%",
    "cost": 2000,
    "requires": [],
    "links": [
      "R1C5",
      "R2C4"
    ],
    "stat": "HP",
    "growth": 20
  },
  {
    "id": "R1C5",
    "kind": "功能",
    "label": "EX1",
    "cost": 4000,
    "requires": [],
    "links": [
      "R2C5",
      "R1C6",
      "R1C4"
    ]
  },
  {
    "id": "R1C6",
    "kind": "属性",
    "label": "物防＋20%",
    "cost": 2400,
    "requires": [],
    "links": [
      "R2C6",
      "R1C5",
      "R1C7"
    ],
    "stat": "物防",
    "growth": 20
  },
  {
    "id": "R1C7",
    "kind": "功能",
    "label": "资源节点可解锁",
    "cost": 6400,
    "requires": [],
    "links": [
      "R1C6",
      "R1C8"
    ]
  },
  {
    "id": "R1C8",
    "kind": "属性",
    "label": "属防＋20%",
    "cost": 2400,
    "requires": [],
    "links": [
      "R1C7",
      "R2C8"
    ],
    "stat": "属防",
    "growth": 20
  },
  {
    "id": "R1C9",
    "kind": "功能",
    "label": "旧忆200%",
    "cost": 10000,
    "requires": [
      "R1C7"
    ],
    "links": [
      "R2C9"
    ]
  },
  {
    "id": "R2C1",
    "kind": "属性",
    "label": "物防＋20%",
    "cost": 2400,
    "requires": [],
    "links": [
      "R3C1",
      "R2C2"
    ],
    "stat": "物防",
    "growth": 20
  },
  {
    "id": "R2C2",
    "kind": "属性",
    "label": "物攻＋15%",
    "cost": 1800,
    "requires": [],
    "links": [
      "R2C1",
      "R1C2"
    ],
    "stat": "物攻",
    "growth": 15
  },
  {
    "id": "R2C3",
    "kind": "属性",
    "label": "SP＋10%",
    "cost": 1200,
    "requires": [],
    "links": [
      "R2C4",
      "R1C3"
    ],
    "stat": "SP",
    "growth": 10
  },
  {
    "id": "R2C4",
    "kind": "属性",
    "label": "物防＋15%",
    "cost": 1600,
    "requires": [],
    "links": [
      "R1C4",
      "R2C3"
    ],
    "stat": "物防",
    "growth": 15
  },
  {
    "id": "R2C5",
    "kind": "属性",
    "label": "SP＋15%",
    "cost": 1400,
    "requires": [],
    "links": [
      "R3C5",
      "R1C5"
    ],
    "stat": "SP",
    "growth": 15
  },
  {
    "id": "R2C6",
    "kind": "属性",
    "label": "HP＋15%",
    "cost": 1800,
    "requires": [],
    "links": [
      "R2C7",
      "R1C6"
    ],
    "stat": "HP",
    "growth": 15
  },
  {
    "id": "R2C7",
    "kind": "属性",
    "label": "SP＋10%",
    "cost": 1400,
    "requires": [],
    "links": [
      "R3C7",
      "R2C6"
    ],
    "stat": "SP",
    "growth": 10
  },
  {
    "id": "R2C8",
    "kind": "属性",
    "label": "物防＋15%",
    "cost": 1800,
    "requires": [],
    "links": [
      "R1C8",
      "R2C9"
    ],
    "stat": "物防",
    "growth": 15
  },
  {
    "id": "R2C9",
    "kind": "属性",
    "label": "HP＋20%",
    "cost": 2000,
    "requires": [],
    "links": [
      "R2C8",
      "R1C9"
    ],
    "stat": "HP",
    "growth": 20
  },
  {
    "id": "R3C1",
    "kind": "功能",
    "label": "双饰品尘玉槽",
    "cost": 6400,
    "requires": [],
    "links": [
      "R4C1",
      "R2C1"
    ]
  },
  {
    "id": "R3C2",
    "kind": "属性",
    "label": "韧性＋10%",
    "cost": 1400,
    "requires": [],
    "links": [
      "R4C2",
      "R3C3"
    ],
    "stat": "韧性",
    "growth": 10
  },
  {
    "id": "R3C3",
    "kind": "属性",
    "label": "物攻＋10%",
    "cost": 1200,
    "requires": [],
    "links": [
      "R3C4",
      "R3C2",
      "R4C3"
    ],
    "stat": "物攻",
    "growth": 10
  },
  {
    "id": "R3C4",
    "kind": "属性",
    "label": "HP＋5%",
    "cost": 800,
    "requires": [],
    "links": [
      "R3C3",
      "R3C5",
      "R4C4"
    ],
    "stat": "HP",
    "growth": 5
  },
  {
    "id": "R3C5",
    "kind": "属性",
    "label": "属防＋10%",
    "cost": 1000,
    "requires": [],
    "links": [
      "R2C5",
      "R3C4"
    ],
    "stat": "属防",
    "growth": 10
  },
  {
    "id": "R3C6",
    "kind": "属性",
    "label": "HP＋5%",
    "cost": 800,
    "requires": [],
    "links": [
      "R4C6",
      "R3C7"
    ],
    "stat": "HP",
    "growth": 5
  },
  {
    "id": "R3C7",
    "kind": "属性",
    "label": "物防＋10%",
    "cost": 1200,
    "requires": [],
    "links": [
      "R4C7",
      "R2C7",
      "R3C6"
    ],
    "stat": "物防",
    "growth": 10
  },
  {
    "id": "R3C8",
    "kind": "属性",
    "label": "速度＋10%",
    "cost": 1200,
    "requires": [],
    "links": [
      "R4C8",
      "R3C9"
    ],
    "stat": "速度",
    "growth": 10
  },
  {
    "id": "R3C9",
    "kind": "功能",
    "label": "神秘商店",
    "cost": 5400,
    "requires": [
      "R7C9"
    ],
    "links": [
      "R3C8"
    ]
  },
  {
    "id": "R4C1",
    "kind": "属性",
    "label": "物攻＋20%",
    "cost": 2400,
    "requires": [],
    "links": [
      "R5C1",
      "R4C2",
      "R3C1"
    ],
    "stat": "物攻",
    "growth": 20
  },
  {
    "id": "R4C2",
    "kind": "属性",
    "label": "速度＋15%",
    "cost": 1800,
    "requires": [],
    "links": [
      "R4C1",
      "R3C2"
    ],
    "stat": "速度",
    "growth": 15
  },
  {
    "id": "R4C3",
    "kind": "属性",
    "label": "速度＋5%",
    "cost": 800,
    "requires": [],
    "links": [
      "R4C4",
      "R3C3"
    ],
    "stat": "速度",
    "growth": 5
  },
  {
    "id": "R4C4",
    "kind": "属性",
    "label": "物防＋5%",
    "cost": 600,
    "requires": [],
    "links": [
      "R4C3",
      "R3C4",
      "R5C4"
    ],
    "stat": "物防",
    "growth": 5
  },
  {
    "id": "R4C5",
    "kind": "属性",
    "label": "属防＋5%",
    "cost": 400,
    "requires": [],
    "links": [
      "R5C5",
      "R4C6"
    ],
    "stat": "属防",
    "growth": 5
  },
  {
    "id": "R4C6",
    "kind": "属性",
    "label": "属防＋5%",
    "cost": 600,
    "requires": [],
    "links": [
      "R4C5",
      "R3C6",
      "R4C7"
    ],
    "stat": "属防",
    "growth": 5
  },
  {
    "id": "R4C7",
    "kind": "属性",
    "label": "韧性＋5%",
    "cost": 800,
    "requires": [],
    "links": [
      "R4C6",
      "R5C7",
      "R3C7"
    ],
    "stat": "韧性",
    "growth": 5
  },
  {
    "id": "R4C8",
    "kind": "属性",
    "label": "属防＋15%",
    "cost": 1600,
    "requires": [],
    "links": [
      "R4C9",
      "R3C8"
    ],
    "stat": "属防",
    "growth": 15
  },
  {
    "id": "R4C9",
    "kind": "属性",
    "label": "韧性＋20%",
    "cost": 2000,
    "requires": [],
    "links": [
      "R5C9",
      "R4C8"
    ],
    "stat": "韧性",
    "growth": 20
  },
  {
    "id": "R5C1",
    "kind": "功能",
    "label": "盾牌尘玉槽",
    "cost": 4000,
    "requires": [],
    "links": [
      "R5C2",
      "R6C1",
      "R4C1"
    ]
  },
  {
    "id": "R5C2",
    "kind": "属性",
    "label": "韧性＋15%",
    "cost": 1400,
    "requires": [],
    "links": [
      "R5C3",
      "R5C1"
    ],
    "stat": "韧性",
    "growth": 15
  },
  {
    "id": "R5C3",
    "kind": "属性",
    "label": "物防＋10%",
    "cost": 1000,
    "requires": [],
    "links": [
      "R6C3",
      "R5C2"
    ],
    "stat": "物防",
    "growth": 10
  },
  {
    "id": "R5C4",
    "kind": "属性",
    "label": "物防＋5%",
    "cost": 400,
    "requires": [],
    "links": [
      "R5C5",
      "R4C4"
    ],
    "stat": "物防",
    "growth": 5
  },
  {
    "id": "R5C5",
    "kind": "起点",
    "label": "共同起点",
    "cost": 0,
    "requires": [],
    "links": [
      "R5C4",
      "R4C5",
      "R5C6",
      "R6C5"
    ]
  },
  {
    "id": "R5C6",
    "kind": "属性",
    "label": "属攻＋5%",
    "cost": 400,
    "requires": [],
    "links": [
      "R5C5",
      "R6C6"
    ],
    "stat": "属攻",
    "growth": 5
  },
  {
    "id": "R5C7",
    "kind": "属性",
    "label": "属攻＋10%",
    "cost": 1000,
    "requires": [],
    "links": [
      "R4C7",
      "R5C8"
    ],
    "stat": "属攻",
    "growth": 10
  },
  {
    "id": "R5C8",
    "kind": "属性",
    "label": "速度＋15%",
    "cost": 1400,
    "requires": [],
    "links": [
      "R5C7",
      "R5C9"
    ],
    "stat": "速度",
    "growth": 15
  },
  {
    "id": "R5C9",
    "kind": "功能",
    "label": "进阶商店",
    "cost": 4000,
    "requires": [],
    "links": [
      "R5C8",
      "R4C9",
      "R6C9"
    ]
  },
  {
    "id": "R6C1",
    "kind": "属性",
    "label": "速度＋20%",
    "cost": 2000,
    "requires": [],
    "links": [
      "R5C1",
      "R6C2"
    ],
    "stat": "速度",
    "growth": 20
  },
  {
    "id": "R6C2",
    "kind": "属性",
    "label": "物攻＋15%",
    "cost": 1600,
    "requires": [],
    "links": [
      "R6C1",
      "R7C2"
    ],
    "stat": "物攻",
    "growth": 15
  },
  {
    "id": "R6C3",
    "kind": "属性",
    "label": "速度＋5%",
    "cost": 800,
    "requires": [],
    "links": [
      "R6C4",
      "R5C3",
      "R7C3"
    ],
    "stat": "速度",
    "growth": 5
  },
  {
    "id": "R6C4",
    "kind": "属性",
    "label": "物攻＋5%",
    "cost": 600,
    "requires": [],
    "links": [
      "R6C5",
      "R7C4",
      "R6C3"
    ],
    "stat": "物攻",
    "growth": 5
  },
  {
    "id": "R6C5",
    "kind": "属性",
    "label": "物攻＋5%",
    "cost": 400,
    "requires": [],
    "links": [
      "R5C5",
      "R6C4"
    ],
    "stat": "物攻",
    "growth": 5
  },
  {
    "id": "R6C6",
    "kind": "属性",
    "label": "属攻＋5%",
    "cost": 600,
    "requires": [],
    "links": [
      "R6C7",
      "R5C6",
      "R7C6"
    ],
    "stat": "属攻",
    "growth": 5
  },
  {
    "id": "R6C7",
    "kind": "属性",
    "label": "韧性＋5%",
    "cost": 800,
    "requires": [],
    "links": [
      "R6C6",
      "R7C7"
    ],
    "stat": "韧性",
    "growth": 5
  },
  {
    "id": "R6C8",
    "kind": "属性",
    "label": "韧性＋15%",
    "cost": 1800,
    "requires": [],
    "links": [
      "R6C9",
      "R7C8"
    ],
    "stat": "韧性",
    "growth": 15
  },
  {
    "id": "R6C9",
    "kind": "属性",
    "label": "属防＋20%",
    "cost": 2400,
    "requires": [],
    "links": [
      "R5C9",
      "R7C9",
      "R6C8"
    ],
    "stat": "属防",
    "growth": 20
  },
  {
    "id": "R7C1",
    "kind": "功能",
    "label": "六武器尘玉槽",
    "cost": 5400,
    "requires": [],
    "links": [
      "R7C2"
    ]
  },
  {
    "id": "R7C2",
    "kind": "属性",
    "label": "韧性＋10%",
    "cost": 1200,
    "requires": [],
    "links": [
      "R6C2",
      "R7C1"
    ],
    "stat": "韧性",
    "growth": 10
  },
  {
    "id": "R7C3",
    "kind": "属性",
    "label": "属攻＋10%",
    "cost": 1200,
    "requires": [],
    "links": [
      "R6C3",
      "R8C3",
      "R7C4"
    ],
    "stat": "属攻",
    "growth": 10
  },
  {
    "id": "R7C4",
    "kind": "属性",
    "label": "SP＋5%",
    "cost": 800,
    "requires": [],
    "links": [
      "R6C4",
      "R7C3"
    ],
    "stat": "SP",
    "growth": 5
  },
  {
    "id": "R7C5",
    "kind": "属性",
    "label": "物攻＋10%",
    "cost": 1000,
    "requires": [],
    "links": [
      "R7C6",
      "R8C5"
    ],
    "stat": "物攻",
    "growth": 10
  },
  {
    "id": "R7C6",
    "kind": "属性",
    "label": "SP＋5%",
    "cost": 800,
    "requires": [],
    "links": [
      "R6C6",
      "R7C5",
      "R7C7"
    ],
    "stat": "SP",
    "growth": 5
  },
  {
    "id": "R7C7",
    "kind": "属性",
    "label": "属防＋10%",
    "cost": 1200,
    "requires": [],
    "links": [
      "R7C6",
      "R7C8",
      "R6C7"
    ],
    "stat": "属防",
    "growth": 10
  },
  {
    "id": "R7C8",
    "kind": "属性",
    "label": "速度＋10%",
    "cost": 1400,
    "requires": [],
    "links": [
      "R6C8",
      "R7C7"
    ],
    "stat": "速度",
    "growth": 10
  },
  {
    "id": "R7C9",
    "kind": "功能",
    "label": "专业商店",
    "cost": 6400,
    "requires": [],
    "links": [
      "R8C9",
      "R6C9"
    ]
  },
  {
    "id": "R8C1",
    "kind": "属性",
    "label": "SP＋20%",
    "cost": 2000,
    "requires": [],
    "links": [
      "R8C2",
      "R9C1"
    ],
    "stat": "SP",
    "growth": 20
  },
  {
    "id": "R8C2",
    "kind": "属性",
    "label": "属攻＋15%",
    "cost": 1800,
    "requires": [],
    "links": [
      "R9C2",
      "R8C1"
    ],
    "stat": "属攻",
    "growth": 15
  },
  {
    "id": "R8C3",
    "kind": "属性",
    "label": "HP＋10%",
    "cost": 1400,
    "requires": [],
    "links": [
      "R8C4",
      "R7C3"
    ],
    "stat": "HP",
    "growth": 10
  },
  {
    "id": "R8C4",
    "kind": "属性",
    "label": "SP＋15%",
    "cost": 1800,
    "requires": [],
    "links": [
      "R9C4",
      "R8C3"
    ],
    "stat": "SP",
    "growth": 15
  },
  {
    "id": "R8C5",
    "kind": "属性",
    "label": "HP＋15%",
    "cost": 1400,
    "requires": [],
    "links": [
      "R7C5",
      "R9C5"
    ],
    "stat": "HP",
    "growth": 15
  },
  {
    "id": "R8C6",
    "kind": "属性",
    "label": "属攻＋15%",
    "cost": 1600,
    "requires": [],
    "links": [
      "R8C7",
      "R9C6"
    ],
    "stat": "属攻",
    "growth": 15
  },
  {
    "id": "R8C7",
    "kind": "属性",
    "label": "HP＋10%",
    "cost": 1200,
    "requires": [],
    "links": [
      "R9C7",
      "R8C6"
    ],
    "stat": "HP",
    "growth": 10
  },
  {
    "id": "R8C8",
    "kind": "属性",
    "label": "属防＋15%",
    "cost": 1800,
    "requires": [],
    "links": [
      "R8C9",
      "R9C8"
    ],
    "stat": "属防",
    "growth": 15
  },
  {
    "id": "R8C9",
    "kind": "属性",
    "label": "属攻＋20%",
    "cost": 2400,
    "requires": [],
    "links": [
      "R7C9",
      "R8C8"
    ],
    "stat": "属攻",
    "growth": 20
  },
  {
    "id": "R9C1",
    "kind": "功能",
    "label": "残响200%",
    "cost": 10000,
    "requires": [
      "R1C7"
    ],
    "links": [
      "R8C1"
    ]
  },
  {
    "id": "R9C2",
    "kind": "属性",
    "label": "物攻＋20%",
    "cost": 2400,
    "requires": [],
    "links": [
      "R9C3",
      "R8C2"
    ],
    "stat": "物攻",
    "growth": 20
  },
  {
    "id": "R9C3",
    "kind": "功能",
    "label": "可解锁副职业",
    "cost": 6400,
    "requires": [],
    "links": [
      "R9C4",
      "R9C2"
    ]
  },
  {
    "id": "R9C4",
    "kind": "属性",
    "label": "属攻＋20%",
    "cost": 2400,
    "requires": [],
    "links": [
      "R9C5",
      "R8C4",
      "R9C3"
    ],
    "stat": "属攻",
    "growth": 20
  },
  {
    "id": "R9C5",
    "kind": "功能",
    "label": "辅助技能栏*1",
    "cost": 4000,
    "requires": [],
    "links": [
      "R8C5",
      "R9C6",
      "R9C4"
    ]
  },
  {
    "id": "R9C6",
    "kind": "属性",
    "label": "SP＋20%",
    "cost": 2000,
    "requires": [],
    "links": [
      "R8C6",
      "R9C5"
    ],
    "stat": "SP",
    "growth": 20
  },
  {
    "id": "R9C7",
    "kind": "功能",
    "label": "辅助技能栏*2",
    "cost": 5400,
    "requires": [
      "R9C5"
    ],
    "links": [
      "R8C7"
    ]
  },
  {
    "id": "R9C8",
    "kind": "属性",
    "label": "韧性＋20%",
    "cost": 2000,
    "requires": [],
    "links": [
      "R8C8",
      "R9C9"
    ],
    "stat": "韧性",
    "growth": 20
  },
  {
    "id": "R9C9",
    "kind": "功能",
    "label": "古币200%",
    "cost": 10000,
    "requires": [
      "R1C7"
    ],
    "links": [
      "R9C8"
    ]
  }
];
