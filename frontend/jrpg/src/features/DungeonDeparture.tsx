import { useRef, useEffect, useState, type CSSProperties } from "react";
import DungeonArt from "./DungeonArt.tsx";
import { jobs, resourceNames, rewardId, rewards, type GameState, type Resource } from "../game/economy.ts";
import { rewardDenominations, rewardTiers } from "../game/rewardRules.ts";
import { dungeonOrder, doorCleared, doorDiscovery, resourceEncounter, type Difficulty } from "../game/dungeons.ts";
import { jobNames } from "../game/camp/catalog.ts";
import { battleBackpack } from "../game/camp/backpack.ts";
import "./dungeon-departure.css";
import {BookPager} from "./PageTurns.tsx";

const places = {
  coin: { name: "铸金穹厅", boss: "铸金监守", title: "无人签收的旧命令", line: "金库的门仍紧闭着。那名失去心脏的监守，依然等待一份永远不会到来的通行凭证。", seal: "金", accent: "#d7b46d" },
  exp: { name: "回响书库", boss: "回响馆长", title: "未被归还的昨日", line: "旧袍间亮起两点白焰。书页记得所有来客，而馆长早已忘了，经历也应当被带向远方。", seal: "忆", accent: "#a6cbd2" },
  jp: { name: "试艺回廊", boss: "武艺宗师", title: "不肯结束的考验", line: "闭目的猫形宗师悬坐回廊。它仍能辨认你的每一次应对，却再也说不出那句认可。", seal: "艺", accent: "#afbc8a" },
  gem: { name: "棱镜矿庭", boss: "棱镜核心", title: "无处疏导的力量", line: "庞大的矿体仅以一角抵住大地。你靠近时，积压已久的矿脉也随之苏醒。", seal: "玉", accent: "#c0afd8" },
  final: { name: "终刻王座", boss: "终刻魔王", title: "八条归途，在此断裂", line: "王座尽头，上一代八位勇者的遗存已重构为混沌。你将带着两支队伍，走向他们未能走完的终点。", seal: "终", accent: "#d7a19b" },
};

export interface DungeonDepartureProps {
  resource: Resource | "final";
  game: GameState;
  busy: boolean;
  difficulty: Difficulty;
  onDifficulty: (difficulty: Difficulty) => void;
  onBack: () => void;
  onChallenge: (sandbox: boolean) => void;
  onSweep: (count: 1 | 10) => void;
  onParty: () => void;
  onBag: () => void;
}

