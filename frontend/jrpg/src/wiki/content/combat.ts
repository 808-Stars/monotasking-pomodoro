import {article,p,list,table,formula,notice,link,section as s} from "./helpers.ts";

const abnormal=[
  {id:"explosion",name:"爆破",element:"火",effect:"每新增一层，同时增加一层保存伤害和一次延迟行动。经过行动只减少剩余延迟，不减少伤害层；新增层也不能恢复已经等待过的行动。到期将全部保存伤害合为一个Hit并清除状态。",evade:"爆发可消耗1次回避，无论伤害是否被回避，状态均正常移除。"},
  {id:"stasis",name:"凝滞",element:"水",effect:"确认指令时不能投入BP；不追溯取消已经确认支付的BP。",evade:"不是伤害Hit，回避不能免除这一限制。"},
  {id:"silence",name:"沉默",element:"木",effect:"禁止主动使用会造成即时直接伤害的技能，伤害只是附带效果也算。普通攻击不是技能，不受沉默限制；治疗、无直接伤害的状态与道具仍按合法性使用。",evade:"纯异常不触发回避。不要以magic标签代替攻击性判断。"},
  {id:"float",name:"悬浮",element:"风",effect:"禁止普通攻击，以及任何明确要求武器的技能、奥义或EX。无武器要求的纯属性攻击与非武器能力不因此被禁止。",evade:"纯异常不触发回避。附元素的武器技仍然属于武器技。"},
  {id:"erosion",name:"侵蚀",element:"土",effect:"按具体技能文本多次结算低额持续伤害，不产生最后一次大爆发。",evade:"属于持续伤害，不检查也不消耗回避次数。"},
  {id:"confusion",name:"混乱",element:"雷",effect:"手动指定单体目标时，在原目标阵营内随机选择合法目标，永不跨敌我阵营。不影响自身、全体或没有指定目标的行动。",evade:"保留的是合法目标随机性，不是随机Miss。"},
];

