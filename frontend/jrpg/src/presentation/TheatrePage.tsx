import { useRef, useState } from "react";
import { mountGame } from "./GameViewport.tsx";
import BattleView from "../features/BattleView.tsx";
import { resolveCommand, resolveEnemy, addAbnormalityAP, type BattleState, type Command, type VisualEvent } from "../game/battle.ts";
import { appendBattleLog } from "../game/battleLog.ts";
import { abnormalityTypes, cleanseAbnormalities, type StatusId } from "../game/abnormality.ts";
import { type Resource } from "../game/economy.ts";
import { createTheatreBattle as fresh, withManyTheatreStatuses, withTheatrePP, withConfirmedTheatreSkills, type WeaknessPreview, type StatusPreview } from "./theatreFixtures.ts";
import { dungeons } from "../game/dungeons.ts";
import { useBattleDirector, type BattleLayoutGate } from "./useBattleDirector.ts";
import { createSceneCheckpoint, sceneKeyFor } from "./battleSceneState.ts";
import { BattleEffects } from "./BattleEffects.tsx";
import { buildBattleBeats } from "./battleBeats.ts";
import { snapshotAtBeat } from "./battlePlayback.ts";
import { theatreEffects } from "./battleVfx.ts";
import { effectNames } from "./motion.ts";
import "../style.css";
import "../traveler-theme.css";
import "./motion.css";
import "./battle-theatre.css";
import "./theatre-page.css";

