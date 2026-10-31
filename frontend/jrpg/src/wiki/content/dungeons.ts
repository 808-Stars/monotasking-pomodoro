import {article,p,list,table,notice,section as s} from "./helpers.ts";

const bosses=[
  {id:"gilded-warden",name:"铸金监守",place:"铸金穹厅",resource:"古币",portrait:"gilded-warden",theme:"正举蓝金纹章巨盾、胸口穿心缺甲的巨型猫骨监守；手握盾后把手，不扶盾沿。",focus:"第一门检验起步队伍的基础破盾、资源周转与生存，不应要求尚未取得的付费技能或尘玉。",boundary:"本门只保留监守，矛卫与盾卫已取消，不是必须补回的开局单位。"},
  {id:"echo-archivist",name:"回响馆长",place:"回响书库",resource:"旧忆",portrait:"echo-archivist",theme:"白焰双眼的幽影馆长，兜帽短塌布耳无白边；Logo正脸，Timeline左向，不是另一位骷髅守卫。",focus:"第二门侧重行动轮变化与Live Intent，帮助理解当前预告如何随战局更新。",boundary:"旧“基础Break第一门”的教学顺序已调整。旧面板与新动作候选不能直接拼装为定稿。"},
  {id:"trial-dragon",name:"武艺宗师",place:"试艺回廊",resource:"残响",portrait:"trial-grandmaster-bust",theme:"身穿灰绿道袍、闭眼结印、悬浮盘坐的猫形宗师；断裂封印环与毒焰保留异变气息。",focus:"考察多武器／多元素覆盖与弱点变化后的队伍应对，不强制带某一个职业。",boundary:"现名武艺宗师；试艺蚀龙、蚀誓灵猫为旧称。道袍形象已接入图鉴和Demo开幕、卡片、Timeline及地图预览；独立招式表现仍待完善。"},
  {id:"prism-core",name:"棱镜核心",place:"棱镜矿庭",resource:"尘玉",portrait:"prism-core",theme:"猫耳浮石内收、双臂自然垂落，以底部一个角立足的巨大棱镜主体；不采用撤销的机械版、交叉臂或碎石表情。",focus:"构筑资源门的高压挑战，保留单主体辨识与公开机制。",boundary:"赤棱卫、青棱卫及其联合减伤为历史多单位稿，当前本门只保留核心；新的单体动作仍待重做。"},
];
export const dungeons=[
  article({id:"dungeons",title:"四门与王庭",category:"dungeons",topic:"挑战总览",summary:"古币→旧忆→残响→尘玉是引导顺序，挑战不强制依次解锁。",sourceSections:["§2.1","§2.5","§10.1—10.7"],related:[...bosses.map(b=>b.id),"advanced","finale","ai"],sections:[
    s("gates","按资源找首领",table(["引导顺序","场景","首领","主资源"],bosses.map((b,i)=>[String(i+1),b.place,b.name,b.resource])),p("普通／进阶首胜分别记录，战胜后开放对应扫荡。当前每个资源副本一个敌人，不建立随机遇敌、野怪刷取或独立小怪生态。")),
    s("units","附属单位的规则与当前阵容分开",p("底层允许Boss机制需要护卫、召唤物或可破坏目标，不意味着当前副本必须保留旧小怪设计。现行四门均按单主体方向；旧双卫联动不作为完成要求。")),
    s("numbers","不把旧表包装成新版定稿",notice("首领数值与动作仍需收口","总书保留旧数值与动态AI重构候选。尤其前两门顺序已交换，不能直接把旧6500／18000HP面板当作已经验证的新门槛。本Wiki只整理稳定规则，不承诺某构筑必胜。")),
  ]}),
  ...bosses.map(b=>article({id:b.id,title:b.name,aliases:b.id==="trial-dragon"?["试艺宗师","裁判","试艺蚀龙","蚀誓灵猫"]:[],category:"dungeons",topic:"四资源首领",portrait:`/jrpg/assets/portraits/${b.portrait}.webp`,summary:`${b.place}的${b.resource}资源首领。${b.focus}`,ruleStatus:"mixed",sourceSections:["§2.5","§10.1",b.id==="gilded-warden"?"§10.4":b.id==="echo-archivist"?"§10.3":b.id==="trial-dragon"?"§10.5":"§10.6","§10.20"],related:["dungeons","ai","advanced","sweeping"],sections:[
    s("identity","身份与职责",p(b.theme),p(b.focus)),
    s("reward","奖励边界",p(`普通／进阶首次胜利固定获得本门${b.resource}SSR物品，不按85%决定首胜类别。之后对应扫荡才独立抽取资源类别与稀有度。击败表现为失去战斗能力并退离，不是反复击杀。`)),
    s("status","机制设计边界",notice("现行约束与待定部分",b.boundary),p("A／B／C按自然月全服统一轮换，普通／进阶同月同变体，没有签类切换入口。详细招式、韧性与优先级以最终公开图鉴为准，不将历史固定循环作为当前AI。")),
  ]})),
  article({id:"advanced",title:"进阶资源挑战",category:"dungeons",topic:"挑战总览",summary:"相同首领的加强版，四个进阶与魔王均定位五星；进阶奖励数量更高但概率不变。",sourceSections:["§10.12—10.19","§12.6","§4.1"],related:["dungeons","sweeping","reward-items","ai"],ruleStatus:"mixed",sections:[
    s("tier","不是新名字与新稀有度",p("进阶首领保留普通版名称与资源身份，可以有新动作。四个进阶均为五星，难度定位接近魔王；数值与投资门槛仍待战斗验证，不以星级保证固定通关概率。")),
    s("economy","数量提升与概率分离",p("资源类别仍为85／5／5／5，所有资源门与难度统一使用10／50／30／10的稀有度概率。普通数量档位为1／2／5／8，进阶为10／20／50／80，同稀有度价值与对应期望均为普通的10倍。首胜分别领取本门进阶SSR，正式失败4%获得本门进阶N。")),
    s("ai","不能拼接旧联动",p("进阶动作库替换对应普通动作库，不再把普通半血强化额外叠一遍。旧棱卫与魔王结界等已废弃单位不因进阶表仍有数值就自动恢复。阶段保护、韧性和免疫必须明确公开。")),
  ]}),
  article({id:"finale",title:"终刻魔王双战",category:"dungeons",topic:"王庭",portrait:"/jrpg/assets/portraits/final-aberration-bust.webp",summary:"两支互不重叠的四人队连续作战，共用锁定背包；全胜后才产生完整成绩。",sourceSections:["§10.7","§10.17","§11.7"],related:["backpack","records","stamina","world"],ruleStatus:"mixed",sections:[
    s("teams","八人分为两队",p("第一战前锁定两个四人队、职业搭配、辅助、尘玉、旧忆和背包。非沙盒只扣20体力并自动恢复一次；每场一个魔王主体，不恢复旧独立结界或侧轮。")),
    s("carry","两场之间不能重新整备",p("不换队、换装、买药或跨队传递状态；第二队从本次开始时恢复并锁定的自身HP／SP出发，BP／PP依本场规则创建。背包继承真实剩余量，不补药。")),
    s("result","全胜才是完整通关",p("第一胜不单独发培养资源；第二败使整个挑战失败，下次新挑战从第一场重新付费开始。合法断线检查点可恢复当前进度，不等于失败后可以只重打第二场。魔王全胜以纪念、历史和成绩为回报，不额外掉培养资源。")),
    s("pending","仍待定稿的战斗内容",notice("玩法结构已确定，独立AI未全定稿","终局两队结构与结算边界已确定。旧结界／侧轮机制已退为历史，新单主体动作、AI与平衡不能拿旧稿直接填满；魔王失败N物品数量表也尚未确认。")),
  ]}),
  article({id:"ai",title:"动态AI与Live Intent",aliases:["敌人意图","意图","A/B/C"],category:"dungeons",topic:"敌人机制",summary:"根据公开战局条件重新选招；界面强制显示技能名，详细机制由图鉴解释。",sourceSections:["§10.1","§10.20","§12.7"],related:["timeline","break","dungeons"],ruleStatus:"mixed",sections:[
    s("dynamic","不是固定循环，也不是暗抽",p("生成敌方行动时根据HP阶段、Break、异常、蓄势、公开场景条件选择合法招式。不得把旧箭头顺序当作A→B→C必走循环，也不能在未说明条件下从技能池暗抽招。")),
    s("live","意图随局面更新",p("影响选招的条件变化时重新评估下一Intent与可见队列。界面只强制显示招式名；段数、元素、异常、选择条件及Break互动放图鉴，不强迫玩家从堆叠标签里找名字。"),p("随机目标可在实际结算时锁定；合法重定向、同级平局随机等必须公开。预告是当前局势判断，不是跨越所有状态变化的保证。")),
    s("month","月度变体",p("同一自然月全服统一A／B／C，普通和进阶共享该门当月变体；刷新、个人种子或断线不重新抽，也没有命运之签等切换功能。"),notice("未决锚点与AI候选","具体哪个年月从A／B／C何者开始、部分优先级和平局参数尚待确认。正式规则不等于每位首领的重构候选都已实装。")),
  ]}),
  article({id:"world",title:"月度异变与旧驿镇",category:"dungeons",topic:"世界观",summary:"每月异变后，新的八名旅人在旧驿镇集结；四门的遗产服务于成长与构筑。",sourceSections:["§2.4—2.5"],related:["month","camp","finale"],sections:[
    s("town","异变边缘的落脚处",p("主角团已采用Q版猫娘，敌人保留恐怖体态，共同猫元素不自动新增种族起源或免疫机制。旧驿镇连接过商路、护送与朝圣路线，异变留下不同时代的梁柱、石料与器具。八名旅人各有来由，只用职业称呼，不固定个人姓名；下一周目是新八人，不默认继承上一队私人经历。")),
    s("resources","遗产与四资源",p("古币是卷入异变的财富，旧忆是散落经历，残响是技艺痕迹，尘玉与魔力结晶有关。遗产可来自许多时代，不限上一支队伍；不新增献祭或灵魂消耗操作。四资源首领被击退，扫荡是沿已通路线回收。")),
    s("ending","结局与回溯",{kind:"spoiler",title:"展开通关与未通关结局（重要剧透）",blocks:[p("上一代八人击败异变体后，被它死后发动的亡语吞噬，重构成新的魔王并引发巨大异变。本期完整双战获胜后，当前八人同样全部被吞噬。胜利真实发生，不是幻觉，也没有隐藏全员生还分支。"),p("未通关的八人听闻另一支队伍讨伐成功，未知其生还，随异变分道扬镳。玩家不会因为未完成月度讨伐而受到道德评价。通关后继续游玩采用终战前回溯，不回滚经济、不复制奖励，也不提前开启下月。")]}),
  ]}),
];
