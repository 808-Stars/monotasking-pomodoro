import { useLayoutEffect, useRef } from "react";
import "./memory-atlas.css";
import {BookPager} from "../PageTurns.tsx";
import type { GameState } from "../../game/economy.ts";
import {
  canBuyMemoryNode,
  canUndoMemoryNode,
  connectedMemoryNodes,
  growthFor,
  hasFeature,
  memoryNodeCategory,
  memoryNodes,
  previewNodeRefund,
} from "../../game/camp/memory.ts";

const statKeys = {
  HP: "maxHp",
  SP: "maxSp",
  物攻: "attack",
  属攻: "magic",
  物防: "defense",
  属防: "resistance",
  速度: "speed",
  韧性: "tenacity",
} as const;
const sealPaths: Record<string, string> = {
  HP: "M12 20 4.5 12.5C-.5 7.5 6 1.5 12 7c6-5.5 12.5.5 7.5 5.5ZM6 8.5q1-2 3-.5",
  SP: "M12 3C10 7 5 11.5 5 15a7 7 0 0 0 14 0C19 11.5 14 7 12 3ZM8.5 14.5q-1 3 2 4",
  物攻: "M8 14 17 4l3-1-1 4-9 9ZM6 12l6 6M4 20l4-4M3 19l2 2",
  属攻: "M12 3 14.5 9.5 21 12 14.5 14.5 12 21 9.5 14.5 3 12 9.5 9.5ZM18 4l2 2",
  物防: "M12 3 4 6v6c0 4.5 5 7.5 8 9 3-1.5 8-4.5 8-9V6ZM8 7.5l4-1.5 4 1.5M12 8v9",
  属防: "M12 3 4 6v6c0 4.5 5 7.5 8 9 3-1.5 8-4.5 8-9V6ZM12 7l3.5 5-3.5 5-3.5-5Z",
  速度: "M13 3h6l-4.5 7H20L9 21l2-8H5ZM3 5h5M2 9h3",
  韧性: "M12 3 5 6v7l7 8 7-8V6ZM8 11l4 4 4-4M12 7v8",
  root: "M12 2v20M2 12h20M5 5l14 14M5 19 19 5M12 6l6 6-6 6-6-6Z",
  skill: "M12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9ZM3 3l3 3M18 18l3 3",
  job: "M5 9 8 4h8l3 5v11H5ZM8 9h8M9 14h6M9 17h4",
  support: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20v-2c0-5 12-5 12 0v2M19 6v6M16 9h6",
  shop: "M3 9 5 4h14l2 5M3 9v2a2 2 0 0 0 4 0 2 2 0 0 0 5 0 2 2 0 0 0 5 0 2 2 0 0 0 4 0V9ZM5 13v7h14v-7M10 20v-5h4v5",
  slot: "M8 3h8l5 6-9 12L3 9ZM3 9h18M8 3l4 18 4-18",
  unlock: "M9 10V7a4 4 0 0 1 7.5-2M5 10h14v10H5ZM12 14v3",
  resource: "M12 3 20 7.5v9L12 21l-8-4.5v-9ZM4 7.5l8 4.5 8-4.5M12 12v9",
};

function MemorySealFrame({ shape }: { shape: string }) {
  const outline = shape === "permanent"
    ? "M50 3 97 50 50 97 3 50Z"
    : shape === "function" || shape === "root"
      ? "M50 3 61 25 83 17 75 39 97 50 75 61 83 83 61 75 50 97 39 75 17 83 25 61 3 50 25 39 17 17 39 25Z"
      : "M13 3H87L97 13V87L87 97H13L3 87V13Z";
  return <span className="memory-seal-rim" aria-hidden="true">
    <svg viewBox="0 0 100 100" fill="none" focusable="false">
      <path className="seal-outer" d={outline} />
      <path className="seal-inner" d={outline} transform="translate(6 6) scale(.88)" />
      <path className="seal-inlay" d={outline} transform="translate(10 10) scale(.8)" />
      <path className="seal-pins" d="M50 5l2 3-2 3-2-3ZM50 89l2 3-2 3-2-3Z" />
    </svg>
  </span>;
}

