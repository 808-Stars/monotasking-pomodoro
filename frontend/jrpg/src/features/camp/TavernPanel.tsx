import { useState } from "react";
import { type GameState, jobs } from "../../game/economy.ts";
import {
  snapshotBuild,
  findEntry,
  leaderboard,
  uploadRecord,
  interact,
  type BuildSnapshot,
  type TavernBoard,
  type BoardEntry,
} from "../../game/tavern.ts";
import { jobNames, itemName } from "../../game/camp/catalog.ts";
import {
  availableSupports,
  equipSupports,
  jobSkills,
} from "../../game/camp/jobs.ts";
import { activeSupportHandlers } from "../../game/camp/runtimeStatus.ts";
import { supportSlots } from "../../game/camp/memory.ts";
import { setBackpack, reconcileBackpack } from "../../game/camp/backpack.ts";
import CampPanel from "./CampPanel.tsx";
import BackpackEditor from "./BackpackEditor.tsx";
import {ItemPages} from "../PageTurns.tsx";
import "./tavern.css";
type Props = {
  game: GameState;
  revision: number;
  busy: boolean;
  initialTab?: string;
  onCommit: (
    change: (g: GameState) => GameState,
    revision: number,
  ) => Promise<void>;
};
const boards: Record<TavernBoard, string> = {
  achiever: "成就者",
  explorer: "探索者",
  social: "社交家",
  killer: "杀手",
};
export function BuildDetails({ build }: { build: BuildSnapshot }) {
  return (
    <>
      <small>
        版本 {build.version} · {build.monthKey}
      </small>
      {build.teams.map((t, i) => (
        <p key={i}>
          第{i + 1}队：
          {t
            .map(
              (h) =>
                `${jobNames[h]}${build.subjobs[h] ? ` / ${jobNames[build.subjobs[h]]}` : ""}`,
            )
            .join("、")}
        </p>
      ))}
      <p>
        旧忆网：
        {Object.entries(build.growth)
          .map(
            ([k, v]) =>
              `${{ maxHp: "HP", maxSp: "SP", attack: "物攻", magic: "属攻", defense: "物防", resistance: "属防", speed: "速度", tenacity: "韧性" }[k] ?? k} +${Number((v * 100).toFixed(4))}%`,
          )
          .join("；")}
      </p>
      <p>
        背包：
        {Object.entries(build.backpack)
          .map(([id, n]) => `${itemName(id)}×${n}`)
          .join("；") || "空"}
      </p>
      <p>药品价值排序待定，当前展示完整背包，不冒充正式八件缩略。</p>
      <details>
        <summary>辅助技能、尘玉和旧忆路线</summary>
        <ItemPages label="阵容配置详情" size={2}>
        {jobs.map((h) => (
          <p key={h}>
            {jobNames[h]}：辅助{" "}
            {build.supports[h]
              ?.map((id) => jobSkills.find((s) => s.id === id)?.name ?? id)
              .join("、") || "无"}
            ；尘玉{" "}
            {Object.entries(build.gems[h] ?? {})
              .map(([slot, key]) => `${slot}=${key}`)
              .join("、") || "无"}
          </p>
        ))}
        <p>路线：{Object.keys(build.nodes).join("、")}</p>
        </ItemPages>
      </details>
    </>
  );
}
export default function TavernPanel({
  game: g,
  revision,
  busy,
  initialTab,
  onCommit,
}: Props) {
  const [tab, setTab] = useState(initialTab ?? "party"),
    [error, setError] = useState(""),
    [code, setCode] = useState(""),
    [reference, setReference] = useState<BoardEntry | null>(null),
    [board, setBoard] = useState<TavernBoard>("achiever"),
    [expanded, setExpanded] = useState<string | null>(null),
    [replace, setReplace] = useState("");
  let current: BuildSnapshot | null = null;
  let configError = "";
  try {
    current = snapshotBuild(reconcileBackpack(g));
  } catch (e) {
    configError = (e as Error).message;
  }
  const [month, setMonth] = useState(g.camp!.monthKey);
  const months = [
    ...new Set([
      g.camp!.monthKey,
      ...(g.tavern?.entries ?? []).map((e) => e.monthKey),
    ]),
  ]
    .sort()
    .reverse();
  async function change(fn: (s: GameState) => GameState) {
    setError("");
    try {
      await onCommit(fn, revision);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function importCode() {
    setError("");
    const entry = findEntry(g, code.trim());
    if (!entry) {
      setError("本地代码不存在或已被覆盖；云端公共代码尚未接入。");
      return;
    }
    try {
      await onCommit(
        (s) => interact(s, entry.id, s.tavern!.ownerId, "import", Date.now()),
        revision,
      );
      setReference(entry);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="tavern-panel">
      <details className="tavern-local-note"><summary>本地酒馆原型说明</summary><p className="local-label">
        本地酒馆原型：榜单与代码仅在此浏览器存档内有效，尚未连接跨玩家服务。所有成绩标记为未经充分验证。采用计数等待药品价值规则，不开启虚假的匹配。
      </p></details>
      <div className={`camp-tavern-workspace${initialTab ? " camp-single-function" : ""}`}>
      {!initialTab && <nav className="tavern-tabs" aria-label="酒馆事务">
        {[
          ["party", "编队"],
          ["supports", "辅助技能"],
          ["bag", "背包"],
          ["gem", "尘玉"],
          ["compare", "阵容对比"],
          ["records", "魔王记录"],
          ["boards", "排行榜"],
        ].map(([id, label]) => (
          <button
            key={id}
            disabled={busy}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>}
      <div className="camp-tavern-body">
      {(error || configError) && (
        <p role="alert">{error || `配置需要修正：${configError}`}</p>
      )}
      {tab === "party" && (
        <CampPanel
          game={g}
          panel="party"
          view={initialTab === "party" ? "party" : undefined}
          tier={0}
          revision={revision}
          busy={busy}
          onCommit={onCommit}
        />
      )}
      {tab === "gem" && (
        <CampPanel
          game={g}
          panel="gem"
          view={initialTab === "gem" ? "equip" : undefined}
          tier={0}
          revision={revision}
          busy={busy}
          onCommit={onCommit}
        />
      )}
      {tab === "bag" && (
        <BackpackEditor
          key={revision}
          game={g}
          busy={busy}
          onSave={(selection) => void change((s) => setBackpack(s, selection))}
        />
      )}
      {tab === "supports" && (
        <>
          <p>
            手动配置已获得的辅助技能。当前开放{supportSlots(g)}
            栏，不自动购买、学习或更改阵容。
          </p>
          <ItemPages label="角色辅助配置" size={1}>{jobs.map((h) => (
            <div className="tavern-row" key={h}>
              <h3>{jobNames[h]}</h3>
              {availableSupports(g, h).map((id) => {
                const selected = g.camp!.supports[h] ?? [];
                return (
                  <button
                    key={id}
                    disabled={
                      busy ||
                      (!selected.includes(id) && !activeSupportHandlers.has(id))
                    }
                    aria-pressed={selected.includes(id)}
                    onClick={() =>
                      void change((s) =>
                        equipSupports(
                          s,
                          h,
                          selected.includes(id)
                            ? selected.filter((x) => x !== id)
                            : [...selected, id],
                        ),
                      )
                    }
                  >
                    {jobSkills.find((s) => s.id === id)?.name ?? id}
                    {!activeSupportHandlers.has(id) ? "（效果待接入）" : ""}
                  </button>
                );
              })}
            </div>
          ))}</ItemPages>
        </>
      )}
      {tab === "compare" && (
        <>
          <div className="tavern-code">
            <input
              aria-label="阵容代码"
              placeholder="LOCAL-…"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button disabled={busy} onClick={() => void importCode()}>
              导入只读对比
            </button>
          </div>
          <div className="tavern-compare">
            <article>
              <h3>当前阵容</h3>
              {current && <BuildDetails build={current} />}
            </article>
            <article>
              <h3>参考阵容 · 只读</h3>
              {reference ? (
                <>
                  <BuildDetails build={reference.snapshot} />
                  <p>
                    缺少药品：
                    {Object.entries(reference.snapshot.backpack)
                      .filter(([id, n]) => (g.inventory[id] ?? 0) < n)
                      .map(
                        ([id, n]) =>
                          `${itemName(id)}×${n - (g.inventory[id] ?? 0)}`,
                      )
                      .join("；") || "无"}
                  </p>
                  <p>
                    未拥有的旧忆节点：
                    {Object.keys(reference.snapshot.nodes)
                      .filter((id) => g.camp!.purchasedNodes[id] === undefined)
                      .join("、") || "无"}
                  </p>
                </>
              ) : (
                <p>导入后与当前阵容并排展示，不覆盖当前配置。</p>
              )}
            </article>
          </div>
        </>
      )}
      {tab === "records" && (
        <>
          <p>
            仅保留本月最新四次完整双战胜利。未上传不生成代码，可稍后再上传；条目不提供删除。
          </p>
          <label>
            需要覆盖时选择本月条目
            <select
              aria-label="覆盖榜单条目"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
            >
              <option value="">不覆盖</option>
              {(g.tavern?.entries ?? [])
                .filter(
                  (e) =>
                    !e.frozen &&
                    e.invalidatedAt === undefined &&
                    e.monthKey === g.camp!.monthKey,
                )
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.code}
                  </option>
                ))}
            </select>
          </label>
          <ItemPages label="魔王记录" size={2}>{[...(g.tavern?.records ?? [])].reverse().map((r) => (
            <div className="tavern-row" key={r.id}>
              <p>
                {r.totalRounds}完整轮次 · 周目消耗{r.spent}体力 ·{" "}
                {(r.elapsedMs / 1000).toFixed(1)}秒 · {r.version}
              </p>
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    replace &&
                    !confirm("覆盖该条目后，其旧代码与热度一起失效，确认？")
                  )
                    return;
                  void change((s) =>
                    uploadRecord(
                      s,
                      r.id,
                      crypto.randomUUID(),
                      replace || undefined,
                    ),
                  );
                }}
              >
                保存到本地榜单并生成代码
              </button>
            </div>
          ))}</ItemPages>
          {!g.tavern?.records.length && <p>尚无本月完整双战胜利。</p>}
        </>
      )}
      {tab === "boards" && (
        <>
          <label>
            月份
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <div className="tavern-tabs">
            {Object.entries(boards).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={board === id}
                onClick={() => setBoard(id as TavernBoard)}
              >
                {label}
              </button>
            ))}
          </div>
          <p>
            热度 = 查看×1 + 收藏×3 + 导入×6 +
            采用×10；自己查看、收藏和导入不增热度。历史条目冻结。
          </p>
          <ItemPages label="榜单条目" size={1} resetKey={`${board}:${month}`}>{leaderboard(g, board, month).map((e) => (
            <div className="tavern-row" key={e.id}>
              <p>
                #{e.rank} · {e.totalRounds}轮 · {e.spent}体力 ·{" "}
                {(e.elapsedMs / 1000).toFixed(1)}秒 · 热度{e.heat}{" "}
                {e.frozen ? "（历史冻结）" : ""}
              </p>
              <small>{e.version} · 成绩未经充分验证</small>
              <div>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (expanded === e.id) {
                      setExpanded(null);
                      return;
                    }
                    void change((s) =>
                      interact(s, e.id, s.tavern!.ownerId, "view", Date.now()),
                    ).then(() => setExpanded(e.id));
                  }}
                >
                  展开阵容
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void change((s) =>
                      interact(
                        s,
                        e.id,
                        s.tavern!.ownerId,
                        "favorite",
                        Date.now(),
                      ),
                    )
                  }
                >
                  收藏 / 取消收藏
                </button>
                <button
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(e.code)
                      .catch(() => setError("复制失败，请手动复制下面的代码。"))
                  }
                >
                  复制代码
                </button>
              </div>
              <p>{e.code}</p>
              {expanded === e.id && <BuildDetails build={e.snapshot} />}
            </div>
          ))}</ItemPages>
          {!leaderboard(g, board, month).length && <p>本月暂无本地条目。</p>}
        </>
      )}
      </div>
      </div>
    </section>
  );
}
