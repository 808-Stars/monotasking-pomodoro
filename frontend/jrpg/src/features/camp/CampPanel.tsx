import { useEffect, useState } from "react";
import {
  grantStamina,
  medicines,
  type GameState,
} from "../../game/economy.ts";
import {
  features,
  hasFeature,
  memoryNodes,
  buyNode,
  refundNode,
  previewNodeRefund,
  supportSlots,
} from "../../game/camp/memory.ts";
import { jobNames, itemName } from "../../game/camp/catalog.ts";
import { checkout,shopLevel,shopSpending,shopThresholds } from "../../game/camp/shop.ts";
import { recipes, craft, dismantle } from "../../game/camp/medicine.ts";
import {
  jobSkills,
  learnedIds,
  learningCost,
  learnSkill,
  refundSkill,
  previewSkillRefund,
  unlockSubjob,
  equipSubjob,
  setParty,
  equipSupports,
  availableSupports,
} from "../../game/camp/jobs.ts";
import {
  claimAvailability,
  claimReward,
  type ClaimKind,
} from "../../game/camp/claims.ts";
import "./camp.css";
import MemoryAtlas from "./MemoryAtlas.tsx";
import GemPanel from "./GemPanel.tsx";
import BackpackEditor from "./BackpackEditor.tsx";
import {ItemPages} from "../PageTurns.tsx";
import { CampHeroPicker, CampHeroSheet, CampItemMark } from "./CampArtwork.tsx";
import PartyFormation from "./PartyFormation.tsx";
import ShopCounter from "./ShopCounter.tsx";
import { setBackpack,warehouseQuantity } from "../../game/camp/backpack.ts";
import { skillBook } from "../../game/battle.ts";
import {
  activeSupportHandlers,
  ppDescriptions,
} from "../../game/camp/runtimeStatus.ts";
type Props = {
  game: GameState;
  panel: string;
  view?: string;
  tier: number;
  revision: number;
  busy: boolean;
  onCommit: (
    change: (g: GameState) => GameState,
    revision: number,
  ) => Promise<void>;
};
export default function CampPanel({
  game: g,
  panel,
  view,
  tier,
  revision,
  busy,
  onCommit,
}: Props) {
  const [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [pending, setPending] = useState<{
    label: string;
    change: (g: GameState) => GameState;
    revision: number;
    summary: string[];
  } | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({}),
    [layer, setLayer] = useState(tier);
  const [node, setNode] = useState("R5C5"),
    [quantity, setQuantity] = useState(1),
    [search, setSearch] = useState("");
  const [hero, setHero] = useState("warrior"),
    [job, setJob] = useState("warrior");
  const [inspectedSkill, setInspectedSkill] = useState("");
  const [warehouseOpen,setWarehouseOpen]=useState(view==="warehouse");
  const [medicinePage, setMedicinePage] = useState<"bag"|"craft"|"dismantle">(
    view === "craft" || view === "dismantle" ? view : "bag",
  );
  const activeSkills = jobSkills.filter(s=>s.job===job&&s.kind==="active");
  const shownSkill = activeSkills.find(s=>s.id===inspectedSkill) ?? activeSkills[0];
  const [party, setPartyDraft] = useState(g.camp!.party),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    // Only the supply page has a live countdown. Ticking every other panel
    // rebuilt inventory lists and the entire memory atlas during scrolling.
    if (panel !== "stamina") return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [panel]);
  function preview(
    label: string,
    change: (s: GameState) => GameState,
    details: string[] = [],
  ) {
    setError("");
    setSuccess("");
    try {
      const next = change(g);
      const lines = [...details];
      for (const [key, label] of [
        ["coins", "古币"],
        ["exp", "旧忆"],
        ["stamina", "体力"],
      ] as const)
        if (next[key] !== g[key])
          lines.push(`${label}：${g[key]} → ${next[key]}`);
      for (const id of new Set([
        ...Object.keys(g.inventory),
        ...Object.keys(next.inventory),
      ]))
        if ((next.inventory[id] ?? 0) !== (g.inventory[id] ?? 0))
          lines.push(
            `${recipes.find((r) => r.id === id)?.name ?? itemName(id)}：${g.inventory[id] ?? 0} → ${next.inventory[id] ?? 0}`,
          );
      for (const id of Object.keys(jobNames))
        if (next.jp[id] !== g.jp[id])
          lines.push(`${jobNames[id]}残响：${g.jp[id]} → ${next.jp[id]}`);
      setPending({ label, change, revision, summary: lines });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function confirm() {
    if (!pending || busy) return;
    try {
      await onCommit(pending.change, pending.revision);
      setSuccess("已保存。");
      if (panel === "shop") setCart({});
      setPending(null);
    } catch (e) {
      setError((e as Error).message);
      setPending(null);
    }
  }
  const num = (
    <label>
      数量{" "}
      <input
        aria-label="操作数量"
        type="number"
        min="1"
        step="1"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
      />
    </label>
  );
  const chooseHero = <CampHeroPicker value={hero} onSelect={id=>{setHero(id);setJob(id);}}/>;
  const formation=panel==="party"&&view!=="subjob";
  const n = memoryNodes.find((n) => n.id === node)!;
  return (
    <div className="camp-panel" data-camp-panel={panel}>
      {error && (
        <p role="alert" className="counter-error">
          {error}
        </p>
      )}
      {success && <p role="status">{success}</p>}
      {pending ? (
        <section className="camp-confirm">
          <h3>{pending.label}</h3>
          {pending.summary.map((x, i) => (
            <p key={i}>{x}</p>
          ))}
          <p>确认后一次保存。取消不会扣除资源。</p>
          <button disabled={busy} onClick={() => void confirm()}>
            确认提交
          </button>
          <button disabled={busy} onClick={() => setPending(null)}>
            取消
          </button>
        </section>
      ) : (
        <>
          {panel==="medicine"&&!view&&<nav className="camp-tabs" aria-label="药坊功能">
            <button type="button" aria-pressed={medicinePage==="bag"} onClick={()=>setMedicinePage("bag")}>战斗背包</button>
            <button type="button" aria-pressed={medicinePage==="craft"} onClick={()=>setMedicinePage("craft")}>调和与分解</button>
          </nav>}
          {panel === "exp" && (
            <MemoryAtlas
              game={g}
              node={node}
              busy={busy}
              onSelect={setNode}
              onPurchase={() =>
                preview(`购买 ${n.label}`, (s) => buyNode(s, node))
              }
              onRefund={() => {
                try {
                  const p = previewNodeRefund(g, node);
                  preview("撤销节点", (s) => refundNode(s, node), [
                    `连带撤销：${p.ids.map((id) => memoryNodes.find((x) => x.id === id)?.label).join("、")}`,
                    `消耗${p.cost}卷，退还${p.refund}旧忆；永久及功能节点不撤销，断连仍生效，不卸下装配。`,
                  ]);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          )}
          {panel === "medicine" && medicinePage==="bag" && (
            <BackpackEditor
              key={revision}
              game={g}
              busy={busy}
              onSave={(selection) =>
                void onCommit((s)=>setBackpack(s,selection),revision).catch(e=>setError((e as Error).message))
              }
            />
          )}
          {panel === "shop" && (
            <>
              <div className="shop-counter-toolbar">
              <div className="shop-spending" role="status">
                <span>当前消费 <b>{shopSpending(g).toLocaleString("zh-CN")}</b>
                {shopLevel(g)<2&&<> / 目标消费 <b>{shopThresholds[shopLevel(g)+1].toLocaleString("zh-CN")}</b></>}</span>
                <small>{shopLevel(g)<2?`累计消费达到目标后开放${shopLevel(g)===0?"专业":"神秘"}商店`:"全部货架已开放"}</small>
              </div>
              <div className="camp-tabs">
                {["普通", "专业", "神秘"].map((name, i) => (
                  <button
                    key={name}
                    aria-pressed={!warehouseOpen&&layer===i}
                    disabled={
                      i > shopLevel(g)
                    }
                    onClick={() => {setLayer(i);setWarehouseOpen(false);}}
                  >
                    {name}商店{i>shopLevel(g)?`（累计${shopThresholds[i]}）`:layer===i&&!warehouseOpen?" ◆":""}
                  </button>
                ))}
                <button type="button" aria-pressed={warehouseOpen} onClick={()=>setWarehouseOpen(true)}>仓库／背包</button>
              </div>
              </div>
              {warehouseOpen?<BackpackEditor game={g} busy={busy} onSave={selection=>{
                void onCommit(s=>setBackpack(s,selection),revision).catch(e=>setError((e as Error).message));
              }}/>:<>
              <ShopCounter game={g} layer={layer} cart={cart} onCart={setCart} busy={busy}
                onCheckout={()=>preview("购买清单",s=>checkout(s,cart))}/>
              </>}
            </>
          )}
          {panel === "medicine" && medicinePage!=="bag" && (
            <section className="camp-apothecary">
              <details><summary>查看基础药说明</summary><div className="camp-grid">
                {medicines.map((m) => (
                  <article key={m.id} className="camp-row">
                    <CampItemMark id={m.id}/>
                    <div>
                      <b>
                        {m.name} · 仓库{warehouseQuantity(g,m.id)}
                      </b>
                      <p>{m.description}</p>
                      <small>在战斗道具中使用；普通商店稳定供应。</small>
                    </div>
                  </article>
                ))}
              </div></details>
              <h3>{medicinePage === "dismantle" ? "药品分解" : "固定配方调和"}</h3>
              <p>
                合法配方必定成功，无加工费。分解每份消耗1份解方露，只退回直接投入。
              </p>
              <p>
                解方露库存 {g.inventory["formula-dew"] ?? 0}
                ；神秘商店开放后可购买。
              </p>
              <div className="camp-craft-tools">{num}
              <input
                aria-label="搜索配方"
                placeholder="搜索药品或效果"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              </div>
              <ItemPages label="药品配方" size={3} resetKey={search} className="camp-recipe-grid">
              {recipes
                .filter((r) =>
                  (
                    r.name +
                    r.effect +
                    r.inputs.map(itemName).join("")
                  ).includes(search),
                )
                .map((r) => (
                  <article className="camp-row" key={r.id}>
                    <CampItemMark id={r.id}/>
                    <div>
                      <b>
                        {r.name} · 仓库{warehouseQuantity(g,r.id)}
                      </b>
                      <p>{r.effect}</p>
                      <small>
                        {r.inputs
                          .map(
                            (id) =>
                              `${recipes.find((x) => x.id === id)?.name ?? itemName(id)}（仓库${warehouseQuantity(g,id)}）`,
                          )
                          .join(" + ")}
                      </small>
                      {r.blocked && <p>{r.blocked}</p>}
                    </div>
                    <div>
                      {medicinePage !== "dismantle" && <button
                        disabled={busy || !!r.blocked}
                        onClick={() =>
                          preview(`调和${r.name}×${quantity}`, (s) =>
                            craft(s, r.id, quantity),
                          )
                        }
                      >
                        调和
                      </button>}
                      {(!view || medicinePage === "dismantle") && <button
                        disabled={busy || !!r.blocked}
                        onClick={() =>
                          preview(`分解${r.name}×${quantity}`, (s) =>
                            dismantle(s, r.id, quantity),
                          )
                        }
                      >
                        分解
                      </button>}
                    </div>
                  </article>
                ))}
              </ItemPages>
            </section>
          )}
          {(panel === "party" || panel === "jp") && (
            <>
              {!formation&&chooseHero}
              <div className={`camp-character-workspace${formation?' formation-workspace':''}`}>
              {!formation&&<CampHeroSheet hero={hero} game={g}/>}
              <div className="camp-character-body">
              {panel === "party" ? (
                <>
                  {view !== "subjob" && <PartyFormation game={g} party={party} onDraft={setPartyDraft} busy={busy}
                    onSave={()=>preview("确认配队",s=>setParty(s,party),[party.map(id=>jobNames[id]).join("、")])}/>}
                  {view !== "party" && <><h3>个人副职业资格</h3>
                  {!hasFeature(g, features.subjob) && (
                    <p>
                      新资格需先购买旧忆网“可解锁副职业”节点，再消耗对应职业资格证；已有资格保留。
                    </p>
                  )}
                  <p>
                    当前副职：{jobNames[g.camp!.equippedSubjobs[hero]] ?? "无"}
                  </p>
                  <ItemPages label="副职业资格" size={3} className="camp-qualifications" resetKey={hero}>
                  {Object.entries(jobNames)
                    .filter(([id]) => id !== hero)
                    .map(([id, name]) => (
                      <article className="camp-row" key={id}>
                        <img className="camp-job-portrait" src={`/jrpg/assets/head-logos/${id}.webp`} alt="" draggable={false}/>
                        <span>
                          {name} · 资格证{" "}
                          {g.inventory[`certificate-${id}`] ?? 0}
                        </span>
                        {g.camp!.subjobUnlocks[hero]?.includes(id) ? (
                          <button
                            onClick={() =>
                              preview(
                                "装备副职业",
                                (s) => equipSubjob(s, hero, id),
                                [`${jobNames[hero]} → ${name}`],
                              )
                            }
                          >
                            装备
                          </button>
                        ) : (
                          <button
                            disabled={busy || !hasFeature(g, features.subjob)}
                            onClick={() =>
                              preview(
                                "解锁副职业",
                                (s) => unlockSubjob(s, hero, id),
                                [
                                  `${jobNames[hero]}永久获得本周目${name}副职资格`,
                                ],
                              )
                            }
                          >
                            使用资格证
                          </button>
                        )}
                      </article>
                    ))}
                  </ItemPages>
                  <button
                    onClick={() =>
                      preview("卸下副职业", (s) => equipSubjob(s, hero, null))
                    }
                  >
                    卸下副职
                  </button></>}
                </>
              ) : (
                <>
                  {(!view || view === "skills") && <><label>
                    查看职业{" "}
                    <select
                      value={job}
                      onChange={(e) => setJob(e.target.value)}
                    >
                      {[hero, ...(g.camp!.subjobUnlocks[hero] ?? [])].map(
                        (id) => (
                          <option key={id} value={id}>
                            {jobNames[id]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <div className="camp-skill-ledger">
                    <nav className="camp-skill-directory" aria-label="职业技能目录">
                      <ItemPages label="技能目录" size={4} resetKey={job}>
                      {activeSkills.map(s=><button type="button" key={s.id} aria-pressed={shownSkill?.id===s.id}
                        onClick={()=>setInspectedSkill(s.id)}><span>{s.name}</span><small>{learnedIds(g,hero,job).includes(s.id)?"已习得":`${s.sp} SP`}</small></button>)}
                      </ItemPages>
                    </nav>
                    <div className="camp-skill-detail" aria-live="polite">
                  {activeSkills
                    .filter((s) => s.id===shownSkill?.id)
                    .map((s) => {
                      const known = learnedIds(g, hero, job).includes(s.id);
                      let cost = "";
                      try {
                        cost = String(learningCost(g, hero, job, s.id));
                      } catch (e) {
                        cost = (e as Error).message;
                      }
                      return (
                        <article className="camp-row" key={s.id}>
                          <div>
                            <b>
                              {s.name} · {s.sp} SP
                            </b>
                            <p>{s.description}</p>
                            <small>{known ? "已学习" : `${cost} 残响`}</small>
                            {!skillBook[s.id] && (
                              <p>战斗效果待接入，暂不开放新的付费学习。</p>
                            )}
                          </div>
                          {known ? (
                            g.camp!.skills[hero]?.[job]?.[s.id] !==
                              undefined && (
                              <button
                                onClick={() => {
                                  try {
                                    const p = previewSkillRefund(
                                      g,
                                      hero,
                                      job,
                                      s.id,
                                    );
                                    preview(
                                      "撤销技能",
                                      (x) => refundSkill(x, hero, job, s.id),
                                      [
                                        `撤销：${p.ids.map((id) => jobSkills.find((s) => s.id === id)?.name).join("、")}；需要${p.cost}朵忘却花，返还${p.refund}残响；失效辅助自动卸下。`,
                                      ],
                                    );
                                  } catch (e) {
                                    setError((e as Error).message);
                                  }
                                }}
                              >
                                撤技
                              </button>
                            )
                          ) : (
                            <button
                              disabled={busy || !skillBook[s.id]}
                              onClick={() =>
                                preview(`学习${s.name}`, (x) =>
                                  learnSkill(x, hero, job, s.id),
                                )
                              }
                            >
                              学习
                            </button>
                          )}
                        </article>
                      );
                    })}
                    </div>
                  </div>
                  </>}
                  {(!view || view === "supports") && <><h3>辅助栏 {supportSlots(g)}格</h3>
                  {availableSupports(g, hero).map((id) => {
                    const s = jobSkills.find((x) => x.id === id)!;
                    const equipped = g.camp!.supports[hero] ?? [];
                    return (
                      <article key={id}>
                        <b>{s.name}</b>
                        <p>{s.description}</p>
                        {!activeSupportHandlers.has(id) && (
                          <p>战斗效果待接入，暂不可装配。</p>
                        )}
                        <button
                          disabled={
                            busy ||
                            (!equipped.includes(id) &&
                              !activeSupportHandlers.has(id))
                          }
                          onClick={() =>
                            preview(
                              "调整辅助",
                              (x) =>
                                equipSupports(
                                  x,
                                  hero,
                                  equipped.includes(id)
                                    ? equipped.filter((y) => y !== id)
                                    : [...equipped, id],
                                ),
                              [s.name],
                            )
                          }
                        >
                          {equipped.includes(id) ? "卸下" : "装备"}
                        </button>
                      </article>
                    );
                  })}
                  </>}
                  {(!view || view === "ex") && <><h3>角色EX</h3>
                  <p>EX由对应旧忆功能节点解锁；已有战斗实现的项目在下一场入场时加入主职业角色的技能菜单。</p>
                  {jobSkills
                    .filter((s) => s.job === hero && s.kind === "ex")
                    .map((s) => (
                      <p key={s.id}>
                        <b>
                          {s.name} ·{" "}
                          {hasFeature(
                            g,
                            s.id.endsWith("1") ? features.ex1 : features.ex2,
                          )
                            ? skillBook[s.id]?"已解锁，可在战斗使用":"资格已解锁，执行待接入"
                            : "需旧忆网节点"}
                        </b>
                        <br />
                        {s.description}
                      </p>
                    ))}</>}
                </>
              )}
              {(!view || view === "pp") && <><h3>PP专属指令</h3>
              <p>{ppDescriptions[hero]}</p>
              <p>
                默认容量100，装备“观众效应”后为50，按受伤和Break积累。剑士、舞娘、神官、猎人与药师的专属指令已接入；其余仍待接入。副职不复制PP指令。
              </p></>}
              </div>
              </div>
            </>
          )}
          {panel === "stamina" && (
            <>
              <h3>酒馆补给</h3>
              <p>
                当前体力 {g.stamina} · 本周目净消耗 {g.spent} · 已打卡{" "}
                {g.camp!.claimState.days.length} 天
              </p>
              <p>北京时间，逻辑日04:00切换。晨起06:00—08:00；5h补给不积存。</p>
              {(["checkin", "morning", "supply"] as ClaimKind[]).map((kind) => (
                <p key={kind}>
                  <button
                    disabled={!claimAvailability(g, now)[kind]}
                    onClick={() =>
                      preview("领取补给", (s) =>
                        claimReward(s, kind, Date.now()),
                      )
                    }
                  >
                    {kind === "checkin"
                      ? `今日打卡 +${(g.camp!.claimState.days.length + 1) * 20}`
                      : kind === "morning"
                        ? "晨起补给 +100"
                        : "5h补给 +50"}
                  </button>
                  {kind === "supply" && !claimAvailability(g, now).supply && (
                    <small>
                      {" "}
                      距下次约
                      {Math.max(
                        0,
                        Math.ceil(
                          (g.camp!.claimState.lastSupply + 18000000 - now) /
                            60000,
                        ),
                      )}
                      分钟
                    </small>
                  )}
                </p>
              ))}
              <details>
                <summary>本地开发测试工具（非正式来源）</summary>
                <p>尚未连接原工作系统；测试补充也进入当前本地存档。</p>
                <button
                  onClick={() =>
                    preview("增加测试体力", (s) => grantStamina(s, 500))
                  }
                >
                  测试体力 +500
                </button>
              </details>
            </>
          )}
          {panel === "gem" && (
            <GemPanel game={g} busy={busy} onChange={preview} view={view} />
          )}
        </>
      )}
    </div>
  );
}