const requestedPreview=new URLSearchParams(window.location.search).get("weakness");
const initialPreview:WeaknessPreview=requestedPreview==="weapons"||requestedPreview==="elements" ? requestedPreview : "default";
const initialStatuses:StatusPreview=new URLSearchParams(window.location.search).get("statuses")==="many" ? "many" : "default";
const confirmedPreview=new URLSearchParams(window.location.search).get("skills")==="confirmed";
const extraNames:Record<string,string>={physical:"剑击",spear:"枪击",bow:"箭击",fan:"扇击",axe:"斧击",staff:"杖击",evade:"回避",critical:"会心",debuff:"削弱",ko:"倒地",shield:"防御"};
const names=(key:string)=>extraNames[key]??effectNames[key]??key;
function TheatrePage() {
  const [resource,setResource]=useState<Resource | "final">("coin");
  const [group,setGroup]=useState(0);
  const [weaknessPreview,setWeaknessPreview]=useState<WeaknessPreview>(initialPreview);
  const [statusPreview,setStatusPreview]=useState<StatusPreview>(initialStatuses);
  const [battle,setBattle]=useState(()=>{const value=fresh("coin",0,initialPreview,initialStatuses);return confirmedPreview?withConfirmedTheatreSkills(value):value;});
  const [busy,setBusy]=useState(false), guard=useRef(false);
  const speed=1;
  const [sceneCheckpoint,setSceneCheckpoint]=useState(()=>createSceneCheckpoint(sceneKeyFor(battle)));
  const [fixtureVersion,setFixtureVersion]=useState(0);
  const inputReady=useRef(false), layoutGate=useRef<BattleLayoutGate|null>(null);
  const [error,setError]=useState("");
  const [apTarget,setAPTarget]=useState("guardian");
  const [apType,setAPType]=useState<StatusId>("爆破");
  const [apAmount,setAPAmount]=useState(60);
  const [apResult,setAPResult]=useState("");
  const [ppTarget,setPPTarget]=useState("all");
  const [ppAmount,setPPAmount]=useState("100");
  const [ppResult,setPPResult]=useState("");
  const [progress,setProgress]=useState(45);
  const [tab,setTab]=useState<"battle"|"drawings">("battle");
  const [reviewEvents,setReviewEvents]=useState<VisualEvent[]|null>(null);
  const [reviewIndex,setReviewIndex]=useState(0);
  const [latestEvents,setLatestEvents]=useState<VisualEvent[]>([]);
  const [latestBefore,setLatestBefore]=useState<BattleState|null>(null);
  const [inspecting,setInspecting]=useState(false);
  const director=useBattleDirector();
  async function perform(command?:Command) {
    if(guard.current || !inputReady.current) return;
    guard.current=true; setBusy(true); setError(""); setReviewEvents(null); setInspecting(false);
    try {
      const before=battle;
      const result=command?resolveCommand(before,command):resolveEnemy(before);
      setLatestBefore(before);
      setLatestEvents(result.events);
      director.hold(before);
      await director.play(before,result.events,{
        nextFocusId:result.state.outcome==="active" ? result.state.party.find(unit=>unit.id===result.state.current[0]?.unitId && unit.hp>0)?.id ?? null : null,
        onFocus:(id,signal)=>layoutGate.current?.(id,signal) ?? Promise.resolve(),
      });
      setBattle(result.state);
    }catch(e){director.clear();setError(e instanceof Error?e.message:String(e));}
    finally{guard.current=false;setBusy(false);}
  }
  function reset(r=resource,g=group,p=weaknessPreview,statuses=statusPreview,stage:1|2=1) {
    if(guard.current) return;
    const basic=fresh(r,g,p,statuses,stage),next=confirmedPreview?withConfirmedTheatreSkills(basic):basic;
    setResource(r);setGroup(g);setWeaknessPreview(p);setStatusPreview(statuses);setBattle(next);
    setSceneCheckpoint(createSceneCheckpoint(sceneKeyFor(next)));setFixtureVersion(value=>value+1);
    setInspecting(false);setReviewEvents(null);setLatestEvents([]);setError("");setAPResult("");
    setPPTarget("all");setPPResult("");
  }
  function editPP(target=ppTarget,value?:number) {
    if(guard.current||inspecting||sceneCheckpoint.phase!=="main"||!inputReady.current||battle.outcome!=="active")return;
    try {
      const amount=value??(ppAmount.trim()===""?NaN:Number(ppAmount));
      const next=withTheatrePP(battle,target,amount);
      director.clear();
      setBattle(next);setReviewEvents(null);setLatestEvents([]);setLatestBefore(null);setError("");
      const affected=next.party.filter(unit=>target==="all"||unit.id===target);
      setPPResult(`已设置${target==="all"?"全体角色":affected[0].name}的PP为${affected[0].latent}%；不消耗行动，仅影响本页沙盒。`);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  function applyManyStatuses(){
    if(guard.current||inspecting||sceneCheckpoint.phase!=="main"||!inputReady.current||battle.outcome!=="active")return;
    director.clear();
    setBattle(withManyTheatreStatuses(battle));
    setReviewEvents(null);setLatestEvents([]);setLatestBefore(null);setError("");
    setAPResult("已向敌人与四位角色施加大量测试状态，每单位19个图标；保留当前血量、SP、轮次与行动队列。重复点击覆盖预制，不额外叠加。");
  }
  function editAP(mode:"input"|"cleanse"|"evade"|"threshold", threshold?:number) {
    if(guard.current || inspecting || !inputReady.current) return;
    try {
      const next=structuredClone(battle);
      const target=[...next.enemies,...next.party].find(u=>u.id===apTarget)??next.enemies[0];
      if(mode==="input") {
        const events:VisualEvent[]=[];
        const result=addAbnormalityAP(target,apType,apAmount,events);
        appendBattleLog(next,{kind:"system",round:next.round,command:"AP测试 · 施加异常积累",
          lines:events.map(e=>`${target.name}：${e.text}`)});
        setAPResult(`${target.name}：${apType} AP +${result.input}，新增${result.layers}层，余AP ${target.ap}。`);
      } else if(mode==="cleanse") {
        cleanseAbnormalities(target);
        setAPResult(`${target.name}：异常已清除，余AP ${target.ap}保留。`);
      } else if(mode==="evade") {
        target.evasionCharges++;
        setAPResult(`${target.name}：当前${target.evasionCharges}次通用回避。`);
      } else if(threshold) {
        target.tenacity=threshold;
        setAPResult(`${target.name}：韧性改为${threshold}，不立即换层，AP ${target.ap}保留。`);
      }
      setReviewEvents(null);setLatestEvents([]);setBattle(next);setError("");
    }catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  async function sample(kind:"break"|"aoe"|"evade"|"redirect"|"victory"|"defeat") {
    if(guard.current || sceneCheckpoint.phase!=="main" || inspecting || !inputReady.current) return;
    guard.current=true;setBusy(true);setReviewEvents(null);setInspecting(false);
    const before=fresh(resource,group,weaknessPreview,statusPreview,battle.finale?.stage);
    before.id=battle.id;
    const u=before.party[0], boss=before.enemies[0];
    const enemyAction=kind==="aoe"||kind==="defeat";
    const events:VisualEvent[]=[{type:"SkillStart",target:enemyAction?boss.id:u.id,source:enemyAction?boss.id:u.id,
      text:kind==="aoe"?"全体攻击演出":kind==="break"?"弱点击破演出":"结算演出",actionKind:"skill",attribute:"剑"}];
    if(kind==="aoe" || kind==="defeat") {
      for(const hero of before.party) {
        events.push({type:"Damage",target:hero.id,source:boss.id,text:"320",value:320,attribute:"土",hpAfter:kind==="defeat"?0:hero.hp-320});
        if(kind==="defeat") events.push({type:"KO",target:hero.id,text:"倒地"});
      }
    } else if(kind==="redirect") {
      const redirected=before.party[1];
      events.push({type:"TargetChange",target:u.id,source:u.id,text:`混乱 · 目标改为${redirected.name}`},
        {type:"Damage",target:redirected.id,source:u.id,text:"120",value:120,attribute:"剑",hpAfter:redirected.hp-120});
    } else if(kind==="evade") events.push({type:"Evade",target:u.id,text:"回避 · 消耗1次"});
    else {
      events.push({type:"Damage",target:boss.id,source:u.id,text:"365",value:365,attribute:"剑",hpAfter:kind==="victory"?0:boss.hp-365},
        {type:"Weak",target:boss.id,text:"WEAK · 剑"},
        {type:"ShieldDamage",target:boss.id,text:"盾 0",value:0});
      events.push(kind==="victory"?{type:"KO",target:boss.id,text:"倒地"}:{type:"Break",target:boss.id,text:"BREAK"});
    }
    setLatestEvents(events);setBattle(before);
    setLatestBefore(before);
    try {
      director.hold(before);
      await director.play(before,events,{
        nextFocusId:kind==="victory"||kind==="defeat" ? null : before.party[0]?.id ?? null,
        onFocus:(id,signal)=>layoutGate.current?.(id,signal) ?? Promise.resolve(),
      });
      const beats=buildBattleBeats(events,speed,false);
      const after=snapshotAtBeat(before,beats,beats.length-1);
      if(kind==="victory"){ after.enemies[0].hp=0;after.outcome="victory"; }
      if(kind==="defeat"){ after.party.forEach(h=>h.hp=0);after.outcome="defeat"; }
      setBattle(after);
    }finally{guard.current=false;setBusy(false);}
  }
  const reviewBeats=reviewEvents?buildBattleBeats(reviewEvents,speed,false):[];
  const reviewBeat=reviewBeats[Math.min(reviewIndex,reviewBeats.length-1)]??null;
  const frame=director.frame;
  const beat=inspecting?reviewBeat:frame?.beat;
  const event=beat?.events[0]?{...beat.events[0],sequence:inspecting?reviewIndex:frame?.index}:null;
  const toolsLocked=busy || sceneCheckpoint.phase!=="main";
  const inspected=inspecting && latestBefore ? snapshotAtBeat(latestBefore,reviewBeats,reviewIndex) : null;
  return <main className={`app-shell ${inspecting?"theatre-inspection":""}`}>
    <section className="theatre-tools">
      <h1>矿色与墨影 · 战斗演出剧场</h1>
      <p>共用 Demo 的真实战斗组件与播放器。这里是独立沙盒，完全不读取或写入你的存档。真实指令照常由战斗引擎结算；示范按钮仅展示明确标注的演出样例。</p>
      <div className="tool-row">
        <a href="/jrpg/">返回 Demo</a>
        <a href="/jrpg/battle-theatre.html?skills=confirmed">已确定技能集沙盒</a>
        <button className={tab==="battle"?"selected":""} onClick={()=>setTab("battle")}>实战演出</button>
        <button className={tab==="drawings"?"selected":""} disabled={toolsLocked} onClick={()=>setTab("drawings")}>全部效果画法</button>
      </div>
      {tab==="battle" && <>
        {confirmedPreview&&<p>已确定技能集模式：已填写职业的全部技能、EX和辅助在此临时开放。可以切换另四位职业；仅本页沙盒，不修改学习进度或正式资源。</p>}
        <div className="tool-row">
          <label>战场<select aria-label="演出战场" value={resource} disabled={toolsLocked} onChange={e=>reset(e.target.value as Resource | "final")}>
            {(["coin","exp","jp","gem"] as const).map(r=><option key={r} value={r}>{dungeons[r].name}</option>)}
            <option value="final">终刻魔王 · 双队预览</option>
          </select></label>
          <label>弱点场景<select aria-label="弱点场景" value={weaknessPreview} disabled={toolsLocked} onChange={e=>reset(resource,group,e.target.value as WeaknessPreview)}>
            <option value="default">原版弱点</option>
            <option value="weapons">六武器弱点</option>
            <option value="elements">六属性弱点</option>
          </select></label>
          <label>状态场景<select aria-label="状态场景" value={statusPreview} disabled={toolsLocked}
            onChange={e=>reset(resource,group,weaknessPreview,e.target.value as StatusPreview)}>
            <option value="default">常规状态</option>
            <option value="many">多状态展示 · 每单位19个</option>
          </select></label>
          <button disabled={toolsLocked} onClick={()=>reset(resource,1-group)}>切换另四位职业</button>
          {resource==="final"&&<button disabled={toolsLocked} onClick={()=>reset("final",battle.finale?.stage===1?1:0,weaknessPreview,statusPreview,battle.finale?.stage===1?2:1)}>切换魔王场次</button>}
          <label>指定出手角色<select aria-label="指定出手角色" value={battle.current[0]?.unitId??""} disabled={toolsLocked||inspecting}
            onChange={e=>setBattle(s=>({...s,current:[...s.current.filter(n=>n.unitId===e.target.value),...s.current.filter(n=>n.unitId!==e.target.value)]}))}>
            {[...battle.party,...battle.enemies].map(u=><option key={u.id} value={u.id} disabled={!battle.current.some(n=>n.unitId===u.id)}>{u.name}</option>)}
          </select></label>
          <button disabled={toolsLocked} onClick={()=>reset()}>重置沙盒</button>
          <button disabled={toolsLocked||inspecting} onClick={()=>{director.clear();setBattle(withConfirmedTheatreSkills(battle));}}>载入已确定技能并补满资源</button>
          <button disabled={toolsLocked||inspecting||battle.outcome!=="active"}
            title="向敌人与四位角色施加多状态预制，保留战斗进度；会影响后续沙盒结算，不修改正式存档。"
            onClick={applyManyStatuses}>施加大量状态</button>
        </div>
        {apResult&&<p role="status">{apResult}</p>}
        {weaknessPreview!=="default" && <p role="status">模拟场景：{weaknessPreview==="weapons"?"剑、枪、弓、扇、斧、杖":"火、水、木、风、土、雷"}六个弱点全部可见。仅修改本页沙盒，不改变正式敌人与存档。</p>}
        {statusPreview==="many" && <p role="status">多状态布局预设：敌人与四位角色各显示19个状态图标，共95个；属性增减不互相冲突。用于观察换行与遮挡，不代表自然战斗中一定会同时获得这些状态。鼠标悬停可查看详情；重置沙盒可恢复预设。</p>}
        <details className="pp-laboratory">
          <summary>PP 值测试（独立沙盒）</summary>
          <p>直接设置当前队伍的PP，观察圆环、满槽四角星与绝技入口；不消耗行动，也不会自动释放绝技。各职业绝技仍以Demo实际接入情况为准。</p>
          <div className="tool-row">
            <label>角色<select aria-label="PP测试角色" value={ppTarget} disabled={toolsLocked||inspecting||battle.outcome!=="active"} onChange={e=>setPPTarget(e.target.value)}>
              <option value="all">全体角色</option>
              {battle.party.map(unit=><option key={unit.id} value={unit.id}>{unit.name} · PP {unit.latent}%</option>)}
            </select></label>
            <label>PP值<input aria-label="PP测试数值" type="number" min="0" max="100" step="1" value={ppAmount}
              disabled={toolsLocked||inspecting||battle.outcome!=="active"} onChange={e=>setPPAmount(e.target.value)}/>%</label>
            <button disabled={toolsLocked||inspecting||battle.outcome!=="active"} onClick={()=>editPP()}>设置 PP</button>
            <button disabled={toolsLocked||inspecting||battle.outcome!=="active"} onClick={()=>editPP("all",100)}>全体充满 PP</button>
            <button disabled={toolsLocked||inspecting||battle.outcome!=="active"} onClick={()=>editPP("all",0)}>全体清空 PP</button>
          </div>
          {ppResult&&<p role="status">{ppResult}</p>}
        </details>
        <details className="ap-laboratory">
          <summary>AP 系统测试（独立沙盒）</summary>
          <p>每单位共享一条AP，达到韧性阈值产生最后输入类型的异常层。此处直接输入仅用于测试，不是正式战斗指令，也不消耗行动。爆破／侵蚀伤害及敌方韧性暂为Demo参数。</p>
          <div className="tool-row">
            <label>目标<select aria-label="AP测试目标" value={apTarget} disabled={toolsLocked||inspecting} onChange={e=>setAPTarget(e.target.value)}>
              {[...battle.enemies,...battle.party].map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select></label>
            <label>异常<select aria-label="AP测试异常" value={apType} disabled={toolsLocked||inspecting} onChange={e=>setAPType(e.target.value as StatusId)}>
              {abnormalityTypes.map(type=><option key={type}>{type}</option>)}
            </select></label>
            <label>输入量<input aria-label="AP测试输入量" type="number" min="0" step="1" value={apAmount} disabled={toolsLocked||inspecting} onChange={e=>setAPAmount(Number(e.target.value))}/></label>
            <button disabled={toolsLocked||inspecting||battle.outcome!=="active"} onClick={()=>editAP("input")}>输入 AP</button>
            <button disabled={toolsLocked||inspecting} onClick={()=>editAP("cleanse")}>清除异常（保留 AP）</button>
            <button disabled={toolsLocked||inspecting} onClick={()=>editAP("evade")}>授予1次回避</button>
            <label>韧性<select aria-label="AP测试韧性" value={[...battle.enemies,...battle.party].find(u=>u.id===apTarget)?.tenacity??100}
              disabled={toolsLocked||inspecting} onChange={e=>editAP("threshold",Number(e.target.value))}>
              {[100,150,200].map(t=><option key={t} value={t}>{t}</option>)}
            </select></label>
          </div>
        </details>
        <div className="tool-row">
          <span>演出样例：</span>
          {(["break","aoe","evade","redirect","victory","defeat"] as const).map((key,i)=><button disabled={toolsLocked} key={key} onClick={()=>void sample(key)}>
            {["弱点 / Break","全体攻击","回避","目标改变","胜利闭幕","败北闭幕"][i]}</button>)}
        </div>
        <div className="tool-row">
          <button disabled={toolsLocked||!latestEvents.length} onClick={()=>{setReviewEvents(latestEvents);setReviewIndex(0);setInspecting(!inspecting);}}>
            {inspecting?"退出帧检视":"逐拍检视刚才的行动"}</button>
          {inspecting && <>
            <label>结算拍<select aria-label="结算拍" value={reviewIndex} onChange={e=>setReviewIndex(Number(e.target.value))}>
              {reviewBeats.map((b,i)=><option key={i} value={i}>{i+1}. {b.events[0].text}</option>)}
            </select></label>
            <label>帧进度<input aria-label="帧进度" type="range" min={1} max={99} value={progress} onChange={e=>setProgress(Number(e.target.value))}/>{progress}%</label>
          </>}
        </div>
        {error && <p className="theatre-error" role="alert">{error}</p>}
      </>}
      {tab==="drawings" && <div className="tool-row">
        <label>画法进度<input aria-label="画法进度" type="range" min={1} max={99} value={progress} onChange={e=>setProgress(Number(e.target.value))}/>{progress}%</label>
        <span>使用现有PNG特效图集，与实战共用播放器；这里固定一帧。回避复用风，会心复用防御，削弱复用强化；倒地由卡片标记与浮字表现。</span>
      </div>}
    </section>
    {tab==="battle" ? <BattleView key={`${fixtureVersion}:${sceneCheckpoint.key}`} s={inspected??frame?.state??battle} busy={busy||inspecting}
      event={event} beat={beat} effectProgress={inspecting?progress/100:undefined}
      sceneCheckpoint={sceneCheckpoint} onSceneCheckpoint={async next=>setSceneCheckpoint(next)}
      focus={director.focus} layoutGateRef={layoutGate} onInputReady={ready=>{inputReady.current=ready&&!inspecting;}}
      onCommand={c=>void perform(c)} onEnemy={()=>void perform()}
      onCodex={()=>setError("独立演出页不打开营地图鉴；请在Demo查看机制。")}
      onFinish={()=>battle.finale?.stage===1&&battle.outcome==="victory"?reset("final",1,weaknessPreview,statusPreview,2):reset()}/> : <section className="theatre-drawings" aria-label="全部效果画法">
        {theatreEffects.map(effect=><article key={effect}>
          <div className="effect-specimen">{effect==="ko"?<span>倒地 · 使用卡片标记与浮字</span>:<BattleEffects effects={[effect]} token={effect} duration={500} progress={progress/100}/>}</div>
          <h2>{names(effect)}</h2>
        </article>)}
      </section>}
  </main>;
}
mountGame(<TheatrePage/>);