export const combat=[
  article({id:"stats",title:"八项属性与五轴状态",category:"combat",topic:"基础计算",summary:"HP、SP、四攻防、速度与韧性；其中五轴可被普通强化或下降实时修改。",sourceSections:["§5.1—5.2","§6.5"],related:["damage","buffs","ap","equipment"],sections:[
    s("attributes","八项属性",table(["属性","作用"],[["HP／SP","生命与技能资源容量；当前剩余值另计"],["物攻／属攻","对应伤害类型的攻击面板"],["物防／属防","对应伤害防御；治疗技能也可能使用有效属防"],["速度","普通行动排序依据，不等于直接移动行动节点"],["韧性","共享AP槽的触发阈值，基础100"]])),
    s("permanent","常驻与即时属性",formula("S₀ = floor((B × (1 + L) + F) × (1 + P))\nS = floor(S₀ × T)"),p("B为共同基础与适用固有装备，L为旧忆节点相加增幅，F为固定加成，P为常驻百分比加成之和。物攻、属攻、物防、属防、速度的普通上升T=1.2、下降T=0.8、无状态T=1；HP、SP、韧性不新增这套普通五轴Buff。"),p("提高HP／SP容量不补当前值、不复活；降低时将当前值夹到新上限。状态栏显示即时属性，不包含速度排序随机因子。")),
  ]}),
  article({id:"damage",title:"伤害与恢复公式",category:"combat",topic:"基础计算",summary:"先修改攻防属性，再计算每Hit伤害；弱点、Break、会心与装备加成各有明确位置。",sourceSections:["§5.2","§6.2"],related:["stats","critical","weakness","break","buffs"],sections:[
    s("base","单段公式",formula("D₀ = (即时攻击 × I − 即时防御 ÷ 2) × K\n最终伤害 = max(1, floor(D₀ × 适用倍率))"),p("物理使用对应武器物攻与目标物防，属性魔法用属攻与属防。I默认1，K依技能和BP表。免疫、回避或归零减伤为0，不能靠最低1伤害穿透。")),
    s("multipliers","哪些倍率可以相乘",table(["项目","当前规则"],[["未Break命中弱点","×1.3"],["已Break","×2，与弱点×1.3不相乘"],["确定性会心","指定Hit ×1.25，可作用于物理或属性伤害"],["每段伤害浮动","0.98—1.02，战斗种子固定"],["同类增伤","适用百分比相加为1＋总和，单元素与全元素同组"],["元素抗性","适用抗性相加，承伤×max(0,1−总抗性)"],["普通攻防状态","已进入即时属性，不再另乘伤害／承伤"]]),p("普通每Hit伤害上限9999；装备对应突破辅助后为99999，不是额外乘10。吸收取实际损失HP，不取溢出显示伤害。")),
    s("healing","恢复与消耗",p("治疗公式中的E指施术者有效属防，不是属攻。R=[1,1.5,2,2.5]只用于明确写R的治疗技能；普通治疗不超过自然HP上限，复活、吸收、道具与被动恢复分事件处理。"),formula("固定SP费用 = floor(原费用 × max(0,1 − 减耗总和))"),p("原本正费用最低1，零费保持零费；按当前SP百分比支付的费用不吃固定费减耗，按实际消耗向下取整。")),
  ]}),
  article({id:"timeline",title:"行动轮与速度",aliases:["Timeline","行动顺序"],category:"combat",topic:"行动与指令",summary:"同时显示本轮剩余与下一轮；速度变化和直接移动行动节点是两种机制。",sourceSections:["§6.1","§6.3"],related:["stats","bp","break","ai"],sections:[
    s("speed","普通速度排序",formula("排序键 = 即时速度 × 已固定随机因子（0.9—1.1）"),p("降序排列，平局按会话种子形成稳定顺序。普通速度Buff不插队本轮已生成节点；下一轮预览按新速度与原来抽好的因子重排，不重新掷一次随机数。")),
    s("nodes","移动节点不等于加速度",p("明确前移／后置的技能直接操作行动槽。先生成速度队列，再应用防御等前置组、直接移动、预约特殊行动与轮末追加；额外行动不自然获得BP。"),p("倒地删除对应未来槽，复活不补本轮已经丢失的行动。Break立即移除本轮剩余和下一轮节点。")),
    s("controls","指令操作",list("上下或W／S选择指令，左右或A／D减少／增加允许投入的BP。","Enter或Space确认；Backspace取消或返回。","单体指令先预选合适合法目标，可点击其他合法卡片改选，仍须确认后才执行。","敌方Live Intent是当前局面预告，战场改变后可以更新。")),
  ]}),
  article({id:"weakness",title:"武器、元素与弱点",category:"combat",topic:"破盾",summary:"六武器、六元素；命中已匹配的弱点Hit削盾，双重匹配仍只削1盾。",sourceSections:["§1.4","§6.2—6.4"],related:["jobs","evasion","break","statuses"],sections:[
    s("types","合法类型",table(["类型","当前范围"],[["武器","剑、枪、弓、扇、斧、杖"],["战斗元素","火、水、木、风、土、雷"]]),p("短剑不在武器体系中，冰／光／暗不在当前六元素中。冷玉、暖玉、彩玉是尘玉家族，不是额外战斗元素。")),
    s("shield","一次Hit怎样削盾",p("实际命中且武器或元素匹配当前弱点时削1盾。两者同时匹配仍只削1；未Break弱点伤害×1.3。被回避的Hit不削盾，也不视为命中弱点。"),p("无武器物理没有武器弱点资格；无属性魔法没有六元素弱点资格。元素攻击不会自动附加对应异常，必须由技能明确输入AP。")),
  ]}),
  article({id:"break",title:"Break",aliases:["破盾","击破"],category:"combat",topic:"破盾",summary:"护盾降至0立即击破：移除本轮与下一轮行动，后续Hit获得Break伤害倍率。",sourceSections:["§6.4","§6.6"],related:["weakness","timeline","pp","evasion"],sections:[
    s("instant","击破发生在Hit之间",p("单次命中先按命中前状态计算伤害，再削盾；降至0立即Break，后续Hit才按Break状态结算。不能把整个多段技能结束后才统一判Break。"),p("每使一名敌人进入Break，获得基础20 PP；只削盾没Break不给。已Break不继续削成负数或重复触发。")),
    s("two-rounds","本轮、下一轮与恢复",p("进入普通Break时立即删除目标本轮剩余及下一轮所有行动节点。UI保留BREAK与下一Intent预览，但预览不是可执行节点。再下一轮开始恢复原盾值，并依动态AI重新生成行动，不补回旧节点。"),notice("不要套用历史首领机制","旧魔王独立结界与侧轮已降为待重做历史稿，不能用其旧恢复时钟补齐当前单主体魔王。")),
  ]}),
  article({id:"bp",title:"BP与增幅",category:"combat",topic:"资源",summary:"最多持有5BP，每次最多投入3；增幅按技能表改变段数、效果或持续时间。",sourceSections:["§6.4","§6.5"],related:["timeline","stasis","learning"],facts:{capacity:5,maximumBoost:3},sections:[
    s("flow","如何获得与花费",list("入场BP0，第1轮开始正常获得1；明确的辅助另行增加。","若上一轮花过至少1BP，本轮自然＋1暂停；队友传BP不解除暂停。","额外行动不会自然再加1BP。","普攻为1＋投入BP段，每段K1；其他技能使用各自增幅表。","奥义需要投入3BP，学会不等于可以零BP施放。")),
    s("buff","增幅不是Buff强度升级",p("BP可延长持续时间、增加段数、伤害、治疗、回避次数或明确独立参数，但不把五轴普通Buff升级为更高强度。凝滞时不能投入BP。")),
  ]}),
  article({id:"ap",title:"AP与韧性",aliases:["异常值","异常积累","AP抗性"],category:"combat",topic:"资源",summary:"每单位一条共享积累槽，达到韧性阈值时，由本次有效输入的类型生成异常层。",sourceSections:["§1.4A","§6.5"],related:["stats","statuses","explosion","cleanse"],sections:[
    s("formula","统一积累与多层",formula("新增层数 = floor((原AP + 本次有效输入D) ÷ 韧性T)\n剩余AP = (原AP + D) mod T"),p("基础韧性100。没有六条分开的元素AP槽；本次有效输入类型决定此次产生的全部新层，余量继续保留，最近输入不是锁定下一次异常。"),p("例如原AP70、T100，受到30点水类型AP后获得1层凝滞，余量0；若输入230，则获得3层，余量0。")),
    s("immunity","免疫与净化",p("对应免疫阻止该类型AP输入。净化默认清除选定异常的全部层，不清共享AP。元素伤害本身不自动加AP；阈值与输入量应公开，不藏异常抗性骰子。")),
  ]}),
  article({id:"pp",title:"PP",aliases:["底力","潜力","潜能","绝技"],category:"combat",topic:"资源",summary:"满自身PP容量后可确认主职业专属指令；基础100，明确被动例外按条文；副职业不复制PP。",sourceSections:["§8.1—8.3"],related:["jobs","bp","break","backpack"],facts:{capacity:100},sections:[
    s("gauge","槽位与支付",p("基础容量100，特殊容量被动按自身已确认效果；每场从0开始、结束不保留；明确辅助可让入场满槽。内部保留小数、UI显示整数，满槽显示四角星。选择指令不扣，确认合法命令时一次扣满；取消不扣，执行后中断不返还。")),
    s("gain","主要积累来源",table(["来源","基础增量"],[["实际承受敌方HP伤害","同一敌行动合并损失HP／HP上限×100"],["使一个敌人进入Break","20"],["自扣HP、被回避或无效伤害","不算受伤PP"],["明确技能、辅助与装备","依各自文本，不能虚构统一回复"]]),p("自己本次PP命令及其派生范围内不能用附带效果回填自己的PP；其他角色正常获得。倒地清槽，没有PP药或PP上限成长。")),
    s("unique","专属指令归属",p("剑士通透世界、舞娘完美交响、商人干劲、学者魔法收敛化、盗贼残影、神官弱点启示、猎人连令、药师节约。具体资格、费用与范围转换依职业词条，不等同奥义或EX。")),
  ]}),
  article({id:"evasion",title:"逐Hit回避",aliases:["闪避"],category:"combat",topic:"命中与防御",summary:"1次回避抵消1个合法伤害Hit；多段与全体攻击按目标、按Hit独立消耗。",sourceSections:["§6.3","§6.6"],related:["critical","weakness","explosion","erosion"],sections:[
    s("charges","回避是次数，不是概率",p("正常直接攻击默认命中，没有命中率／回避率。获得2次回避后，默认保留到成功消耗，不因回合结束自动到期；没有新增全局次数上限。"),p("面对4Hit攻击且拥有2次回避，前两Hit无效，后两Hit正常结算。全体3Hit对各目标分别扣自己的回避，不因一人闪避取消整个技能。")),
    s("effects","被回避的Hit不留下什么",list("不造成伤害、不削盾、不视为命中弱点。","不触发该Hit依赖命中的Buff、Debuff、异常或吸收。","后续Hit继续，独立行动结束效果仍按文本结算。","无视回避是绕过，而非消耗目标回避后再命中。")),
    s("exceptions","爆破与侵蚀不同",p("爆破延时爆发可回避，之后状态仍清除；侵蚀是持续伤害，不检查或消耗回避。纯状态、直接扣HP／SP／BP等非攻击资源变化也不可回避。")),
  ]}),
  article({id:"critical",title:"确定性会心",aliases:["暴击","必暴击"],category:"combat",topic:"命中与防御",summary:"由明确条件决定某个Hit会心，统一×1.25，不存在随机会心率。",sourceSections:["§6.2—6.3"],related:["damage","evasion","buffs"],sections:[
    s("condition","条件必须可判断",p("会心可以由护盾值、已知弱点、目标状态或具体技能明确条件触发，不使用概率。多段技能须说明第一击、最后一击或全部Hit，不默认一次会心覆盖所有段。")),
    s("resolve","先判断回避，再产生伤害",p("会心可作用于物理与属性Hit，统一伤害×1.25。原本满足会心条件但被回避的Hit不造成会心伤害，不削盾。会心不是五轴普通Buff之一；作为猎人主要职务，其他职业候选中降低频次，不取消合法混搭。")),
  ]}),
  article({id:"buffs",title:"Buff与Debuff",category:"combat",topic:"状态",summary:"五轴固定强度，重复施加延长时间，反向状态按剩余回合抵消。",sourceSections:["§5.2","§6.5"],related:["stats","damage","statuses"],sections:[
    s("five","只有五条普通属性轴",p("物攻、属攻、物防、属防、速度，上升×1.2、下降×0.8后向下取整。命中、回避、会心不在这套轴中；重复施加不复利堆叠强度。")),
    s("duration","回合数运算",list("物攻上升2回合再上升3回合，得到上升5回合。","速度下降3回合收到上升2回合，剩下降1回合。","同轴正负不会同时保留；等量时双方消失。","普通持续上限9回合；本轮轮末计衰减，额外行动不多扣轮数。")),
    s("special","特殊状态分开管理",p("回避次数、术式次数、圣盾、反击、超量HP、行动预约与风险投资等不套用普通五轴延长／复制规则，除非具体白名单允许。图标只是展示，不另造一份战斗效果。")),
  ]}),
  article({id:"statuses",title:"六种异常",category:"combat",topic:"状态",summary:"火爆破、水凝滞、木沉默、风悬浮、土侵蚀、雷混乱；由明确AP输入产生。",sourceSections:["§1.4A","§6.5"],related:abnormal.map(a=>a.id),sections:[
    s("overview","按效果查阅",table(["元素","异常","核心限制"],abnormal.map(a=>[a.element,a.name,a.effect])),p("伤害元素不自动附加异常；查看技能的AP输入类型与数量。爆破之外的五种异常层数代表有效行动次数，不提高基础限制强度；本次自身行动中新获得的层不在同一次结束立即扣除。")),
    s("links","独立规则",{kind:"list",items:abnormal.map(a=>[link(a.id,a.name),"：查看持续、回避与结算边界。"])}),
  ]}),
  ...abnormal.map(a=>article({id:a.id,title:a.name,category:"combat",topic:"六异常",summary:`${a.element}对应的异常。${a.effect.split("。")[0]}。`,sourceSections:["§1.4A","§6.5"],related:["ap","statuses","cleanse"],aliases:a.id==="explosion"?["爆炸"]:[],sections:[
    s("effect","效果",p(a.effect)),s("resolution","结算边界",p(a.evade),p("须由明确的AP输入跨越韧性阈值获得，不是该元素造成伤害就自动附加。净化默认移除这一种异常全部层，不清共享AP。")),
  ]})),
  article({id:"cleanse",title:"净化、复活与倒地",category:"combat",topic:"状态",summary:"净化不清共享AP；复活不补已丢失的本轮行动，普通治疗不能治疗倒地者。",sourceSections:["§6.5—6.7","§4.4"],related:["ap","backpack","failure","pp"],sections:[
    s("cleanse","净化的范围",p("清除一种异常默认移除全部层，但保留AP。普通五轴下降与特殊机制能否清除、夺取或延长，依技能白名单，不把阶段保护当普通强化。")),
    s("fallen","倒地后的变化",p("倒地清BP、PP、普通状态、超量HP和未执行预约，移除相应未来行动。复活按技能恢复HP，不自动补SP，也不补当前已失去行动。普通治疗不能治疗倒地者。"),p("HP代价不触发受伤PP、反击或普通保命。明确不可复活机制持续至该场结束；不能用普通复活绕过。")),
  ]}),
  article({id:"failure",title:"失败、撤退与断线恢复",category:"combat",topic:"挑战边界",summary:"撤退属于正式失败；合法中断恢复原战斗，不再次扣费、不重抽结果。",sourceSections:["§4.1","§6.7","§12.7"],related:["stamina","sweeping","finale"],ruleStatus:"mixed",sections:[
    s("result","失败与沙盒不是同一回事",p("全队倒地、主动撤退或其他正式非胜利终局均为失败。四资源门普通失败25%概率获得1件本门普通N物品，进阶为4%概率获得1件本门进阶N物品；不套扫荡类别或稀有度表。"),p("该难度首胜后的沙盒重战无资源奖励，不消耗持久药品，也不免费恢复场外角色。下一次非沙盒挑战重新付20体力并自动恢复。")),
    s("resume","合法中断不是失败",p("刷新、关闭或断线时，若尚无正式结局且存在合法行动边界检查点，则恢复同一战斗与随机进度；不重新扣费或发奖。不能把第二场失败变成只重打第二场。")),
    s("pending","魔王失败奖励缺口",notice("数值表尚待确认","魔王失败已确定25%触发、四资源各25%，但N奖励应采用普通还是进阶数量表尚未确定；本Wiki不代选。")),
  ]}),
];
