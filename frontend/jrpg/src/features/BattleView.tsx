import { useEffect, useState, type MutableRefObject } from "react";
import { BattleScene, BattleEntryCurtains } from "./BattleScene.tsx";
import { BattleCardField } from "./BattleCardField.tsx";
import { BattleInfoDialog } from "./BattleInfoDialog.tsx";
import { useBattleScene } from "../presentation/useBattleScene.ts";
import { advanceOpening, createSceneCheckpoint, sceneKeyFor, isBattleInputReady, type BattleSceneCheckpoint } from "../presentation/battleSceneState.ts";
import { legalCardTargets, recommendedCardTarget, selectedCardTarget } from "../presentation/battleCardTargets.ts";
import { portraitSource } from "../presentation/battlePortraits.ts";
import type { BattleFocus } from "../presentation/battleFocus.ts";
import type { BattleLayoutGate } from "../presentation/useBattleDirector.ts";
import {
  ActionIcon,
  preloadMotion,
} from "../presentation/Motion.tsx";
import { eventDuration } from "../presentation/motion.ts";
import { BattleEffects } from "../presentation/BattleEffects.tsx";
import { StatusIcons } from "../presentation/StatusIcons.tsx";
import { BattleStatReadout } from "../presentation/BattleStatReadout.tsx";
import { BattleLog } from "../presentation/BattleLog.tsx";
import {TimelinePages} from "../presentation/TimelinePages.tsx";
import { BattleCommandMenu } from "../presentation/BattleCommandMenu.tsx";
import { EnemyCommandMenu } from "../presentation/EnemyCommandMenu.tsx";
import { menuForTurn, enterCommandMenu, backCommandMenu, adjustCommandBP, type CommandBranch, type CommandMenuState } from "../presentation/battleCommandMenu.ts";
import {
  feedbackFor,
  theatreActionIcon,
  theatreEffectFor,
  type BattleBeat,
} from "../presentation/battleBeats.ts";
import "../presentation/battle-theatre.css";
import { resourceEncounter, finalEncounter } from "../game/dungeons.ts";
import { apThreshold } from "../game/abnormality.ts";
import { ppCapacity, confirmedById } from "../game/confirmedSkills.ts";
import { bossAppearance } from "../presentation/enemyArt.ts";
import {
  commandError,
  isBroken,
  availableBattleSkills,
  isDirectBattleSkill,
  battleSkillCost,
  skillBook,
  type BattleState,
  type Command,
  type VisualEvent,
  type Unit,
  type BuffId,
} from "../game/battle.ts";
import { battleMedicines as medicines } from "../game/camp/medicineEffects.ts";
import { jobSkills } from "../game/camp/jobData.ts";
import { medicineEffects } from "../game/camp/medicineEffects.ts";
import "./battle-stage.css";
import "./battle-status-strip.css";
import "../../public/action-icons.css";
const weaknessIconFiles: Record<string, string> = {
  剑: "sword",
  枪: "spear",
  弓: "bow",
  扇: "fan",
  斧: "axe",
  杖: "staff",
  火: "fire",
  水: "water",
  木: "wood",
  风: "wind",
  土: "earth",
  雷: "thunder",
};
export const intentInfo: Record<string, { tag: string; detail: string }> = {
  矛刺: { tag: "单体 · 枪", detail: "随机一名存活角色受到K1.0物理伤害。" },
  蓄矛: { tag: "蓄势", detail: "准备下一次行动的蓄势重刺；Break取消蓄势。" },
  蓄势重刺: { tag: "单体 · 枪", detail: "随机一名存活角色受到K1.6物理伤害。" },
  护库架盾: {
    tag: "友军 · 防护",
    detail:
      "优先为存活首领、其次为矛卫施加物防提升2轮；无队友则保护自身。使用既有固定强度Buff，不转移攻击目标。",
  },
  盾击: { tag: "单体 · 物理", detail: "随机一名存活角色受到K0.9物理伤害。" },
  核账: {
    tag: "强化 · 蓄势",
    detail: "物攻提升2轮，准备重剑清算。半血阶段另获得属防提升2轮。",
  },
  重剑清算: {
    tag: "危险 · 随机两人",
    detail: "随机2名不同存活角色，各受到K1.6物理伤害。Break取消待发重剑。",
  },
  金砂迸射: {
    tag: "全体 · 土",
    detail:
      "全体土属性魔法K0.9；每个未被回避的Hit向存活目标输入25混乱AP，按目标韧性确定性换层。25为Demo临时参数。",
  },
  铸金斩: { tag: "单体 · 物理", detail: "随机一名存活角色受到K1.3物理伤害。" },
};
export function Gauge({
  value,
  max,
  label,
  tone = "hp",
}: {
  value: number;
  max: number;
  label: string;
  tone?: string;
}) {
  return (
    <div className={`gauge ${tone}`}>
      <span className="gauge-label" aria-label={label}>
        {Array.from(label).map((letter,index)=><span key={index} aria-hidden="true">{letter}</span>)}
      </span>
      <div className="gauge-track">
        <i
          style={{
            width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`,
          }}
        />
      </div>
      <b>
        {Math.floor(value)}
        <small> / {max}</small>
      </b>
    </div>
  );
}
function APGauge({ unit }: { unit: Unit }) {
  const max = apThreshold(unit);
  const value = Math.max(0, Math.min(100, unit.ap / max * 100));
  return (
    <div className="ap-readout"
      title={`AP ${unit.ap}/${max}；共享异常积累。达到阈值生成最后一次有效输入类型的异常层，保留余量；净化不清AP。${unit.apLastType ? `最近输入：${unit.apLastType}（不是锁定下一次异常）。` : ""}`}>
      <span className="ap-label">AP</span>
      <div className={`ap-meter${value === 100 ? " full" : ""}`}
        role="progressbar" aria-label={`${unit.name} AP`}
        aria-valuenow={Math.max(0,Math.min(unit.ap,max))} aria-valuemin={0} aria-valuemax={max}
        aria-valuetext={`${unit.ap}/${max}`}>
        <span className="ap-meter-track" aria-hidden="true"><i style={{width:`${value}%`}}/></span>
        {value === 100 ? (
          <svg className="ap-full-star" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
            <path d="M18 6L21.5 14.5L30 18L21.5 21.5L18 30L14.5 21.5L6 18L14.5 14.5Z"/>
          </svg>
        ) : <span className="ap-percentage">{Math.floor(value)}%</span>}
      </div>
    </div>
  );
}
function PPGauge({ unit }: { unit: Unit }) {
  const capacity=ppCapacity(unit),points=Math.max(0,Math.min(capacity,unit.latent));
  const value = points/capacity*100;
  return (
    <div className="pp-readout" title={`PP ${Math.floor(points)}/${capacity}${value === 100 ? " · 可使用专属指令" : ""}`}>
      <span className="pp-label">PP</span>
      <div className={`pp-meter${value === 100 ? " ready" : ""}`}
        role="progressbar" aria-label={`${unit.name} PP`}
        aria-valuenow={points} aria-valuemin={0} aria-valuemax={capacity}
        aria-valuetext={`${Math.floor(points)}/${capacity}${value === 100 ? "，可使用专属指令" : ""}`}>
        <span className="pp-meter-track" aria-hidden="true"><i style={{width:`${value}%`}}/></span>
        {value === 100 ? (
          <svg className="pp-ready-star" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
            <path d="M18 6L21.5 14.5L30 18L21.5 21.5L18 30L14.5 21.5L6 18L14.5 14.5Z"/>
          </svg>
        ) : <span className="pp-percentage">{Math.floor(value)}%</span>}
      </div>
    </div>
  );
}
export default function BattleView({
  s,
  busy,
  event,
  beat,
  effectProgress,
  sceneCheckpoint,
  onSceneCheckpoint,
  focus,
  layoutGateRef,
  onInputReady,
  onResultReady,
  settlementReady = true,
  resultSaveError,
  onRetryResultSave,
  onCommand,
  onEnemy,
  onCodex,
  onFinish,
}: {
  s: BattleState;
  busy: boolean;
  event: VisualEvent | null;
  beat?: BattleBeat | null;
  /** Read-only frame inspection in the standalone theatre, never persisted. */
  effectProgress?: number;
  /** Deprecated caller props are ignored, never used to alter battle playback. */
  speed?: number;
  onSpeed?: () => void;
  reducedMotion?: boolean;
  onMotion?: () => void;
  sceneCheckpoint?: BattleSceneCheckpoint;
  onSceneCheckpoint?: (checkpoint: BattleSceneCheckpoint) => Promise<void>;
  focus?: BattleFocus;
  layoutGateRef?: MutableRefObject<BattleLayoutGate | null>;
  onInputReady?: (ready: boolean) => void;
  onResultReady?: () => void;
  /** Formal settlement waits for its persisted terminal timestamp; theatre has no save. */
  settlementReady?: boolean;
  resultSaveError?: string;
  onRetryResultSave?: () => void;
  onCommand: (c: Command) => void;
  onEnemy: () => void;
  onCodex: () => void;
  onFinish: () => void;
}) {
  const speed = 1, reducedMotion = false;
  const [layoutMoving,setLayoutMoving] = useState(false);
  const [highlightedId,setHighlightedId] = useState<string | null>(null);
  const [info,setInfo] = useState<"skills" | "codex" | null>(null);
  const [infoEnemyId,setInfoEnemyId] = useState<string|null>(null);
  const scene = useBattleScene(sceneCheckpoint ?? advanceOpening(createSceneCheckpoint(sceneKeyFor(s)),2500), onSceneCheckpoint);
  const ready = isBattleInputReady({phase:scene.checkpoint.phase,busy,layoutMoving,outcome:s.outcome});
  const commandsLocked = !ready;
  const resultVisible = scene.checkpoint.phase === "main" && !busy && !layoutMoving;
  const finishReady = resultVisible && settlementReady;
  useEffect(() => { onInputReady?.(ready); }, [ready,onInputReady]);
  useEffect(() => { if(resultVisible && s.outcome !== "active") onResultReady?.(); },[resultVisible,s.outcome,onResultReady]);
  const [mode, setMode] = useState<"attack" | "skill" | "item">("attack");
  const [bp, setBP] = useState(0);
  const [weapon, setWeapon] = useState("");
  const [skill, setSkill] = useState("");
  const [item, setItem] = useState("hp");
  const [usePP, setUsePP] = useState(false);
  const [multiSelection,setMultiSelection]=useState<{context:string;ids:string[]}>({context:"",ids:[]});
  const [orderedNodes,setOrderedNodes]=useState<string[]>([]);
  const [cardSelection,setCardSelection] = useState<{context:string;id:string}|null>(null);
  const [selectedBuff, setSelectedBuff] = useState<BuffId>("物攻提升");
  const [menuState,setMenuState] = useState<CommandMenuState>({owner:"",branch:null,chosen:false});
  const commandOwner=`${s.id}:${s.current[0]?.id??"none"}`;
  const menu=menuForTurn(menuState,commandOwner);
  const appearance = bossAppearance(s.finale ? "final" : s.resource);
  const encounter = s.finale
    ? finalEncounter(s.finale.stage)
    : resourceEncounter(s.resource ?? "coin", s.difficulty ?? "normal");
  useEffect(
    () =>
      preloadMotion([
        ...s.party.map((u) => u.id),
        ...s.enemies.map((u) =>
          u.id === "guardian" ? appearance.unitArtId : u.id,
        ),
      ]),
    [
      s.party.map((u) => u.id).join(","),
      s.enemies.map((u) => u.id).join(","),
      appearance.unitArtId,
    ],
  );
  const liveEvents = beat?.events ?? (event ? [event] : []);
  const actionStart = liveEvents.find(value=>value.type==="SkillStart");
  const token = `${event?.sequence ?? 0}-${event?.target ?? ""}-${event?.type ?? ""}`;
  const duration =
    beat?.duration ?? (event ? eventDuration(event, speed, false) : 440);
  const unitEvents = (u: Unit) =>
    liveEvents.filter(
      (e) => e.target === u.id && !(e.type === "KO" && (e.hpAfter ?? 0) > 0),
    );
  const actionIcon = (u: Unit) => {
    const start = unitEvents(u).find((e) => e.type === "SkillStart") ?? null;
    const icon = theatreActionIcon(start);
    return !reducedMotion && icon && start ? (
      <ActionIcon
        icon={icon}
        token={token}
        duration={duration}
        reduced={reducedMotion}
      />
    ) : null;
  };
  const fx = (u: Unit) => {
    const events = unitEvents(u);
    const effects = [
      ...new Set(events.map(theatreEffectFor).filter((e): e is string => !!e)),
    ];
    // Weakness and critical have readable labels; avoid stacking three large
    // impact drawings over the same hit. Break alone merits a second layer.
    const visible = effects.filter(
      (e) =>
        effects.length === 1 ||
        !["weak", "critical", "shield", "ko"].includes(e),
    );
    return !reducedMotion && visible.length ? (
      <BattleEffects
        effects={visible}
        token={token}
        duration={duration}
        progress={effectProgress}
      />
    ) : null;
  };
  const all = [...s.party, ...s.enemies],
    actor = s.party.find((u) => u.id === s.current[0]?.unitId),
    enemy =
      s.enemies.find((u) => u.id === cardSelection?.id && u.hp > 0) ??
      s.enemies.find((u) => u.hp > 0) ??
      s.enemies[0];
  const waitingActor =
    s.outcome === "active" && scene.checkpoint.phase === "main" && !busy && actor && actor.hp > 0 ? actor.id : null;
  const infoActor = s.party.find(unit=>unit.id===(focus?.reactionActorId ?? focus?.rootActorId)) ?? actor ?? s.party[0];
  const infoEnemy = s.enemies.find(unit=>unit.id===infoEnemyId) ?? enemy;
  const selectedWeapon = (menu.branch==="pp"&&actor?.id==="warrior"&&["剑","枪","弓","扇","斧","杖"].includes(weapon))||actor?.weapons.includes(weapon)
    ? weapon
    : actor?.weapons[0];
  const selectedSkill =
    actor && (availableBattleSkills(actor).includes(skill)||menu.branch==="pp"&&skill===`${actor.id}-pp`) && skillBook[skill]
      ? skill
      : actor
        ? (availableBattleSkills(actor).find((id) => skillBook[id]) ?? "")
        : "";
  const targetContext=`${commandOwner}:${menu.branch}:${mode}:${mode==="attack"?selectedWeapon:mode==="skill"?selectedSkill:item}:${menu.branch==="pp"?selectedWeapon:""}`;
  const target=cardSelection?.context===targetContext?cardSelection.id:undefined;
  const selectedTarget =
    mode === "item" || (mode === "skill" && skillBook[selectedSkill]?.ally)
      ? s.party.some((u) => u.id === target)
        ? target
        : actor?.id
      : s.enemies.some((u) => u.id === target && u.hp > 0)
        ? target
        : enemy.id;
  const bpLimit=actor?.statuses["凝滞"]?0:Math.min(3,actor?.bp??0);
  const usedBP = mode === "item" ? 0 : adjustCommandBP(bp,0,bpLimit);
  const command: Command = {
    usePP: menu.branch==="pp"&&usePP,
    type: mode,
    bp: usedBP,
    weapon: selectedWeapon,
    skill: selectedSkill,
    item,
    target: selectedTarget,
    buff: selectedBuff,
    order:selectedSkill==="dancer-pp"?orderedNodes.filter(id=>s.next.some(n=>n.id===id)).slice(0,3+usedBP):undefined,
  };
  const eligibleTargets = menu.chosen ? legalCardTargets(s,command) : [];
  if (eligibleTargets.length) command.target = recommendedCardTarget(s,command,target);
  const multiple=mode==="skill"?skillBook[selectedSkill]?.targetCount:undefined;
  if(multiple){
    const chosen=multiSelection.context===targetContext?multiSelection.ids.filter(id=>eligibleTargets.includes(id)).slice(0,multiple[usedBP]):[];
    command.targets=chosen.length?chosen:selectedSkill==="warrior-ex1"&&command.target?[command.target]:[];
    command.target=command.targets[0]??command.target;
  }
  const error = eligibleTargets.length&&!command.target ? "请点击一张合法目标卡片。" : commandError(s, command);
  function itemUnavailable(id:string): string | null {
    const candidates=s.party.map(unit=>({...command,type:"item" as const,item:id,bp:0,target:unit.id}));
    return candidates.some(candidate=>!commandError(s,candidate))?null:"当前没有合法使用目标或不满足使用条件";
  }
  function selectTargetCard(id:string) {
    if(ready&&menu.chosen&&eligibleTargets.includes(id)){
      setCardSelection({context:targetContext,id});
      if(multiple)setMultiSelection(previous=>{
        const ids=previous.context===targetContext?previous.ids:[];
        return {context:targetContext,ids:ids.includes(id)?ids.filter(v=>v!==id):[...ids,id].slice(-multiple[usedBP])};
      });
    }
  }
  function submitCommand(value: Command) {
    if (ready && actor && actor.hp > 0) onCommand(value);
  }
  function openCommandBranch(branch:CommandBranch) {
    if(!ready)return;
    setMenuState(enterCommandMenu(commandOwner,branch));
    setCardSelection(null);
    setBP(0);setUsePP(branch==="pp");
    setOrderedNodes([]);setMultiSelection({context:"",ids:[]});
    if(branch==="attack"||branch==="skill")setMode(branch);
    if(branch==="item"||branch==="pp")setMode(branch==="pp"&&actor?.id!=="apothecary"?"skill":"item");
  }
  function chooseCommand(setChoice:()=>void) {
    if(!ready)return;
    setChoice();setCardSelection(null);setMenuState({...menu,chosen:true});
  }
  // A render callback, not a nested component: icon expansion survives layout changes.
  function unitReadout(unit: Unit) {
    const previewSkill = unit.id===waitingActor&&mode==="skill" ? skillBook[selectedSkill] : undefined;
    const readoutWeapon = unit.id===waitingActor&&mode==="attack" ? selectedWeapon
      : previewSkill ? previewSkill.weapon ?? (!previewSkill.magic&&!previewSkill.ally ? unit.weapons[0] : undefined)
      : undefined;
    if (s.enemies.includes(unit)) return (
        <article
          className={`battle-status-unit enemy-summary ${highlightedId===unit.id ? "card-status-highlight" : ""} ${unit.hp === 0 ? "ko" : ""}`}
          data-summary-unit={unit.id} tabIndex={0}
          onMouseEnter={()=>setHighlightedId(unit.id)} onMouseLeave={()=>setHighlightedId(null)}
          onFocusCapture={()=>setHighlightedId(unit.id)} onBlurCapture={()=>setHighlightedId(null)}
        >
          <div className="status-portrait-column">
            <StatusIcons unit={unit} round={s.round} collapsible expandedMode="popover" />
          </div>
          <div className="status-readout">
            <div className="enemy-name">
              <h2>
                {unit.name}
              </h2>
              <APGauge unit={unit} />
              <BattleStatReadout unit={unit} />
              <button
                className={`intent ${liveEvents.some((e) => e.type === "IntentChange" && e.target === unit.id) ? "intent-updated" : ""}`}
                onClick={()=>{setInfoEnemyId(unit.id);setInfo("codex");}}
                title={`${isBroken(s, unit) ? "恢复后的意图" : "LIVE INTENT"}：${unit.intent}`}
              >
                <b>{unit.intent}</b>
              </button>
            </div>
            <Gauge value={unit.hp} max={unit.maxHp} label="HP" />
            <div className="enemy-details">
              <strong
                className={`shield ${isBroken(s, unit) ? "shattered" : ""}`}
                aria-label={
                  isBroken(s, unit)
                    ? "BREAK：护盾已击破"
                    : `护盾：${unit.shield}`
                }
              >
                <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
                  <path
                    className="shield-outline"
                    d="M3 3Q8 4 14 2Q20 4 25 3V11C25 18 20 23 14 27C8 23 3 18 3 11Z"
                  />
                  <path
                    className="shield-inner-rim"
                    d="M6 6Q10 7 14 5Q18 7 22 6V11C22 16 19 21 14 24C9 21 6 16 6 11Z"
                  />
                  {isBroken(s, unit) && (
                    <path
                      className="shield-cracks"
                      d="M10 3L14 6L11 9 M17 20L14 23L16 25 M3 11L7 13L5 17 M25 9L21 12L24 15"
                    />
                  )}
                </svg>
                <span className="shield-value">
                  {isBroken(s, unit) ? "BREAK" : unit.shield}
                </span>
              </strong>
              <div className="weaknesses">
                {unit.weaknesses.map((w, i) => {
                  const known = s.discoveredWeaknesses.includes(w);
                  return (
                    <span
                      key={w}
                      title={known ? w : "未发现弱点"}
                      aria-label={`弱点${i + 1}：${known ? w : "未发现"}`}
                    >
                      {known && weaknessIconFiles[w] ? (
                        <img
                          src={`/jrpg/assets/weakness-icons/pixel-v1/${weaknessIconFiles[w]}.webp`}
                          alt={w}
                          width={24}
                          height={24}
                          draggable={false}
                        />
                      ) : known ? (
                        w
                      ) : (
                        "?"
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </article>
    );
    return (
          <article
            key={unit.id}
            className={`battle-status-unit hero-summary ${highlightedId===unit.id ? "card-status-highlight" : ""} ${actor?.id === unit.id ? "acting" : ""} ${waitingActor === unit.id ? "waiting-command" : ""} ${unit.hp === 0 ? "ko" : ""} ${event?.target === unit.id && event.type === "Damage" ? "hit-flash" : ""}`}
            data-summary-unit={unit.id} tabIndex={0}
            onMouseEnter={()=>setHighlightedId(unit.id)} onMouseLeave={()=>setHighlightedId(null)}
            onFocusCapture={()=>setHighlightedId(unit.id)} onBlurCapture={()=>setHighlightedId(null)}
            aria-label={waitingActor === unit.id ? `${unit.name}等待指令` : undefined}
          >
            <div className="status-portrait-column">
              <StatusIcons unit={unit} round={s.round} collapsible expandedMode="popover" />
            </div>
            <div className="status-readout">
              <div className="hero-heading">
                <b>{unit.name}</b>
                <APGauge unit={unit} />
                <span className="bp">
                  <span>BP</span>
                  <span className="bp-pips" role="img" aria-label={`BP ${unit.bp}/5`}>
                    {Array.from({length:5},(_,index)=><i key={index} className={`bp-pip${index<unit.bp?" filled":""}`} aria-hidden="true" />)}
                  </span>
                </span>
                <PPGauge unit={unit} />
              </div>
              <Gauge label="HP" value={unit.hp} max={unit.maxHp} />
              <Gauge label="SP" value={unit.sp} max={unit.maxSp} tone="sp" />
              <BattleStatReadout unit={unit} weapon={readoutWeapon} />
            </div>
            {(unit.hp === 0 || (actor?.id === unit.id && busy)) && (
              <span className="hero-condition">
                {unit.hp === 0 ? "倒地" : "行动中"}
              </span>
            )}
          </article>
    );
  }
  function unitFeedback(u: Unit) {
    const events = unitEvents(u).filter(
      (e) => !["SkillStart", "IntentChange", "TargetChange"].includes(e.type),
    );
    const feedback = feedbackFor(events);
    return events.length ? (
      <span
        key={token}
        className={`battle-feedback feedback-${feedback.tone} ${events.some((e) => e.type === "Break") ? "feedback-break" : ""}`}
      >
        <strong>{feedback.headline}</strong>
        <span className="feedback-tags">
          {feedback.tags.map((t) => (
            <small key={t}>{t}</small>
          ))}
        </span>
      </span>
    ) : null;
  }
  const ppNames:Record<string,string>={warrior:"通透世界",dancer:"完美交响",merchant:"干劲",scholar:"魔法收敛化",thief:"残影",cleric:"弱点启示",hunter:"连令",apothecary:"节约"};
  const actorCommands = actor&&waitingActor ? <BattleCommandMenu
    menu={menu} locked={commandsLocked} pp={s.current[0]?.commandChain?0:actor.latent/ppCapacity(actor)*100}
    onEnter={openCommandBranch}
    onBack={()=>{if(ready)setMenuState(backCommandMenu(menu));}}
    onAdjustBP={menu.chosen&&(menu.branch==="attack"||menu.branch==="skill"||menu.branch==="pp")&&mode!=="item"&&bpLimit>0
      ?delta=>{if(ready)setBP(value=>adjustCommandBP(value,delta,bpLimit));}:undefined}
    options={<>
      {menu.branch==="attack"&&actor.weapons.map(w=><button type="button" key={w}
        onClick={()=>chooseCommand(()=>setWeapon(w))}>{w}攻击</button>)}
      {menu.branch==="skill"&&<>
        <button type="button" className="command-help" onClick={()=>setInfo("skills")}>技能说明</button>
        {availableBattleSkills(actor).map(id=><button type="button" key={id} disabled={!skillBook[id]}
          onClick={()=>chooseCommand(()=>setSkill(id))}>
          <span>{skillBook[id]?.name??jobSkills.find(value=>value.id===id)?.name??id}</span>
          <small>{skillBook[id]?`${battleSkillCost(actor,id)} SP`:"待接入"}</small>
        </button>)}
        {!availableBattleSkills(actor).length&&<p>尚未学习可用技能。</p>}
      </>}
      {(menu.branch==="item"||(menu.branch==="pp"&&actor.id==="apothecary"))&&<>
        {menu.branch==="pp"&&<p>节约：消耗100 PP，本次使用药品不消耗库存。</p>}
        {medicines.filter(m=>(s.inventory[m.id]??0)>0).map(m=><button type="button" key={m.id}
          disabled={!!itemUnavailable(m.id)} title={itemUnavailable(m.id)??m.description} onClick={()=>chooseCommand(()=>setItem(m.id))}>
          <span>{m.name}</span><small>×{s.inventory[m.id]??0}</small>
        </button>)}
        {!medicines.some(m=>(s.inventory[m.id]??0)>0)&&<p>背包没有可用药品。</p>}
      </>}
      {menu.branch==="pp"&&actor.id==="warrior"&&<>
        <p>通透世界：选择武器，再选择攻击技能。本次SP0，BP正常支付。</p>
        {(["剑","枪","弓","扇","斧","杖"]).map(w=><button type="button" key={w} aria-pressed={selectedWeapon===w} onClick={()=>setWeapon(w)}>转为{w}{selectedWeapon===w?" ✓":""}</button>)}
        {availableBattleSkills(actor).filter(isDirectBattleSkill).map(id=><button type="button" key={id} onClick={()=>chooseCommand(()=>{setMode("skill");setSkill(id);})}>{skillBook[id].name} · 0 SP</button>)}
      </>}
      {menu.branch==="pp"&&["dancer","cleric","hunter"].includes(actor.id)&&<>
        <p>{confirmedById[`${actor.id}-pp`].description}</p>
        <button type="button" onClick={()=>chooseCommand(()=>{setMode("skill");setSkill(`${actor.id}-pp`);})}>{ppNames[actor.id]}</button>
      </>}
      {menu.branch==="pp"&&!["warrior","dancer","cleric","hunter","apothecary"].includes(actor.id)&&<>
        <button type="button" disabled>{ppNames[actor.id]??"专属指令"} · 待接入</button>
        <p>该职业PP指令尚未接入战斗引擎；不会扣除PP，也不以奥义或EX替代。</p>
      </>}
      {menu.branch==="defend"&&<>
        <p>防御至下次本人行动开始，承伤减半，并按既有规则进入下一轮前置组。</p>
        <button type="button" onClick={()=>submitCommand({type:"defend"})}>确认防御</button>
      </>}
      {menu.branch==="retreat"&&<>
        <p>{s.sandbox?"退出沙盒重战，不消耗正式库存。":"撤退视为失败；下次非沙盒挑战扣20体力并自动恢复八人。"}</p>
        <button type="button" className="danger-text" onClick={()=>submitCommand({type:"retreat"})}>确认撤退</button>
      </>}
    </>}
    details={<>
      <p className="command-picked">{mode==="attack"?`${selectedWeapon}攻击`:mode==="skill"?skillBook[selectedSkill]?.name:
        `${menu.branch==="pp"?"节约 · ":""}${medicines.find(m=>m.id===item)?.name??item}`}</p>
      <div className="actor-command-controls">
        {multiple&&<p>已选：{command.targets?.map(id=>all.find(u=>u.id===id)?.name).join("、")||"尚未选择"}（点击卡片，可再次点击取消）</p>}
        {selectedSkill==="dancer-pp"&&mode==="skill"&&<div className="command-special-controls" role="group" aria-label="次轮顺序选择">
          <p>按顺序选择{Math.min(3+usedBP,s.next.length)}个节点：{command.order?.map(id=>all.find(u=>u.id===s.next.find(n=>n.id===id)?.unitId)?.name).join(" → ")||"未选择"}</p>
          {s.next.map(node=><button type="button" key={node.id} disabled={command.order?.includes(node.id)||command.order!.length>=Math.min(3+usedBP,s.next.length)} onClick={()=>setOrderedNodes(ids=>[...ids,node.id])}>{all.find(u=>u.id===node.unitId)?.name} · {node.kind==="normal"?"普通节点":"额外节点"}</button>)}
          <button type="button" disabled={!orderedNodes.length} onClick={()=>setOrderedNodes(ids=>ids.slice(0,-1))}>撤销最后一项</button>
        </div>}
        {eligibleTargets.length>0&&<p className="command-card-target" aria-live="polite">
          {command.target?`${selectedCardTarget(eligibleTargets,target)?"目标":"默认目标"}：${all.find(unit=>unit.id===command.target)?.name}（点击其他合法卡片可切换）`:"点击合法目标的卡片选择目标"}
        </p>}
        {mode==="skill"&&skillBook[selectedSkill]?.effect==="steal"&&<label>夺取强化
          <select aria-label="夺取强化" value={selectedBuff} onChange={event=>setSelectedBuff(event.target.value as BuffId)}>
            {(["物攻提升","属攻提升","物防提升","属防提升","速度提升"] as BuffId[]).map(id=>
              <option key={id} value={id} disabled={!s.enemies.find(unit=>unit.id===command.target)?.buffs[id]}>{id}</option>)}
          </select>
        </label>}
        {mode!=="item"&&<div className="command-bp-field" role="group" aria-label="BP增幅"
          title={actor.statuses["凝滞"]?"凝滞：不能投入BP":`本次最多投入${bpLimit} BP`}>
          <span>BP增幅</span>
          <div className="command-bp-stepper">
            <button type="button" aria-label="减少BP增幅" disabled={commandsLocked||usedBP<=0}
              onClick={()=>{if(ready)setBP(value=>adjustCommandBP(value,-1,bpLimit));}}>−</button>
            <output aria-label="当前BP增幅" aria-live="polite">{usedBP} BP</output>
            <button type="button" aria-label="增加BP增幅" disabled={commandsLocked||usedBP>=bpLimit}
              onClick={()=>{if(ready)setBP(value=>adjustCommandBP(value,1,bpLimit));}}>＋</button>
          </div>
        </div>}
        <button type="button" className="primary" disabled={commandsLocked||!!error} onClick={()=>{
          if(ready&&!error){submitCommand(command);setBP(0);setUsePP(false);}
        }}>确认行动</button>
      </div>
      <p className="command-hint">{error??(mode==="attack"?`普通攻击 ${1+usedBP} 段；命中弱点逐Hit削盾。`:
        mode==="item"?medicines.find(m=>m.id===item)?.description:
        confirmedById[selectedSkill]?`${confirmedById[selectedSkill].description} ${confirmedById[selectedSkill].boost}`:
        skillBook[selectedSkill]?.ap?`${skillBook[selectedSkill].ap!.type} AP +${skillBook[selectedSkill].ap!.amounts[usedBP]}`:
        skillBook[selectedSkill]?.self?"作用于自己。":skillBook[selectedSkill]?.all?"作用于全体合法目标。":
        skillBook[selectedSkill]?.random?"按技能规则随机选择目标。":"点击战场中的合法目标卡片选择目标。")}</p>
    </>}
  /> : null;
  const enemyActor=s.outcome==="active"&&!actor?s.enemies.find(unit=>unit.id===s.current[0]?.unitId&&unit.hp>0):undefined;
  const enemyCommands=enemyActor?<EnemyCommandMenu intent={enemyActor.intent} locked={commandsLocked}
    onExecute={()=>{if(ready)onEnemy();}}/>:null;
  return (
    <BattleScene appearance={appearance} checkpoint={scene.checkpoint} state={s}
      error={scene.error} onRetry={scene.retry} duration={duration}
      header={
      <div className="battle-heading">
        <div>
          <span className="eyebrow">
            {s.finale
              ? `双队挑战 · 第${s.finale.stage}场 · 独立AI待接入`
              : s.difficulty === "advanced"
                ? "进阶资源门 · 独立AI待接入"
                : "普通资源门"}
          </span>
          <h1>
            {encounter.name} <small>{"★".repeat(encounter.stars)}</small>
          </h1>
        </div>
        <div className="inline">
          <span className="badge">
            {s.sandbox ? "沙盒重战 · 不消耗库存" : "正式挑战"}
          </span>
          <a
            className="motion-gallery-link"
            href="/jrpg/battle-theatre.html"
            target="_blank"
            rel="noreferrer"
          >
            战斗演出预览 ↗
          </a>
        </div>
      </div>
      }
      closing={
        s.outcome!=="active" && resultVisible ? <div className={`battle-closing outcome-${s.outcome}`}>
          <BattleEntryCurtains />
          <div className="battle-closing-result">
          <small>闭幕</small>
          <strong>{s.outcome==="victory"?"胜利":s.outcome==="defeat"?"败北":"撤退"}</strong>
          <p>{s.outcome==="victory"?"前路已开，灯火仍在。":"重整行装，再次出发。"}</p>
          <button className="primary" disabled={!finishReady} onClick={()=>{if(finishReady)onFinish();}}>
            {s.finale?.stage===1&&s.outcome==="victory"?"进入第二场 →":"查看战斗结算 →"}
          </button>
          {!settlementReady&&(resultSaveError?<div role="alert">
            <span>{resultSaveError}</span>
            <button type="button" disabled={!resultVisible} onClick={()=>{if(resultVisible)onRetryResultSave?.();}}>重试保存</button>
          </div>:<span role="status">正在保存战斗结束时间…</span>)}
          </div>
        </div> : null
      }
      battleLog={<BattleLog state={s}/>}>
      <div className="timelines" aria-label="双轮行动顺序">
        {[s.current, s.next].map((nodes, i) => (
          <div className="timeline" key={i}>
            <span className="timeline-title">
              {i ? "次轮" : "本轮"}
              <b>{s.round + i}</b>
            </span>
            <TimelinePages round={s.round} label={i?"次轮":"本轮"}>
              {nodes.map((n, j) => {
                const u = all.find((u) => u.id === n.unitId)!;
                return (
                  <span
                    key={n.id}
                    className={`turn ${s.enemies.includes(u) ? "enemy-turn" : ""} ${!i && !j ? "current-turn" : ""}`}
                    role="img"
                    aria-label={`${u.name}${!i && !j ? "，当前行动" : ""}`}
                    aria-current={!i && !j ? "step" : undefined}
                    title={u.name}
                  >
                    <img
                      src={portraitSource(u.id,appearance)}
                      alt=""
                      width={48}
                      height={48}
                    />
                  </span>
                );
              })}
              {!nodes.length && <span className="muted">暂无行动节点</span>}
            </TimelinePages>
          </div>
        ))}
      </div>
      <BattleCardField party={s.party} enemies={s.enemies} appearance={appearance}
        enemyCommandId={enemyActor?.id} enemyCommands={enemyCommands}
        focusId={busy ? (focus?.reactionActorId ?? focus?.rootActorId ?? null) : waitingActor}
        waitingId={waitingActor} selectedTarget={command.target} legalTargets={eligibleTargets}
        inputReady={ready} highlightedId={highlightedId} onHighlight={setHighlightedId} feedbackToken={token}
        onSelect={selectTargetCard} onMoving={setLayoutMoving} gateRef={layoutGateRef}
        hitIds={liveEvents.filter(value=>value.type==="Damage").map(value=>value.target)}
        evadeIds={liveEvents.filter(value=>value.type==="Evade").map(value=>value.target)}
        actingId={actionStart?.source ?? actionStart?.target}
        supportAction={!!actionStart && (!!actionStart.supportAction || actionStart.actionKind === "item" || actionStart.actionKind === "defend")}
        status={unitReadout}
        commands={actorCommands}
        feedback={unit=><>{actionIcon(unit)}{fx(unit)}{unitFeedback(unit)}</>}>
        {beat?.actionName && <div className="battle-action-name" aria-live="polite">
          <small>{all.find(unit=>unit.id===beat.source)?.name ?? ""}</small><b>{beat.actionName}</b>
          {liveEvents.filter(value=>value.type==="TargetChange").map((value,index)=><em key={index}>{value.text}</em>)}
        </div>}
      </BattleCardField>
      {info && <BattleInfoDialog title={info==="skills"?"技能说明":"首领图鉴"} onClose={()=>{setInfo(null);setInfoEnemyId(null);}}>
        {info==="skills" ? (infoActor ? availableBattleSkills(infoActor) : []).map(id=><div className="codex-entry" key={id}>
          <h3>{skillBook[id]?.name ?? jobSkills.find(value=>value.id===id)?.name ?? id}</h3>
          <p>{skillBook[id] ? `消耗 ${skillBook[id].sp} SP` : "战斗效果待接入"}</p>
          <p>{skillBook[id]?.ap ? `${skillBook[id].ap!.type} AP输入：${skillBook[id].ap!.amounts.join(" / ")}（0～3 BP）。` : skillBook[id]?.all ? "作用于全体合法目标。" : skillBook[id]?.self ? "作用于自己。" : skillBook[id]?.random ? "按既有规则选择随机目标。" : "作用于一个合法目标。"}</p>
          {skillBook[id]?.ks && <p>伤害／效果系数：{skillBook[id].ks.join(" / ")}（0～3 BP）；最终按现有战斗规则计算。</p>}
        </div>) : <>
          <h3>{infoEnemy.name}</h3><p>当前意图：{infoEnemy.intent}。{isBroken(s,infoEnemy)?"恢复后执行此意图。":""}</p>
          <p>已发现弱点：{infoEnemy.weaknesses.map(value=>s.discoveredWeaknesses.includes(value)?value:"?").join(" / ")}</p>
          {Object.entries(intentInfo).map(([name,data])=><div className="codex-entry" key={name}><h3>{name}</h3><p>{data.detail}</p></div>)}
          <p>这些是当前Demo已接入的机制资料；其他副本的独立AI仍沿用现有原型。</p>
        </>}
      </BattleInfoDialog>}
    </BattleScene>
  );
}