export default function DungeonDeparture({ resource, game, busy, difficulty, onDifficulty, onBack, onChallenge, onSweep, onParty, onBag }: DungeonDepartureProps) {
  const root = useRef<HTMLElement>(null);
  const [leaf, setLeaf] = useState<"party" | "rewards">("party");
  const place = places[resource];
  const isFinal = resource === "final";
  const cleared = isFinal ? !!game.finalCleared : !!doorCleared(game, resource, difficulty);
  const normalCleared = !isFinal && !!doorCleared(game, resource);
  const locked = !isFinal && difficulty === "advanced" && !normalCleared;
  const stars = isFinal ? 5 : resourceEncounter(resource, difficulty).stars;
  const party = game.camp?.party ?? ["warrior", "scholar", "cleric", "merchant"];
  const second = jobs.filter(id => !party.includes(id));
  const known = isFinal ? [] : doorDiscovery(game, resource, difficulty).weaknesses;
  let bagCount = 0;
  let bagError = "";
  try { bagCount = Object.values(battleBackpack(game)).reduce((sum, n) => sum + n, 0); }
  catch (error) { bagError = error instanceof Error ? error.message : "请检查背包配置"; }
  const firstReward = isFinal ? null : rewards.find(r => r.id === rewardId(resource, "SSR", difficulty));
  const challengeDisabled = busy || locked || ((!cleared || isFinal) && game.stamina < 20);

  useEffect(() => { root.current?.scrollIntoView({ block: "start", behavior: "instant" }); }, [resource]);

  return (
    <section ref={root} className="dungeon-departure" data-departure={resource} style={{ "--departure-accent": place.accent } as CSSProperties} aria-label={`${place.name}出发准备`}>
      <div className="departure-vista" aria-hidden="true"><DungeonArt resource={resource} /></div>
      <div className="departure-shade" aria-hidden="true" />
      <header className="departure-topline">
        <button className="departure-return" disabled={busy} onClick={onBack}><span aria-hidden="true">〈</span> 返回冒险地图</button>
        <span className="departure-progress"><i aria-hidden="true" />{cleared ? "已击退 · 可再次踏入" : "尚未击退"}</span>
      </header>

      <div className="departure-composition">
        <div className="departure-story">
          <p className="departure-location">{isFinal ? "双队终战" : `${resourceNames[resource]}之门`}<span aria-label={`${stars}星`}>{"★".repeat(stars)}</span></p>
          <h1>{place.name}</h1>
          <div className="departure-title-rule" aria-hidden="true"><span /></div>
          <p className="departure-story-title">{place.title}</p>
          <p className="departure-lore">{place.line}</p>
          <div className="departure-adversary"><span>此地的守门者</span><h2>{place.boss}</h2></div>
          {!isFinal && <div className="departure-difficulties" role="group" aria-label="资源门难度">
            <button disabled={busy} aria-pressed={difficulty === "normal"} onClick={() => onDifficulty("normal")}>普通</button>
            <button disabled={busy || !normalCleared} aria-pressed={difficulty === "advanced"} onClick={() => onDifficulty("advanced")}>进阶{!normalCleared && <small>普通首胜后开放</small>}</button>
          </div>}
          {!isFinal && <p className="departure-known">已知弱点 <span>{known.length ? known.join(" / ") : "尚未记录，留待交战时探明"}</span></p>}
          <span className="departure-scene-seal" aria-hidden="true">{place.seal}</span>
        </div>

        <div className="departure-open-space" aria-hidden="true" />

        <aside className="departure-journal" aria-label="行旅手记">
          <div className="departure-journal-spine" aria-hidden="true" />
          <header><span>行旅手记</span><small>灯火之内，准备的最后一刻</small></header>
          <nav className="departure-leaves" aria-label="出发手记内容">
            <button aria-pressed={leaf === "party"} onClick={() => setLeaf("party")}>行装</button>
            <button aria-pressed={leaf === "rewards"} onClick={() => setLeaf("rewards")}>{isFinal ? "双战须知" : "收获与扫荡"}</button>
          </nav>
          <div className="departure-leaf" key={`${resource}-${leaf}`}>
            <BookPager key={`${resource}-${leaf}`} label="行旅手记">
            {leaf === "party" ? <>
              <h3>{isFinal ? "第一支队伍" : "同行之人"}</h3>
              <PartyMembers members={party} />
              {isFinal && <><h3>第二支队伍</h3><PartyMembers members={second} /></>}
              <button className="departure-journal-link" disabled={busy} onClick={onParty}>整备队伍 <span aria-hidden="true">›</span></button>
              <div className="departure-bag"><span>战斗背包</span><b>{bagCount}<small> / 20件</small></b></div>
              <p>{bagError || (bagCount ? "每种最多5件。出发前，请确认带上了需要的药。" : "背包还是空的。不妨为意外留一点余地。")}</p>
              <button className="departure-journal-link" disabled={busy} onClick={onBag}>整理背包 <span aria-hidden="true">›</span></button>
              <p className="departure-margin-note">正式入场会恢复全八人的HP与SP、复活并清理异常；不会补充背包药品。</p>
            </> : isFinal ? <>
              <h3>两场，走完同一段旅程</h3>
              <p>第一队为当前出战四人，第二队为其余四人。第一战开始前，阵容与背包一并锁定。</p>
              <ul className="departure-rules"><li>两战共用背包，中途不补药。</li><li>整段挑战仅收取一次20体力。</li><li>战斗计时包含指令思考与动画，场间等候不计。</li></ul>
              <p className="departure-margin-note">首次胜利后可进行免费沙盒重战，沙盒不记录成绩。</p>
            </> : <>
              <h3>{cleared ? "首胜已记入旅程" : "首次击退，固定带回"}</h3>
              <div className="departure-reward"><span>SSR</span><div><b>{firstReward?.name ?? "本门SSR奖励物品"}</b><small>固定1件 · 不参与资源类别抽取</small></div></div>
              <h3>{difficulty === "advanced" ? "进阶" : "普通"}扫荡</h3>
              <p>{cleared ? "此路已通。派出队伍带回资源物品，随后在营地处理。" : `本门${difficulty === "advanced" ? "进阶" : "普通"}首胜后开放。`}</p>
              <div className="departure-sweeps">{([1, 10] as const).map(n => <button key={n} disabled={busy || !cleared || locked || game.stamina < n * 50} onClick={() => onSweep(n)}><b>{n === 1 ? "单次扫荡" : "十次扫荡"}</b><small>{n * 50}体力</small></button>)}</div>
              <details className="departure-fineprint"><summary>查看奖励规则</summary><p>{dungeonOrder.map(id => `${resourceNames[id]} ${id === resource ? 85 : 5}%`).join(" / ")}</p><p>再独立抽取稀有度：{rewardTiers.map(tier => `${tier.rarity} ${tier.probability}%`).join(" / ")}。每次抽取独立，无保底；奖励先进入物品库存。</p><p>当前难度N/R/SR/SSR数量档位：{rewardTiers.map(tier => tier[difficulty]).join(" / ")}。每单位对应{dungeonOrder.map(id => `${rewardDenominations[id]}${resourceNames[id]}`).join("、")}；残响为八人各得，资源增益另算。</p><p>正式失败有{difficulty === "advanced" ? "4%" : "25%"}概率获得本门对应N物品。</p></details>
            </>}
            </BookPager>
          </div>
          <footer>旅程由你安排，不强制挑战顺序</footer>
        </aside>
      </div>

      <footer className="departure-muster">
        <div className="departure-entry-note"><span>{isFinal ? "两支队伍，一次出发" : cleared ? "这条路，你已走过" : "越过门槛，战斗即将开始"}</span><p>{isFinal ? "两战共用背包 · 正式挑战20体力" : cleared ? "本次为免费沙盒，不消耗库存，不获得重复奖励" : "入场20体力 · 自动恢复 · 背包不补充"}</p></div>
        <div className="departure-start-actions">
          <span className="departure-stamina">体力 <b>{game.stamina}</b>{((!cleared || isFinal) && game.stamina < 20) && <small>不足20，先回酒馆领取补给</small>}</span>
          {isFinal && cleared && <button className="departure-sandbox" disabled={busy} onClick={() => onChallenge(true)}>沙盒重战<small>免费 · 不记录成绩</small></button>}
          <button className="departure-enter" disabled={challengeDisabled} onClick={() => onChallenge(!isFinal && cleared)}><span aria-hidden="true">◆</span><span>{busy ? "正在准备…" : isFinal ? "踏入终刻王座" : cleared ? "沙盒重战" : "踏入此境"}<small>{isFinal ? "开始双战挑战" : cleared ? "免费 · 无重复奖励" : "20体力"}</small></span><span aria-hidden="true">›</span></button>
        </div>
      </footer>
      <details className="departure-prototype"><summary>本地原型说明</summary><p>{isFinal ? "独立魔王AI与失败奖励档位待定；当前沿用资源首领AI，仅供本地流程体验，不代表正式难度。" : difficulty === "advanced" ? "进阶使用正式草案面板，独立进阶AI待接入，暂共用监守动作库；数值未平衡。" : "已采用独立敌人形象。非古币副本暂共用监守AI，数值未平衡，星级仅表示规划难度。"}</p></details>
    </section>
  );
}

function PartyMembers({ members }: { members: string[] }) {
  return <ul className="departure-party">{members.map(id => <li key={id}><img src={`/jrpg/assets/head-logos/${id}.webp`} alt="" draggable={false} /><span>{jobNames[id] ?? id}</span></li>)}</ul>;
}
