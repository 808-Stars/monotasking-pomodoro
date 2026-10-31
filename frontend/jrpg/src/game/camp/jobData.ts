import { confirmedById } from "../confirmedSkills.ts";
// The user-supplied confirmed workbook overrides only its populated slots.
const sourceSkills = [
  {
    id: "merchant-1",
    job: "merchant",
    kind: "active",
    name: "幸运枪刺",
    sp: "8",
    description:
      "单体枪P(1.5/2.25/3/4.5)；本Hit命中弱点或目标已Break则自身速度提升2轮，不产金币",
  },
  {
    id: "merchant-2",
    job: "merchant",
    kind: "active",
    name: "稍作休息",
    sp: "0",
    description:
      "自身恢复最大HP的10/20/30/40%、最大SP的10/20/30/40%，并解除爆破、凝滞、沉默、悬浮、侵蚀、混乱六种元素异常",
  },
  {
    id: "merchant-3",
    job: "merchant",
    kind: "active",
    name: "雷光",
    sp: "7",
    description: "单体雷属性M(1.5/2.25/3/4.5)",
  },
  {
    id: "merchant-4",
    job: "merchant",
    kind: "active",
    name: "传递BP",
    sp: "6",
    description:
      "一名其他存活队友恢复1/2/3/4 BP；消耗的增幅B为施术者支付，不另外扣“传出数量”",
  },
  {
    id: "merchant-5",
    job: "merchant",
    kind: "active",
    name: "风险投资",
    sp: "0",
    description:
      "扣min(floor(最大HP×50%),当前HP-1)，下次自身普通或额外行动开始、且期间未倒地，返还实际HP，再回最大HP10%、最大SP10%、PP20",
  },
  {
    id: "merchant-6",
    job: "merchant",
    kind: "active",
    name: "紧急回避",
    sp: "10",
    description:
      "自身获得1／2／3／4次回避；每次只抵消1个物理直接伤害Hit，多段攻击可逐Hit消耗，次数保留至实际使用。",
  },
  {
    id: "merchant-7",
    job: "merchant",
    kind: "active",
    name: "倾力出手",
    sp: "当前SP50%向下取整",
    description:
      "单体枪攻击；P(1.20)×(1+C/100)×[1,1.25,1.5,2]，C为实际扣SP；SP0/1仍可用",
  },
  {
    id: "merchant-8",
    job: "merchant",
    kind: "active",
    name: "绅商伯比菲尔根的心眼",
    sp: "30且B3",
    description:
      "单体无属性魔法M(8)；攻击结束后当前队伍所有存活角色包括自身各+1 BP；即使命中后敌人死亡仍执行回BP，战斗结果在尾效后判定",
  },
  {
    id: "merchant-support-1",
    job: "merchant",
    kind: "support",
    name: "周转有方",
    description:
      "一次直接行动中每向一名其他队友实际恢复BP，自身回10 SP；每名不同队友算一次，未实际获得不算，不按BP点数重复",
  },
  {
    id: "merchant-support-2",
    job: "merchant",
    kind: "support",
    name: "BP加成",
    description: "每场入场BP+1，随后第1轮自然恢复照常",
  },
  {
    id: "merchant-support-3",
    job: "merchant",
    kind: "support",
    name: "坚持到底",
    description:
      "受击前HP至少最大25%时，普通致死伤害保留1HP；即死不适用，多段继续判定",
  },
  {
    id: "merchant-support-4",
    job: "merchant",
    kind: "support",
    name: "PP爆发MAX",
    description: "每个独立战斗开场PP100；最终双战各自开场判定",
  },
  {
    id: "merchant-ex1",
    job: "merchant",
    kind: "ex",
    name: "EX1 分配SP",
    sp: "0",
    description:
      "在支付BP后快照当前SP=S；本次向我方全体存活角色各恢复floor(S×25/50/75/100%)SP，包含自己；本项目明确不额外扣S或分摊总池。仍占完整行动，正常上限裁剪",
  },
  {
    id: "merchant-ex2",
    job: "merchant",
    kind: "ex",
    name: "EX2 交涉行程",
    sp: "20",
    description:
      "下一轮预约一个特殊行动：B0在自身普通槽前，B1在自身前1个普通槽前，B2前2个，B3队首；不足按队首。普通行动保留",
  },
  {
    id: "warrior-1",
    job: "warrior",
    kind: "active",
    name: "五月雨斩",
    sp: "9",
    description:
      "随机敌人剑攻击，逐段重新选择存活目标；每段P(0.65)。；3／4／5／6段；不另乘伤害增幅。；保留",
  },
  {
    id: "warrior-2",
    job: "warrior",
    kind: "active",
    name: "会心之枪",
    sp: "12",
    description:
      "单体枪攻击；投入至少1 BP时，本Hit确定触发会心。；K=1.5／2.25／3／4.5。；保留技能名与定位；移除暴击概率",
  },
  {
    id: "warrior-3",
    job: "warrior",
    kind: "active",
    name: "蓄力",
    sp: "4",
    description: "自身物攻提升。；3／5／7／9轮。；保留",
  },
  {
    id: "warrior-4",
    job: "warrior",
    kind: "active",
    name: "无心长刀",
    sp: "7",
    description:
      "先移除自身可清除的有利状态，再对指定敌人剑攻击。移除不同状态定义数量为N，伤害P(K)×(1+0.5N)。；K=1.5／2／2.5／3。；保留自身消益；数值基线",
  },
  {
    id: "warrior-5",
    job: "warrior",
    kind: "active",
    name: "铁壁",
    sp: "4",
    description: "自身物防提升。；3／5／7／9轮。；保留",
  },
  {
    id: "warrior-6",
    job: "warrior",
    kind: "active",
    name: "挑衅",
    sp: "4",
    description:
      "可受引导的敌方单体攻击优先指向自身；全体攻击不压成单体。；3／5／7／9轮。；保留",
  },
  {
    id: "warrior-7",
    job: "warrior",
    kind: "active",
    name: "反击长刀",
    sp: "6",
    description:
      "获得剑反击次数；实际承受一个物理伤害段且仍存活，消耗1次反击，P(1)，命中后无视弱点削1盾。；2／3／4／5次。；保留；按段触发是项目基线",
  },
  {
    id: "warrior-8",
    job: "warrior",
    kind: "active",
    name: "雷剑将布兰德的刚剑",
    sp: "30",
    description:
      "对单个敌人造成剑伤害P(10)。；必须3 BP。；保留奥义职责；威力基线",
  },
  {
    id: "warrior-support-1",
    job: "warrior",
    kind: "support",
    name: "令敌人破防提升物攻",
    description:
      "装备者实际造成一次Break后，自身物攻提升2轮；多目标分别成功破防可以延长持续时间，仍不叠强度。",
  },
  {
    id: "warrior-support-2",
    job: "warrior",
    kind: "support",
    name: "物攻+50",
    description: "固定物攻+50，进入常驻固定加成F，不被等级小节点再次放大。",
  },
  {
    id: "warrior-support-3",
    job: "warrior",
    kind: "support",
    name: "提升PP上升量",
    description:
      "正常受伤／破防事件获得的PP增加50%；不放大直接补满或明确固定赋予的PP。",
  },
  {
    id: "warrior-support-4",
    job: "warrior",
    kind: "support",
    name: "突破伤害界限",
    description:
      "沿用已确认规则：本角色单段伤害界限99,999；重复来源不把界限继续乘10。",
  },
  {
    id: "warrior-ex1",
    job: "warrior",
    kind: "ex",
    name: "EX1 天下无双姿势",
    sp: "10",
    description:
      "自身直接普通攻击变为敌方全体，持续3／5／7／9轮；普通攻击BP段数及合法宝石追加段照常，职业技能不因此全体化。",
  },
  {
    id: "warrior-ex2",
    job: "warrior",
    kind: "ex",
    name: "EX2 真·十字斩",
    sp: "32",
    description:
      "全体剑1段后，对预先选定的存活目标追加剑1段；前段K=1.5／2／2.5／3，后段K=3／4／5／6。",
  },
  {
    id: "dancer-1",
    job: "dancer",
    kind: "active",
    name: "狮子之舞",
    sp: "4",
    description: "我方单体物攻提升，可指定自己。；3／5／7／9轮。；保留",
  },
  {
    id: "dancer-2",
    job: "dancer",
    kind: "active",
    name: "猛踢要害",
    sp: "10",
    description:
      "敌方单体非武器物理伤害；命中无视弱点削1盾。；K=1.5／2.25／3／4.5；不增削盾数。；保留",
  },
  {
    id: "dancer-3",
    job: "dancer",
    kind: "active",
    name: "孔雀之舞",
    sp: "4",
    description: "我方单体属攻提升，可指定自己。；3／5／7／9轮。；保留",
  },
  {
    id: "dancer-4",
    job: "dancer",
    kind: "active",
    name: "焰舞",
    sp: "7",
    description: "敌方单体火属性伤害。；K=1.5／2.25／3／4.5。；保留",
  },
  {
    id: "dancer-5",
    job: "dancer",
    kind: "active",
    name: "推波助澜",
    sp: "5",
    description:
      "调整一名队友下一轮普通行动的位置，保留已有行动，不生成额外行动。；前移1／2／3个位置／移至最前优先组。；保留方向；队列边界为适配",
  },
  {
    id: "dancer-6",
    job: "dancer",
    kind: "active",
    name: "炽舞回旋",
    sp: "9",
    description: "敌方全体扇1段，K=1.2／1.8／2.4／3.6；BP0／1／2／3每个成功命中Hit输入0／0／25／50爆破AP，被回避不输入AP。伤害部分仍为Demo既有切片，未迁入完整V8技能。",
  },
  {
    id: "dancer-7",
    job: "dancer",
    kind: "active",
    name: "百思不解之舞",
    sp: "25",
    description:
      "从下方8项池等概率独立抽取并按抽取顺序执行，允许重复结果。；抽取1／2／3／4次。；重做随机结果池",
  },
  {
    id: "dancer-8",
    job: "dancer",
    kind: "active",
    name: "舞姬希尔缇吉的耳语",
    sp: "30",
    description: "使一名队友的合格单体技能全体化，3轮。；必须3 BP。；保留",
  },
  {
    id: "dancer-support-1",
    job: "dancer",
    kind: "support",
    name: "强化回合数增加",
    description:
      "自己施加的普通能力强化额外+1轮；不延长奥义、术式次数、追加行动等特殊状态。",
  },
  {
    id: "dancer-support-2",
    job: "dancer",
    kind: "support",
    name: "回避准备",
    description:
      "每场战斗开始时获得1次「回避」；该次数可保留至实际抵消一个符合条件的Hit。",
  },
  {
    id: "dancer-support-3",
    job: "dancer",
    kind: "support",
    name: "鼓舞回响（替代获得JP上升）",
    description:
      "直接行动成功向其他队友施加普通能力强化后，该队友恢复100 HP；同一行动按不同受益队友结算，不按同一目标的强化条数重复。",
  },
  {
    id: "dancer-support-4",
    job: "dancer",
    kind: "support",
    name: "暖场高手",
    description:
      "每次直接行动成功给予普通能力强化时，受益目标获得10%满槽PP；同一行动按不同受益目标结算。赋予多种强化不重复计算同一目标。",
  },
  {
    id: "dancer-ex1",
    job: "dancer",
    kind: "ex",
    name: "EX1 炎舞之歌",
    sp: "18",
    description:
      "敌方全体火属性1段，K=1.5／2.25／3／4.5；我方下一轮普通行动进入前置组，组内保持原顺序。",
  },
  {
    id: "dancer-ex2",
    job: "dancer",
    kind: "ex",
    name: "EX2 希望之歌",
    sp: "32",
    description:
      "延长我方全体已有普通能力强化2／3／4／5轮；不新建缺少的强化，不增加术式／回避／反击次数，不延长自身或其他特殊奥义。",
  },
  {
    id: "scholar-1",
    job: "scholar",
    kind: "active",
    name: "火焰魔法",
    sp: "14",
    description:
      "敌方全体火魔法，可由术式升级。；普通1段K=1.6／2.4／3.2／4.8。；保留",
  },
  {
    id: "scholar-2",
    job: "scholar",
    kind: "active",
    name: "水流魔法",
    sp: "14",
    description: "敌方全体水属性魔法，可由术式升级。；同上。；保留",
  },
  {
    id: "scholar-3",
    job: "scholar",
    kind: "active",
    name: "雷击魔法",
    sp: "14",
    description: "敌方全体雷魔法，可由术式升级。；同上。；保留",
  },
  {
    id: "scholar-4",
    job: "scholar",
    kind: "active",
    name: "调查",
    sp: "1",
    description:
      "显示一个敌人的当前／最大HP，并揭示尚未公开的弱点。；揭示1／2／3／全部未知弱点。；保留；承接预习的信息价值",
  },
  {
    id: "scholar-5",
    job: "scholar",
    kind: "active",
    name: "灵光一闪",
    sp: "5",
    description:
      "自身随机获得普通能力强化，每项3轮；从物攻、属攻、物防、属防、速度五项等概率有放回抽取。；抽取2／3／4／5项；重复延长同类状态。；保留方向；池随五条轴同步",
  },
  {
    id: "scholar-6",
    job: "scholar",
    kind: "active",
    name: "属性混乱",
    sp: "10",
    description:
      "每段随机敌人、随机火／水／雷，三属性各1/3，每段M(0.55)。；段数在3—5／4—6／5—7／6—8中等概率取整。；保留",
  },
  {
    id: "scholar-7",
    job: "scholar",
    kind: "active",
    name: "大魔法化",
    sp: "15",
    description: "我方单体获得“大魔法”施放次数。；2／3／4／5次。；保留",
  },
  {
    id: "scholar-8",
    job: "scholar",
    kind: "active",
    name: "硕学王阿雷芬的睿智",
    sp: "30",
    description: "我方单体获得“特大魔法”3次。；必须3 BP。；保留",
  },
  {
    id: "scholar-support-1",
    job: "scholar",
    kind: "support",
    name: "战前研判（替代遇敌概率减半）",
    description:
      "开战时每个已存在敌人揭示1个未知弱点；多个装备者各揭示新的未知项。对召出的新部位不反复触发开战。承接“预习”，需要占正常辅助栏。",
  },
  {
    id: "scholar-support-2",
    job: "scholar",
    kind: "support",
    name: "属攻+50",
    description: "固定属攻+50，进入F，不被等级重新放大。",
  },
  {
    id: "scholar-support-3",
    job: "scholar",
    kind: "support",
    name: "专注施法（替代获得EXP提升）",
    description:
      "行动支付SP前，当前SP不少于最大SP的50%时，本次直接属性伤害+10%；不影响治疗或状态技能。",
  },
  {
    id: "scholar-support-4",
    job: "scholar",
    kind: "support",
    name: "魔法强化加成",
    description:
      "装备者每次获得大魔法／特大魔法次数时额外+1次；不在每次施法后补回，不因复制同一状态重复触发。",
  },
  {
    id: "scholar-ex1",
    job: "scholar",
    kind: "ex",
    name: "EX1 究极魔法",
    sp: "当前全部SP",
    description:
      "敌方全体无属性魔法；普通1段K=2.4／3.6／4.8／7.2。大魔法2段、每段为对应K×0.75；特大魔法3段、每段为对应K×0.65。无元素弱点，仍可享受Break。",
  },
  {
    id: "scholar-ex2",
    job: "scholar",
    kind: "ex",
    name: "EX2 指教",
    sp: "12",
    description:
      "将自身已有普通能力强化复制给一名其他存活队友，保留自身原状态。每项复制原剩余轮数并额外加0／1／2／3轮，按普通状态9轮规则处理。",
  },
  {
    id: "thief-1",
    job: "thief",
    kind: "active",
    name: "夺势（替代偷取）",
    sp: "2",
    description:
      "指定敌人一项可驱散的普通能力强化，将其移除，并使自己获得同类强化；无合格状态时不可选择该技能。；自身获得2／3／4／5轮，不继承目标的剩余轮数。；重做；仍为免费初始槽",
  },
  {
    id: "thief-2",
    job: "thief",
    kind: "active",
    name: "地袭",
    sp: "7",
    description: "敌方单体土属性1段。；K=1.5／2.25／3／4.5。；保留",
  },
  {
    id: "thief-3",
    job: "thief",
    kind: "active",
    name: "吸血匕首",
    sp: "6",
    description:
      "指定敌人扇2段；每段实际扣除HP的50%恢复自己HP，逐段取整。；每段K=0.8／1.2／1.6／2.4。；保留",
  },
  {
    id: "thief-4",
    job: "thief",
    kind: "active",
    name: "突然袭击",
    sp: "12",
    description:
      "指定敌人剑1段，越早行动伤害越高；按下述队列系数Q。；K=1.5／2.25／3／4.5，再乘Q。；保留方向；队列公式基线",
  },
  {
    id: "thief-5",
    job: "thief",
    kind: "active",
    name: "瞬间移动",
    sp: "4",
    description: "自身速度提升。；3／5／7／9轮。；保留",
  },
  {
    id: "thief-6",
    job: "thief",
    kind: "active",
    name: "猫头鹰",
    sp: "4",
    description: "敌方单体物防下降。；2／4／6／8轮。；保留",
  },
  {
    id: "thief-7",
    job: "thief",
    kind: "active",
    name: "蝙蝠",
    sp: "4",
    description: "敌方单体物攻下降。；2／4／6／8轮。；保留",
  },
  {
    id: "thief-8",
    job: "thief",
    kind: "active",
    name: "盗公子埃伯尔的钩爪",
    sp: "30",
    description:
      "敌方全体扇1段；基础P(5)×(1+有效速度÷400)。；必须3 BP。；保留速度收益；公式基线",
  },
  {
    id: "thief-support-1",
    job: "thief",
    kind: "support",
    name: "顺便战斗",
    description:
      "直接使用无伤害技能后50%概率对存活敌人追加1段当前武器普攻基础伤害；默认沿用本次敌方目标，否则随机选敌。该追击不带“直接普攻专用”宝石附效。",
  },
  {
    id: "thief-support-2",
    job: "thief",
    kind: "support",
    name: "行动速度+50",
    description:
      "固定速度+50，进入F；下一次生成／重算速度队列时生效，不冒充直接插队。",
  },
  {
    id: "thief-support-3",
    job: "thief",
    kind: "support",
    name: "陷阱",
    description:
      "实际受到物理伤害且存活后50%概率，对攻击者随机施加物攻／物防／速度下降之一，2轮；每个攻击行动判定一次，不按其段数重复。",
  },
  {
    id: "thief-support-4",
    job: "thief",
    kind: "support",
    name: "乘隙而入",
    description:
      "目标存在可解除的能力下降或元素异常时，对其直接物理伤害+20%；同一目标有多种弱化不多次增加20%。",
  },
  {
    id: "thief-ex1",
    job: "thief",
    kind: "ex",
    name: "EX1 乔装",
    sp: "18",
    description:
      "复制选定队友当前主副职业的已学职业技能菜单及必要武器许可，持续2／3／4／5轮；仍使用自身属性与资源，详见下文。",
  },
  {
    id: "thief-ex2",
    job: "thief",
    kind: "ex",
    name: "EX2 风幕",
    sp: "25",
    description:
      "敌方全体风属性1段，K=1.5／2.25／3／4.5；每名未倒地目标获得1次「回避」。",
  },
  {
    id: "cleric-1",
    job: "cleric",
    kind: "active",
    name: "恢复魔法",
    sp: "15",
    description:
      "我方全体存活角色各恢复floor((400+4E)×R) HP；可受术式强化。；R=1／1.5／2／2.5。；保留；治疗公式基线",
  },
  {
    id: "cleric-2",
    job: "cleric",
    kind: "active",
    name: "圣潮",
    sp: "6",
    description: "敌方单体水属性1段。；K=1.5／2.25／3／4.5。；保留",
  },
  {
    id: "cleric-3",
    job: "cleric",
    kind: "active",
    name: "圣火的祈祷",
    sp: "8",
    description: "我方单体物防、属防提升。；2／4／6／8轮。；保留",
  },
  {
    id: "cleric-4",
    job: "cleric",
    kind: "active",
    name: "吸魔杖击",
    sp: "6",
    description:
      "敌方单体杖2段；每段实际扣除HP的10%恢复自身SP。；每段K=0.8／1.2／1.6／2.4。；保留",
  },
  {
    id: "cleric-5",
    job: "cleric",
    kind: "active",
    name: "风息魔法",
    sp: "14",
    description:
      "敌方全体风属性魔法，可术式强化。；使用学者三属性魔法相同的基线段数与K表。；保留",
  },
  {
    id: "cleric-6",
    job: "cleric",
    kind: "active",
    name: "守护之圣盾",
    sp: "10",
    description:
      "我方单体的下一次实际承受伤害段减伤，次数为1；仅命中并产生正伤害才消耗。；减伤50%／60%／70%／80%。；保留方向；数值与按段为基线",
  },
  {
    id: "cleric-7",
    job: "cleric",
    kind: "active",
    name: "复活魔法",
    sp: "40",
    description:
      "我方所有倒地队友复活；不作用于存活角色。；恢复各自最大HP的10%／25%／50%／75%。；保留；恢复量基线",
  },
  {
    id: "cleric-8",
    job: "cleric",
    kind: "active",
    name: "圣火神爱尔福林克的祝福",
    sp: "30",
    description:
      "一名其他存活队友获得3轮“轮末追加1次自由行动”。；必须3 BP。；保留；不能自用",
  },
  {
    id: "cleric-support-1",
    job: "cleric",
    kind: "support",
    name: "HP恢复量上升",
    description:
      "装备者施放的直接HP恢复技能效果+30%；不提高宝石被动恢复、HP吸收或普通道具恢复。明确带治疗量的复活可以获得加成。",
  },
  {
    id: "cleric-support-2",
    job: "cleric",
    kind: "support",
    name: "最大SP+50",
    description:
      "固定最大SP+50；提高上限不补当前SP，保留本轮前已确认的最大SP调整范围。",
  },
  {
    id: "cleric-support-3",
    job: "cleric",
    kind: "support",
    name: "复苏守护（替代逃跑成功率上升）",
    description:
      "装备者用技能或道具复活队友时，额外恢复该目标最大HP的10%；合并到同一次复活，不产生第二次复活事件。",
  },
  {
    id: "cleric-support-4",
    job: "cleric",
    kind: "support",
    name: "自动复活",
    description:
      "沿用已确认：每场一次，恢复自身最大HP的25%；不补SP、BP、PP或错过的行动。",
  },
  {
    id: "cleric-ex1",
    job: "cleric",
    kind: "ex",
    name: "EX1 神圣魔法",
    sp: "当前全部SP",
    description:
      "支付前记录C=当前SP并全部消耗；全体风属性1段，M(K)×(1+C÷100)，K=1.5／2.25／3／4.5。C=0时不可用。",
  },
  {
    id: "cleric-ex2",
    job: "cleric",
    kind: "ex",
    name: "EX2 超量恢复的祈祷",
    sp: "20",
    description:
      "单体存活队友恢复floor((600+5E)×R) HP，增加到当前HP；允许超过自然最大HP，不额外设置最大HP倍数上限。",
  },
  {
    id: "hunter-1",
    job: "hunter",
    kind: "active",
    name: "狙击",
    sp: "6",
    description:
      "多段弓攻击，每段P(0.6)；玩家可按段分配敌方目标，默认全部指向同一目标。；2／3／4／5段。；保留；SP为项目基线",
  },
  {
    id: "hunter-2",
    job: "hunter",
    kind: "active",
    name: "森灵",
    sp: "7",
    description: "敌方单体木属性1段。；K=1.5／2.25／3／4.5。；保留",
  },
  {
    id: "hunter-3",
    job: "hunter",
    kind: "active",
    name: "裂甲斧（替代瓦解）",
    sp: "12",
    description:
      "单体斧1段，命中后目标物防下降2轮；不再依敌人种族决定自身buff。；K=1.5／2.25／3／4.5；弱化仍2轮。；重做",
  },
  {
    id: "hunter-4",
    job: "hunter",
    kind: "active",
    name: "钉足射击（替代点到为止）",
    sp: "6",
    description:
      "单体弓1段，命中后目标速度下降2轮；可以正常击倒目标。；K=1／1.5／2／3；弱化仍2轮。；重做",
  },
  {
    id: "hunter-5",
    job: "hunter",
    kind: "active",
    name: "瞄准目标",
    sp: "8",
    description:
      "我方全体各获得1／2／3／4次确定会心机会；每次由该角色下一次直接攻击的一个Hit消耗，未被回避的该Hit触发会心。；1／2／3／4次。；重做；以确定次数替代概率Buff",
  },
  {
    id: "hunter-6",
    job: "hunter",
    kind: "active",
    name: "粘着捕网",
    sp: "6",
    description:
      "使目标敌人的普通行动排在本轮尚未执行的普通行动之后，并在后续有效轮保持后置；不能撤销已经执行的行动。；2／4／6／8轮。；保留方向；队列边界基线",
  },
  {
    id: "hunter-7",
    job: "hunter",
    kind: "active",
    name: "化解弹",
    sp: "9",
    description:
      "选定敌方目标的可驱散临时有利状态并解除；不造成伤害。；解除1／2／3／全部项。；保留",
  },
  {
    id: "hunter-8",
    job: "hunter",
    kind: "active",
    name: "狩猎女王德雷芳朵的闪弓",
    sp: "30",
    description: "敌方全体弓3段，每段P(2.5)。；必须3 BP。；保留；威力基线",
  },
  {
    id: "hunter-support-1",
    job: "hunter",
    kind: "support",
    name: "猎手直觉（替代先制攻击的概率上升）",
    description:
      "第1轮开始生成普通行动队列前，装备者获得2轮速度提升；不额外生成“免费先制回合”，不提高命中概率。",
  },
  {
    id: "hunter-support-2",
    job: "hunter",
    kind: "support",
    name: "会心猎识（重做原暴击率上升）",
    description:
      "每场战斗第一次命中已知弱点时，该Hit确定触发会心；不产生或提高会心概率。",
  },
  {
    id: "hunter-support-3",
    job: "hunter",
    kind: "support",
    name: "弱点追猎（替代稀有怪物遭遇率上升）",
    description:
      "对未Break敌人命中武器弱点时，本次直接物理伤害+20%；不重复增加削盾点，Break后不触发本项。",
  },
  {
    id: "hunter-support-4",
    job: "hunter",
    kind: "support",
    name: "破防追击",
    description:
      "自己的直接行动造成Break后50%概率追加一个自由行动；一次根行动判定一次。由本被动生成的追加行动不能再次触发本被动；不禁其他合法额外行动来源。",
  },
  {
    id: "hunter-ex1",
    job: "hunter",
    kind: "ex",
    name: "EX1 兽王无尽",
    sp: "18",
    description:
      "自身物攻、速度提升，并获得1／2／3／4次「回避」；物攻与速度提升持续3／5／7／9轮。",
  },
  {
    id: "hunter-ex2",
    job: "hunter",
    kind: "ex",
    name: "EX2 连环追猎（替代集体唆使）",
    sp: "28",
    description:
      "敌方目标可逐段分配；每段选择弓或斧、每段P(1)，共3／4／5／6段；默认重复上一段配置。",
  },
  {
    id: "apothecary-1",
    job: "apothecary",
    kind: "active",
    name: "治疗术",
    sp: "6",
    description:
      "一名队友恢复floor((500+5E)×R) HP；若倒地，按该恢复量复活，仍不补SP／BP／PP。；R=1／1.5／2／2.5。；保留",
  },
  {
    id: "apothecary-2",
    job: "apothecary",
    kind: "active",
    name: "木刺",
    sp: "7",
    description: "敌方单体木属性1段。；K=1.5／2.25／3／4.5。；当前木属性版本",
  },
  {
    id: "apothecary-3",
    job: "apothecary",
    kind: "active",
    name: "健全化",
    sp: "10",
    description:
      "清除目标的爆破、凝滞、沉默、悬浮、侵蚀、混乱，并免疫这些元素异常。；2／4／6／8轮；不兼任能力弱化、即死或首领机制免疫。；当前六异常版本",
  },
  {
    id: "apothecary-4",
    job: "apothecary",
    kind: "active",
    name: "斧一闪",
    sp: "9",
    description: "敌方全体斧1段。；K=1.2／1.8／2.4／3.6。；保留",
  },
  {
    id: "apothecary-5",
    job: "apothecary",
    kind: "active",
    name: "侵蚀散剂",
    sp: "9",
    description:
      "敌方单体纯异常；BP0／1／2／3输入100／150／200／250侵蚀AP，按目标韧性换层；不造成直接伤害，不消耗回避，层数只延长实际行动次数。",
  },
  {
    id: "apothecary-6",
    job: "apothecary",
    kind: "active",
    name: "继续疗伤",
    sp: "9",
    description:
      "一名存活队友在每次完整直接行动结束时恢复floor(300+2E) HP；E在施加时快照。；持续3／5／7／9轮。；保留；恢复量基线",
  },
  {
    id: "apothecary-7",
    job: "apothecary",
    kind: "active",
    name: "施加侵蚀弱点",
    sp: "4",
    description:
      "目标受到实际侵蚀伤害时额外失去1点护盾；并非降低侵蚀抗性。；2／4／6／8轮。；当前土异常版本",
  },
  {
    id: "apothecary-8",
    job: "apothecary",
    kind: "active",
    name: "灵药公德塔的恩惠",
    sp: "30",
    description:
      "一名我方存活角色在3轮内使用的合格单体战斗道具改为全体；每次只消耗原本一份道具。；必须3 BP。；保留",
  },
  {
    id: "apothecary-support-1",
    job: "apothecary",
    kind: "support",
    name: "临危施药（替代战斗后恢复）",
    description:
      "使用恢复HP的战斗道具时，目标使用前HP≤最大HP25%，本次对该目标的HP恢复+25%；复活道具不按0HP套入此条件。",
  },
  {
    id: "apothecary-support-2",
    job: "apothecary",
    kind: "support",
    name: "最大HP+500",
    description: "固定最大HP+500，进入F；不自动恢复当前HP。",
  },
  {
    id: "apothecary-support-3",
    job: "apothecary",
    kind: "support",
    name: "令敌人破防恢复SP",
    description:
      "装备者使一个敌人实际进入Break时恢复自身10 SP；多个敌人分别Break可以分别恢复。",
  },
  {
    id: "apothecary-support-4",
    job: "apothecary",
    kind: "support",
    name: "耐药管理",
    description:
      "自身韧性获得常驻被动+50%修正，与旧忆网增益独立乘算；不是随机抗性，不减少既有异常层，不清AP。",
  },
  {
    id: "apothecary-ex1",
    job: "apothecary",
    kind: "ex",
    name: "EX1 粗暴治疗",
    sp: "18",
    description:
      "指定敌人：移除其可清除普通异常与能力下降，数量N按状态ID计；随后单体斧P(K)×(1+0.5N)，K=1.5／2／2.5／3。",
  },
  {
    id: "apothecary-ex2",
    job: "apothecary",
    kind: "ex",
    name: "EX2 百药处方",
    sp: "22",
    description:
      "每次随机选一名存活队友，再从物攻、属攻、物防、属防、速度五种强化等概率选一项，给予3轮；可重复。",
  },
];
// 总书10.11.1指定当前Demo首领使用专项稿第8章的数值；机制仍服从最新总书。
const baseline: Record<string, { sp?: string; description?: string }> = {
  "warrior-1": {
    description: "随机存活敌人剑攻击3/4/5/6段，每段P(0.6)，每段重新选目标。",
  },
  "warrior-7": {
    sp: "8",
    description:
      "获得2/3/4/5次物理受击反击；每次单体剑P(0.8)，命中后无视弱点削1盾。",
  },
  "dancer-support-3": {
    description:
      "直接行动成功向其他队友施加普通强化后，该队友恢复200HP；同一行动同一目标计一次。",
  },
  "scholar-6": {
    description:
      "每段随机存活敌人、随机火/水/雷（各1/3），每段M(0.5)；3—5/4—6/5—7/6—8段。",
  },
  "thief-3": { sp: "8" },
  "cleric-1": {
    sp: "15",
    description:
      "我方全体存活角色各恢复floor((100+2E)×R) HP；E为有效属防，R=1/1.5/2/2.5。大/特大术式分别提高一次治疗总量至1.5/2倍。",
  },
  "cleric-ex2": {
    sp: "20",
    description:
      "单体存活队友恢复floor((300+3E)×R) HP，可超过自然最大HP；E为有效属防，R=1/1.5/2/2.5。",
  },
  "apothecary-1": {
    sp: "6",
    description:
      "单体恢复floor((200+3E)×R) HP；倒地目标按此量复活；E为有效属防，R=1/1.5/2/2.5。",
  },
  "apothecary-6": {
    sp: "9",
    description:
      "单体存活队友每次完整直接行动结束恢复floor(100+E) HP；施加时快照有效属防E，持续3/5/7/9轮。",
  },
  "hunter-ex2": { sp: "24" },
  "apothecary-ex2": { sp: "18" },
};
export const jobSkills = sourceSkills.map((s) => {
  const adopted=confirmedById[s.id];
  return {...s,...baseline[s.id],...(adopted?{name:adopted.name,sp:String(adopted.sp),description:`${adopted.description} ${adopted.boost}`}:{})};
});