function functionSeal(label: string) {
  if (label.startsWith("EX")) return "skill";
  if (label.includes("副职业")) return "job";
  if (label.includes("辅助")) return "support";
  if (label.includes("商店")) return "shop";
  if (label.includes("槽")) return "slot";
  if (label.includes("资源")) return "unlock";
  return "resource";
}

function MemorySeal({ kind }: { kind: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={sealPaths[kind] ?? sealPaths.resource} />
  </svg>;
}

type Props = {
  game: GameState;
  node: string;
  busy: boolean;
  onSelect: (id: string) => void;
  onPurchase: () => void;
  onRefund: () => void;
};

export default function MemoryAtlas({
  game: g,
  node,
  busy,
  onSelect,
  onPurchase,
  onRefund,
}: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    // Fit the whole logical board, keeping seals and link geometry together.
    const fit = () => {
      const scale = Math.max(0, Math.min((el.clientWidth - 8) / 792, (el.clientHeight - 8) / 792));
      el.style.setProperty("--memory-board-scale", String(scale));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const selected = memoryNodes.find((n) => n.id === node)!;
  const owned = hasFeature(g, node);
  const connected = connectedMemoryNodes(g);
  const reachable = canBuyMemoryNode(g, node, connected);
  const category = memoryNodeCategory(selected);
  const undo = canUndoMemoryNode(g, node)
    ? previewNodeRefund(g, node)
    : undefined;
  const remaining = undo
    ? new Set(
        Object.keys(g.camp!.purchasedNodes).filter(
          (id) => !undo.ids.includes(id),
        ),
      )
    : undefined;
  const afterUndo = remaining ? connectedMemoryNodes(g, remaining) : connected;
  const disconnectedProtected = undo
    ? memoryNodes.filter(
        (n) =>
          hasFeature(g, n.id) &&
          ["permanent", "function"].includes(memoryNodeCategory(n)) &&
          !afterUndo.has(n.id),
      )
    : [];
  const growth = growthFor(g);
  const stat = selected.stat as keyof typeof statKeys | undefined;
  const overview = <div className="memory-map-heading">
        <div>
          <p>从共同起点，沿连线唤回八人的旧忆。</p>
        </div>
        <dl className="memory-balance">
          <div>
            <dt>可分配旧忆</dt>
            <dd>{g.exp.toLocaleString("zh-CN")}</dd>
          </div>
          <div>
            <dt>已解锁</dt>
            <dd>
              {Object.keys(g.camp!.purchasedNodes).length - 1}
              <small> / 80</small>
            </dd>
          </div>
        </dl>
      </div>;
  return (
    <section className="memory-atlas memory-chart">
      <div className="memory-workspace">
        <div className="memory-map">
          <div className="memory-scroll" ref={viewport}>
            <div className="memory-board-fit">
            <div className="memory-grid">
              <svg
                className="memory-edges"
                viewBox="0 0 900 900"
                aria-hidden="true"
              >
                {memoryNodes.flatMap((a) =>
                  a.links
                    .filter((b) => a.id < b)
                    .map((b) => {
                      const other = memoryNodes.find((x) => x.id === b)!;
                      const aOwned = connected.has(a.id),
                        bOwned = connected.has(b);
                      return (
                        <line
                          key={a.id + b}
                          className={`${a.id === node || b === node ? "inspected " : ""}${
                            aOwned && bOwned
                              ? "traced"
                              : aOwned || bOwned
                                ? "frontier"
                                : ""
                          }`}
                          x1={(Number(a.id[3]) - 0.5) * 100}
                          y1={(Number(a.id[1]) - 0.5) * 100}
                          x2={(Number(other.id[3]) - 0.5) * 100}
                          y2={(Number(other.id[1]) - 0.5) * 100}
                        />
                      );
                    }),
                )}
              </svg>
              {memoryNodes.map((x) => {
                const bought = hasFeature(g, x.id);
                const open = canBuyMemoryNode(g, x.id, connected);
                const nodeCategory = memoryNodeCategory(x);
                const disconnected = bought && !connected.has(x.id);
                const type =
                  x.kind === "属性"
                    ? "attribute"
                    : x.kind === "功能"
                      ? "function"
                      : "origin";
                return (
                  <button
                    key={x.id}
                    aria-label={`${x.id} ${x.label}`}
                    aria-pressed={node === x.id}
                    title="点击在侧栏查看节点详情"
                    className={`memory-node ${type}${type === "attribute" ? ` ${nodeCategory}` : ""} ${bought ? "owned" : open ? "reachable" : "dormant"}${disconnected ? " disconnected" : ""}${node === x.id ? " selected" : ""}`}
                    style={{
                      gridRow: Number(x.id[1]),
                      gridColumn: Number(x.id[3]),
                    }}
                    onClick={() => onSelect(x.id)}
                  >
                    <span className="memory-node-mark" aria-hidden="true">
                      <MemorySealFrame shape={nodeCategory} />
                      <MemorySeal kind={type === "origin" ? "root" : type === "attribute" ? x.stat ?? "resource" : functionSeal(x.label)} />
                    </span>
                    {disconnected && <span className="memory-node-retained" aria-label="脱节，效果保留">◆</span>}
                  </button>
                );
              })}
            </div>
            </div>
          </div>
        </div>
        <aside className="memory-inspector" aria-label="所选节点详情">
          <BookPager label="旧忆详情" resetKey={node}>
          {overview}
          <div className="memory-selection-meta">
            <span>{node}</span>
            <span>
              {selected.kind === "属性"
                ? category === "permanent" ? "永久刻印" : "属性刻印"
                : selected.kind === "功能"
                  ? "功能铭牌"
                  : "共同起点"}
            </span>
          </div>
          <h3>{selected.label}</h3>
          <dl className="memory-detail-list">
            <div>
              <dt>旧忆费用</dt>
              <dd>{selected.cost.toLocaleString("zh-CN")}</dd>
            </div>
            <div>
              <dt>节点状态</dt>
              <dd>
                {owned
                  ? connected.has(node)
                    ? "已解锁"
                    : "已解锁 · 脱节保留"
                  : reachable
                    ? "可解锁"
                    : "尚未开放"}
              </dd>
            </div>
          </dl>
          <div className="memory-prerequisites">
            <h4>解锁条件</h4>
            <p>
              {node === "R5C5"
                ? "八人共享的起点，初始开放。"
                : "沿实际连线，与可抵达共同起点的已购节点相连；前置只要求已购。"}
            </p>
            {selected.requires.length > 0 && (
              <ul>
                {selected.requires.map((id) => (
                  <li key={id} className={hasFeature(g, id) ? "met" : ""}>
                    <span aria-hidden="true">
                      {hasFeature(g, id) ? "✓" : "—"}
                    </span>{" "}
                    {memoryNodes.find((x) => x.id === id)?.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {stat && (
            <p className="memory-node-preview">
              当前{stat}累计 <b>+{Math.round(growth[statKeys[stat]] * 100)}%</b>
              {!owned && (
                <>
                  <br />
                  解锁后增加 +{selected.growth}%
                </>
              )}
            </p>
          )}
          {!owned ? (
            <div className="memory-node-actions">
              <button
                className="primary"
                disabled={busy || !reachable || g.exp < selected.cost}
                onClick={onPurchase}
              >
                唤醒旧忆
              </button>
              <p>
                {!reachable
                  ? "先连通路线，并满足所需前置。"
                  : g.exp < selected.cost
                    ? `还需 ${(selected.cost - g.exp).toLocaleString("zh-CN")} 旧忆。`
                    : "购买前可预览，取消不消耗旧忆。"}
              </p>
            </div>
          ) : undo ? (
            <div className="memory-node-actions">
              <button
                disabled={
                  busy || (g.inventory["memory-scroll"] ?? 0) < undo.cost
                }
                onClick={onRefund}
              >
                用溯流卷撤销
              </button>
              <div className="memory-protection-refund-preview">
                <p>
                  仅撤销普通属性节点；消耗 {undo.cost} 卷，合计退还{" "}
                  {undo.refund.toLocaleString("zh-CN")} 旧忆。
                </p>
                <ul>
                  {undo.ids.map((id) => (
                    <li key={id}>
                      {id === node ? "主动" : "连带"}：{id}{" "}
                      {memoryNodes.find((n) => n.id === id)?.label} · 退还{" "}
                      {g.camp!.purchasedNodes[id]} 旧忆
                    </li>
                  ))}
                </ul>
                {disconnectedProtected.length > 0 && (
                  <>
                    <p>
                      以下保护节点脱节，但保留已购状态、效果与槽位，不消耗卷、不退款：
                    </p>
                    <ul>
                      {disconnectedProtected.map((n) => (
                        <li key={n.id}>
                          {n.id} {n.label}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {(g.inventory["memory-scroll"] ?? 0) < undo.cost && (
                  <p>溯流卷不足，需 {undo.cost} 卷。</p>
                )}
              </div>
            </div>
          ) : category !== "root" ? (
            <p className="memory-protection-warning">
              {category === "permanent" ? "永久节点" : "功能节点"}
              不可撤销；脱节后保留效果与解锁，不会卸下辅助或尘玉。
            </p>
          ) : (
            <p className="memory-root-note">选择相邻刻印，开启你的成长路线。</p>
          )}
          <div className="memory-growth">
            <h4>全队累计增幅</h4>
            <dl>
              {Object.entries(statKeys).map(([name, key]) => (
                <div key={key} className={growth[key] > 0 ? "increased" : ""}>
                  <dt>{name}</dt>
                  <dd>+{Math.round(growth[key] * 100)}%</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="memory-footnote">加点不治疗、不复活；同类增幅相加。</p>
          <section className="memory-guide" aria-label="图谱阅读说明">
            <h4>图谱图例</h4>
            <div className="memory-legend" aria-label="节点状态图例">
              <span><i className="owned" />已解锁</span>
              <span><i className="reachable" />可解锁</span>
              <span><i className="dormant" />未连通 / 前置未满足</span>
            </div>
            <div className="memory-legend memory-protection-legend" aria-label="节点分类图例">
              <span><i className="ordinary" />普通属性 · 可撤销</span>
              <span><i className="permanent" />永久节点 · 不可撤销</span>
              <span><i className="function" />功能节点 · 不可撤销</span>
            </div>
            <p className="memory-protection-warning">
              永久与功能节点脱节后保留效果，但不能作为孤立购买入口。永久保护仅限本周目。
            </p>
          </section>
      {g.camp!.migrationNotice && (
        <details className="memory-notice">
          <summary>
            {g.camp!.memoryMigration
              ? `已返还 ${g.camp!.memoryMigration.refundedExp} 旧忆 · 存档迁移说明`
              : "关于旧忆成长与原有进度"}
          </summary>
          <p>
            {g.camp!.memoryMigration
              ? `已切换到第5版旧忆网，旧节点实际投入的${g.camp!.memoryMigration.refundedExp}旧忆已一次性返还，请重新加点。其他进度保留，辅助技能保留前1项，其余原装配已备份。`
              : "已启用无等级成长；原累计旧忆保留为余额，请自行分配。"}
            购点不会自动治疗或复活；非沙盒挑战入场扣20体力并自动恢复八人。
          </p>
        </details>
      )}
          </BookPager>
        </aside>
      </div>
    </section>
  );
}
