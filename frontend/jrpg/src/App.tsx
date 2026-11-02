import {SceneDisplayControls,SceneOverlay,SceneSurface} from "./presentation/SceneDisplay.tsx";
import {CloudStatus,CloudRuntimeNote} from "./cloud/CloudGame.tsx";
import {DialogueText} from './features/camp/DialogueText.tsx';
import { useEffect, useRef, useState } from "react";
import { isEditingTarget } from "./presentation/keyboard.ts";
import { useBattleDirector, type BattleLayoutGate } from "./presentation/useBattleDirector.ts";
import { advanceOpening, sceneKeyFor, type BattleSceneCheckpoint } from "./presentation/battleSceneState.ts";
import {
  systemReducedMotion,
} from "./presentation/battlePreferences.ts";
import { PixelEffect } from "./presentation/Motion.tsx";
import { bossAppearance } from "./presentation/enemyArt.ts";
import DungeonDeparture from "./features/DungeonDeparture.tsx";
import {
  dungeons,
  dungeonOrder,
  doorCleared,
  doorDiscovery,
  resourceEncounter,
  type Difficulty,
} from "./game/dungeons.ts";
import CampPanel from "./features/camp/CampPanel.tsx";
import {BookPager,ItemPages} from "./features/PageTurns.tsx";
import {useCampPagination} from "./features/camp/useCampPagination.ts";
import TavernPanel from "./features/camp/TavernPanel.tsx";
import CampMap from "./features/camp/CampMap.tsx";
import { CampItemMark } from "./features/camp/CampArtwork.tsx";
import { jobNames } from "./game/camp/catalog.ts";
import { reconcileBackpack } from "./game/camp/backpack.ts";
import {hasShopAccess} from "./game/camp/shop.ts";
import { migrateCamp, clampCampVitals } from "./game/camp/migrate.ts";
import { features, hasFeature } from "./game/camp/memory.ts";
import { isMonthExpired, rollMonth } from "./game/camp/month.ts";
import BattleView, { Gauge, intentInfo } from "./features/BattleView.tsx";
import {
  resolveCommand,
  resolveEnemy,
  names,
  learned,
  skillBook,
  type Command,
} from "./game/battle.ts";
import {
  createGame,
  heroStats,
  levelForExp,
  expForLevel,
  jobs,
  resourceNames,
  rewards,
  rewardId,
  rewardValue,
  medicines,
  grantStamina,
  buyMedicines,
  processRewards,
  sweep,
  settleBattle,
  type Resource,
  type GameState,
} from "./game/economy.ts";
import {
  loadSave,
  resetUnavailableSave,
  saveCheckpoint,
  type Save,
} from "./game/persistence.ts";
import { startChallenge, finishChallenge } from "./game/challenge.ts";
const scenes = [
  {
    name: "匠舍",
    job: "warrior",
    symbol: "砧",
    line: "这道旧刃口还能用。把石头放到灯下，我替你看看。",
    options: ["分析尘玉", "镶嵌尘玉", "合成尘玉", "升阶尘玉", "查看尘玉库存"],
    resource: "gem",
  },
  {
    name: "酒馆",
    job: "dancer",
    symbol: "酌",
    line: "给你留了张椅子。补给也备好了，坐下慢慢清点。",
    options: ["查看体力补给", "调整出战队伍", "配置辅助技能", "整理战斗背包", "配置尘玉", "对比阵容", "查看魔王记录", "查看排行榜"],
  },
  {
    name: "商店",
    job: "merchant",
    symbol: "衡",
    line: "今天还是老样子吗？新到的货还没上架，要不要先看看？",
    options: [
      "清点带回来的东西",
      "看看你有什么货",
      "来点狠货怎么样",
      "来点……你懂的",
      "打开仓库与背包",
    ],
    resource: "coin",
  },
  {
    name: "书库",
    job: "scholar",
    symbol: "卷",
    line: "两份记录，同一条路，却写着不同的出口……你看见了什么？",
    options: ["翻阅首领记录", "看看这段旅程"],
  },
  {
    name: "圣堂",
    job: "cleric",
    symbol: "祈",
    line: "灯还亮着。坐一会儿吧，我们慢慢理清那些残响。",
    options: ["引导残响", "学习职业技能", "配置辅助技能", "查看EX资格", "查看PP专属指令"],
    resource: "jp",
  },
  {
    name: "驿站",
    job: "thief",
    symbol: "途",
    line: "车还没走。先把同行的人定下来，再检查行装。",
    options: ["调整出战队伍", "办理副职业资格"],
  },
  {
    name: "猎场",
    job: "hunter",
    symbol: "迹",
    line: "弓弦松了半寸。走过的路也是这样，得停下来看看。",
    options: ["研习旧忆", "看看成长进度"],
    resource: "exp",
  },
  {
    name: "药坊",
    job: "apothecary",
    symbol: "草",
    line: "这味药快研好了。先把袖子卷起来，让我看看伤口。",
    options: ["整理战斗背包", "调和药品", "分解药品"],
  },
];
const spritePosition = (index: number, columns: number, rows: number) => {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const x = columns === 1 ? 0 : (column / (columns - 1)) * 100;
  const y = rows === 1 ? 0 : (row / (rows - 1)) * 100;
  return `${x}% ${y}%`;
};
type Page = "camp" | "map" | "dungeon" | "final";
type Modal =
  | "process"
  | "shop"
  | "party"
  | "codex"
  | "jp"
  | "exp"
  | "gem"
  | "stamina"
  | "medicine"
  | "achievements"
  | "tavern"
  | null;
export default function App() {
  const [save, setSave] = useState<Save | null>(null);
  const ref = useRef<Save | null>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState<Page>("camp");
  const [campView, setCampView] = useState<"map" | "scene">("map");
  const campViewport = useRef<HTMLDivElement | null>(null);
  const mapViewport = useRef<HTMLElement | null>(null);
  const campReady = !!save && !save.battle && page === "camp";
  useCampPagination(campReady);
  const mapReady = !!save && !save.battle && page === "map";
  useEffect(() => {
    if (campReady) campViewport.current?.scrollIntoView({block:"start",behavior:"instant"});
  }, [campReady, campView]);
  useEffect(() => {
    if (mapReady) mapViewport.current?.scrollIntoView({block:"start",behavior:"instant"});
  }, [mapReady]);
  const [door, setDoor] = useState<Resource>("coin");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [scene, setScene] = useState(1);
  const [campNavOpen, setCampNavOpen] = useState(false);
  function enterCamp() {
    setCampView("map");
    setCampNavOpen(false);
    setPage("camp");
  }
  function enterCampScene(index: number) {
    setScene(index);
    setCampView("scene");
    setCampNavOpen(false);
    setNotice("");
    setModal(null);
  }
  const [modal, setModal] = useState<Modal>(null);
  const [campEntry, setCampEntry] = useState("");
  const [shopTier, setShopTier] = useState(0);
  const [clockNow, setClockNow] = useState(Date.now());
  const [codexSearch, setCodexSearch] = useState("");
  useEffect(() => {
    const id = setInterval(() => setClockNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [dropList, setDropList] = useState<string[]>([]);
  const director = useBattleDirector();
  const presentation = director.frame?.state ?? null;
  const firstEvent = director.frame?.beat.events[0];
  const event = firstEvent ? { ...firstEvent, sequence: director.frame!.index } : null;
  const battleLayout = useRef<BattleLayoutGate | null>(null);
  const battleInput = useRef(false);
  const sceneWrites = useRef<Promise<void>>(Promise.resolve());
  const terminalAttempt = useRef<string | null>(null);
  const terminalTimestamp = useRef<{key:string;value:number} | null>(null);
  const [terminalSaveIssue,setTerminalSaveIssue] = useState<{key:string;message:string} | null>(null);
  async function saveScene(next: BattleSceneCheckpoint) {
    const pending = sceneWrites.current.then(async () => {
      const current = ref.current;
      if (!current?.battle || sceneKeyFor(current.battle) !== next.key) return;
      if (lock.current) throw Error("正在保存战斗，请稍后重试开幕进度。");
      const previous = current.battleScene;
      const merged = previous?.key === next.key ? advanceOpening(previous,next.openingElapsedMs) : next;
      const stored = await saveCheckpoint(current,current.game,current.battle,false,merged);
      ref.current = stored; setSave(stored);
    });
    sceneWrites.current = pending.catch(() => {});
    return pending;
  }
  const [reducedMotion, setReducedMotion] = useState(() => {
    try {
      const saved = localStorage.getItem("monopomo-motion");
      return saved ? saved === "static" : systemReducedMotion();
    } catch {
      return true;
    }
  });
  const [campPulse, setCampPulse] = useState(0);
  const [campEffect, setCampEffect] = useState("reward");
  function toggleMotion() {
    const next = !reducedMotion;
    setReducedMotion(next);
    try {
      localStorage.setItem("monopomo-motion", next ? "static" : "dynamic");
    } catch {
      /* Preference storage must not block play. */
    }
  }
  const modalOpener = useRef<HTMLElement | null>(null);
  const modalDialog = useRef<HTMLElement | null>(null);
  const restoreModalFocus = useRef(false);
  useEffect(() => {
    if (!modal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace"&&!isEditingTarget(e.target)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat&&(!lock.current || modal === "codex")) {
          restoreModalFocus.current = true;
          setModal(null);
        }
      }
      if (e.key === "Tab" && modalDialog.current) {
        const items = Array.from(
          modalDialog.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
          ),
        ).filter((el) => el.getClientRects().length);
        const first = items[0],
          last = items.at(-1);
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          !items.includes(document.activeElement as HTMLElement) ||
          (e.shiftKey
            ? document.activeElement === first
            : document.activeElement === last)
        ) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [modal]);
  useEffect(() => {
    if (!modal && restoreModalFocus.current) {
      restoreModalFocus.current = false;
      const frame = requestAnimationFrame(() => modalOpener.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [modal]);
  useEffect(() => {
    loadSave()
      .then((s) => {
        ref.current = s;
        setSave(s);
      })
      .catch((e) => setError(String(e)));
  }, []);
  async function commit(
    game: GameState,
    battle = ref.current?.battle ?? null,
    reset = false,
  ) {
    if (
      !ref.current?.battle &&
      isMonthExpired(ref.current!.game) &&
      game.camp?.monthKey === ref.current!.game.camp?.monthKey
    )
      throw Error("上期已结束，请先确认归档并开启本月。");
    await sceneWrites.current;
    const s = await saveCheckpoint(
      ref.current!,
      battle ? game : migrateCamp(game),
      battle,
      reset,
    );
    ref.current = s;
    setSave(s);
  }
  async function commitCamp(
    change: (g: GameState) => GameState,
    revision: number,
  ) {
    if (lock.current) throw Error("正在保存，请稍候。");
    if (!ref.current || ref.current.revision !== revision)
      throw Error("预览已过期，请重新预览。");
    if (ref.current.battle) throw Error("战斗期间不能修改营地配置。");
    lock.current = true;
    setBusy(true);
    try {
      await commit(
        reconcileBackpack(clampCampVitals(change(ref.current.game))),
        null,
      );
      setCampEffect(
        scene === 5
          ? "heal"
          : scene === 7
            ? "cleanse"
            : scene === 4
              ? "boost"
              : "reward",
      );
      setCampPulse((n) => n + 1);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function recoverUnavailableSave() {
    if (
      !confirm("仅清除 MONOPOMO JRPG Demo 的损坏存档并重新开始？") ||
      !confirm("再次确认：此操作会清除这个Demo的进度，不影响其他网站数据。")
    )
      return;
    setBusy(true);
    setError("");
    try {
      const fresh = await resetUnavailableSave();
      ref.current = fresh;
      setSave(fresh);
      enterCamp();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function perform(c?: Command) {
    if (!battleInput.current) return;
    await run(async () => {
      const s = ref.current!;
      const result = c ? resolveCommand(s.battle!, c) : resolveEnemy(s.battle!);
      director.hold(s.battle!);
      try {
        await commit(s.game, result.state);
        const played = await director.play(s.battle!, result.events, {
          nextFocusId:result.state.outcome === "active" ? result.state.party.find(unit=>unit.id===result.state.current[0]?.unitId && unit.hp>0)?.id ?? null : null,
          onFocus:(id,signal)=>battleLayout.current?.(id,signal) ?? Promise.resolve(),
        });
        if(!played)return;
      } catch (cause) { director.clear(); throw cause; }
      // Finish timing after the last presentation beat. An interrupted animation
      // remains untimed until resume/settlement, so closed-tab time is included.
      if (result.state.outcome !== "active" && !result.state.endedAt && ref.current?.battle
        && sceneKeyFor(ref.current.battle) === sceneKeyFor(result.state)) {
        await persistTerminalTime(sceneKeyFor(result.state));
      }
    });
  }
  async function persistTerminalTime(key: string) {
    const saved = ref.current;
    if (!saved?.battle || sceneKeyFor(saved.battle) !== key || saved.battle.endedAt) return;
    // Retries preserve when presentation actually finished, not the later time
    // at which the player managed to save it successfully.
    const value = terminalTimestamp.current?.key === key ? terminalTimestamp.current.value : Date.now();
    terminalTimestamp.current = {key,value};
    terminalAttempt.current = key;
    try {
      await commit(saved.game,{...saved.battle,endedAt:value});
      setTerminalSaveIssue(null);
    } catch (cause) {
      terminalAttempt.current = null;
      setTerminalSaveIssue({key,message:cause instanceof Error ? cause.message : String(cause)});
      throw cause;
    }
  }
  function restoreTerminalTime(retry = false) {
    const current = ref.current, battle = current?.battle;
    if (!current || !battle || battle.outcome === "active" || battle.endedAt || lock.current
      || current.battleScene?.phase === "opening") return;
    const key = sceneKeyFor(battle);
    if (!retry && terminalSaveIssue?.key === key) return;
    if (terminalAttempt.current === key) return;
    terminalAttempt.current = key;
    if (retry) setTerminalSaveIssue(null);
    void run(() => persistTerminalTime(key));
  }
  async function finish() {
    await run(async () => {
      const s = ref.current!,
        b = s.battle!;
      if (b.outcome === "active") return;
      if (!b.endedAt) throw Error("战斗结束时间尚未保存，请先重试保存再继续结算。");
      if (isMonthExpired(s.game)) {
        await commit(s.game, null);
        enterCamp();
        setModal(null);
        setNotice("上期战斗结束；已跨月，不向新期发放旧期奖励。请确认归档。");
        return;
      }
      if (b.finale) {
        const completed = finishChallenge(s);
        await commit(completed.game, completed.battle);
        if (completed.battle) return;
        enterCamp();
        setDropList([]);
        setNotice(
          b.sandbox
            ? "魔王沙盒结束，不消耗场外库存、不生成成绩记录。"
            : b.outcome === "victory"
              ? "魔王双战胜利已保存到本地最新四次记录，可在酒馆选择上传。独立AI仍是原型，成绩未经充分验证。"
              : "魔王挑战结束，下一次正式挑战从第一场重新开始并扣20体力。失败奖励档位尚未定稿，本原型不代发资源门奖励。",
        );
        return;
      }
      const r = settleBattle(s.game, {
        ...b,
        outcome: b.outcome,
        heroes: Object.fromEntries(
          b.party.map((u) => [u.id, { hp: u.hp, sp: u.sp }]),
        ),
      });
      await commit(r.game, null);
      enterCamp();
      setDropList(r.rewards);
      setNotice(
        b.sandbox
          ? "沙盒重战结束。正式HP、SP、药品库存未消耗。"
          : b.outcome === "victory"
            ? `${dungeons[b.resource ?? "coin"].boss}已被击退。本门${b.difficulty === "advanced" ? "进阶" : "普通"}扫荡已开放，首胜奖励已入物品库存，请前往${scenes[dungeons[b.resource ?? "coin"].scene].name}处理。`
            : "本次挑战结束。下次非沙盒挑战消耗20体力，并自动恢复全八人；背包药品不会补满。",
      );
    });
  }
  function open(m: Modal, entry = "") {
    modalOpener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setSelection({});
    setCart({});
    setNotice("");
    setCampEntry(entry);
    setModal(m);
  }
  function closeModal() {
    if (lock.current && modal !== "codex") return;
    restoreModalFocus.current = scene === 2 && page === "camp" && !save?.battle;
    setModal(null);
  }
  function resetDemo() {
    if (
      busy ||
      !confirm(
        "Reset Demo：清除这个Demo的战斗、成长和库存？不会修改原效率系统。",
      ) ||
      !confirm("再次确认：清空本地冒险并重新分配旧忆？此操作不可撤销。")
    )
      return;
    void run(async () => {
      await commit(createGame(), null, true);
      enterCamp();
      setModal(null);
      setDropList([]);
      setNotice("Demo已重置。");
    });
  }
  if (!save)
    return (
      <main className="loading">
        <span>MONOPOMO</span>
        <h1>{error ? "存档暂不可用" : "正在点亮营地的灯火…"}</h1>
        {error && <p role="alert">{error}</p>}
        <p><CloudRuntimeNote /></p>
        {error && (
          <button disabled={busy} onClick={() => void recoverUnavailableSave()}>
            双确认重置此Demo存档
          </button>
        )}
      </main>
    );
  const g = save.game,
    level = levelForExp(g.exp),
    current = scenes[scene],
    resource = (current.resource ?? "coin") as Resource;
  const codexDoor = save.battle?.resource ?? door;
  const codexDifficulty = save.battle?.difficulty ?? difficulty;
  const codexEncounter = resourceEncounter(codexDoor, codexDifficulty);
  const codexDiscovery = doorDiscovery(g, codexDoor, codexDifficulty);
  const total = rewardValue(
      g,
      resource,
      rewards
        .filter((r) => r.resource === resource)
        .reduce((sum, r) => sum + r.value * (selection[r.id] ?? 0), 0),
    ),
    cost = medicines.reduce((sum, m) => sum + m.price * (cart[m.id] ?? 0), 0);
  const change = (
    id: string,
    n: number,
    set: (v: Record<string, number>) => void,
    source: Record<string, number>,
    max: number,
  ) =>
    set({
      ...source,
      [id]: Math.max(0, Math.min(max, Math.floor(Number.isFinite(n) ? n : 0))),
    });
  function option(i: number) {
    if (current.resource && i === 0) {
      open("process");
      return;
    }
    if (scene === 0) open("gem", ["", "equip", "forge", "upgrade", "inventory"][i]);
    if (scene === 1) {
      if (i === 0) open("stamina");
      else open("tavern", ["", "party", "supports", "bag", "gem", "compare", "records", "boards"][i]);
    }
    if (scene === 5) open("party", i === 0 ? "party" : "subjob");
    if (scene === 2) {
      if(i===4){open("shop","warehouse");return;}
      setShopTier(i - 1);
      open("shop");
    }
    if (scene === 3) open(i ? "achievements" : "codex");
    if (scene === 4) open("jp", ["", "skills", "supports", "ex", "pp"][i]);
    if (scene === 6) open("exp");
    if (scene === 7) open("medicine", ["bag", "craft", "dismantle"][i]);
  }
  return (
    <div className={`app-shell ${!save.battle && reducedMotion ? "motion-reduced" : ""}`}>
      {campPulse > 0 && !save.battle && !reducedMotion && (
        <PixelEffect
          effect={campEffect}
          token={campPulse}
          duration={450}
          className="camp-fx"
        />
      )}
      {!save.battle && isMonthExpired(g, clockNow) && (
        <section className="month-notice" role="status">
          <h2>上期旅程已结束</h2>
          <p>
            归档{g.camp?.monthKey}
            的消耗、成长与记录；本月资源、学习及库存按新旅程重建。永久成就保留。
          </p>
          <button
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  "确认归档上期并开启本月？上期消耗及成长摘要将保留，当期资源将重建。",
                )
              )
                void run(async () => {
                  await commit(rollMonth(ref.current!.game), null);
                  setModal(null);
                });
            }}
          >
            归档并开启本月
          </button>
        </section>
      )}
      <header className="topbar">
        <CloudStatus />
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (!save.battle) {
              enterCamp();
              setModal(null);
            }
          }}
        >
          <span className="brand-mark">M</span>
          <span>
            MONOPOMO<small>月下行旅 · JRPG DEMO</small>
          </span>
        </a>
        <div className="resources">
          <span>
            体力 <b>{g.stamina}</b>
          </span>
          <span>
            周目消耗 <b>{g.spent}</b>
          </span>
        </div>
        <button className="quiet reset" disabled={busy} onClick={resetDemo}>
          Reset Demo
        </button>
      </header>
      {error && !modal && (
        <div role="alert" className="error-banner">
          {error}
          <button onClick={() => setError("")}>关闭</button>
        </div>
      )}
      {save.battle ? (
        <BattleView
          key={`${save.battle.id}:${save.battle.finale?.stage ?? 0}`}
          s={presentation ?? save.battle}
          busy={busy}
          event={event}
          beat={director.frame?.beat}
          sceneCheckpoint={save.battleScene}
          onSceneCheckpoint={saveScene}
          focus={director.focus}
          layoutGateRef={battleLayout}
          onInputReady={ready=>{battleInput.current=ready;}}
          onResultReady={restoreTerminalTime}
          settlementReady={!!save.battle.endedAt}
          resultSaveError={terminalSaveIssue?.key === sceneKeyFor(save.battle) ? terminalSaveIssue.message : undefined}
          onRetryResultSave={()=>restoreTerminalTime(true)}
          onCommand={(c) => void perform(c)}
          onEnemy={() => void perform()}
          onFinish={() => void finish()}
          onCodex={() => open("codex")}
        />
      ) : (
        <>
          <nav className="main-nav camp-runtime-notes" aria-label="运行说明">
            <span>四门资源原型 · 独立旅程</span>
            <span><CloudRuntimeNote /></span>
            <span>资源门与双战原型 / 酒馆可配置阵容 / 未接入效率系统</span>
            <SceneDisplayControls />
          </nav>
          <SceneSurface kind={page}>
          {page === "camp" ? (
            <div className="camp-layout" ref={campViewport}>
              {campView === "map" ? (
                <CampMap scenes={scenes} onEnter={enterCampScene} onAdventure={() => {
                  setCampNavOpen(false);
                  setNotice("");
                  setPage("map");
                }} />
              ) : (
              <>
              <button className="camp-map-return" onClick={enterCamp}>
                <span aria-hidden="true">←</span> 营地地图
              </button>
              <button
                className="camp-nav-toggle"
                aria-label={campNavOpen ? "收起营地导航" : "展开营地导航"}
                aria-expanded={campNavOpen}
                aria-controls="camp-navigation"
                onClick={() => setCampNavOpen(!campNavOpen)}
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="4.93" y="4.93" width="14.14" height="14.14" />
                  <rect
                    x="4.93"
                    y="4.93"
                    width="14.14"
                    height="14.14"
                    transform="rotate(45 12 12)"
                  />
                </svg>
              </button>
              {campNavOpen && (
                <aside
                  id="camp-navigation"
                  className="camp-nav"
                  aria-label="营地场景"
                  onKeyDown={(e) => {
                    if (e.key === "Backspace"&&!isEditingTarget(e.target)) {
                      e.preventDefault();e.stopPropagation();
                      setCampNavOpen(false);
                      document
                        .querySelector<HTMLButtonElement>(".camp-nav-toggle")
                        ?.focus();
                    }
                  }}
                >
                  <span className="eyebrow">CAMP / 八处灯火</span>
                  <button onClick={enterCamp}><span>◇</span><b>营地地图</b></button>
                  <ItemPages label="营地场所" size={4}>
                  {scenes.map((s, i) => (
                    <button
                      key={s.name}
                      className={scene === i ? "active" : ""}
                      onClick={() => {
                        enterCampScene(i);
                        document
                          .querySelector<HTMLButtonElement>(".camp-nav-toggle")
                          ?.focus();
                      }}
                    >
                      <span>0{i + 1}</span>
                      <b>{s.name}</b>
                      <small>{names[s.job]}</small>
                    </button>
                  ))}
                  </ItemPages>
                </aside>
              )}
              <section className={`scene scene-${scene}`}>
                <div className="scene-art" aria-label={`${current.name}场景`}>
                  <div className="moon" />
                  <div className="scene-title">
                    <span className="eyebrow">A MOMENT BETWEEN JOURNEYS</span>
                    <h1>{current.name}</h1>
                    <p>
                      {
                        [
                          "火光照亮石中的纹路",
                          "把未说完的故事留在杯底",
                          "每一次归来，都值得清点",
                          "失落的故事仍有人记得",
                          "让尚未成形的力量找到归处",
                          "在下一次出发以前",
                          "脚印，是大地留下的书页",
                          "给疲惫的人一点余地",
                        ][scene]
                      }
                    </p>
                  </div>
                  <span className="scene-art-label">SCENE · CHARACTER ART</span>
                </div>
                <div className="dialogue camp-conversation" aria-label={`${names[current.job]}的对话`}>
                  <div className="speaker">
                    <img className="conversation-head" src={`/jrpg/assets/head-logos/${current.job}.webp`} alt="" draggable={false}/>
                    <span>{names[current.job]}</span>
                  </div>
                  <DialogueText text={current.line}/>
                  <ItemPages label="选择回复" size={4} className="dialogue-options" resetKey={scene}>
                    {current.options.map((text, i) => (
                      <button
                        key={text}
                        disabled={
                          busy ||
                          (scene === 2 &&
                            i === 2 &&
                            !hasShopAccess(g,1)) ||
                          (scene === 2 &&
                            i === 3 &&
                            !hasShopAccess(g,2))
                        }
                        onClick={() => option(i)}
                      >
                        <span>{text}</span>
                        <small>
                          {scene === 2 &&
                          (i === 2 || i === 3) && !hasShopAccess(g,i-1)
                            ? `需${i===2?"专业":"神秘"}购买凭证`
                            : null}
                        </small>
                      </button>
                    ))}
                  </ItemPages>
                </div>
              </section>
              </>
              )}
            </div>
          ) : page === "map" ? (
            <section className="world-map world-atlas" ref={mapViewport} aria-label="灯火之外冒险地图">
              <header className="atlas-heading">
                <span className="atlas-kicker">驿站行路图</span>
                <h1>灯火之外</h1>
                <p>灯火仍在身后，前路由你选择。</p>
              </header>
              <nav className="map-route" aria-label="选择目的地">
                <button className="atlas-place place-camp" onClick={enterCamp}>
                  <span className="atlas-head"><img src="/jrpg/assets/head-logos/camp-lantern.webp" alt="" draggable={false}/></span>
                  <b>归返营地</b>
                  <small>灯火之内 · 整理行装</small>
                </button>
                {dungeonOrder.map((id) => (
                  <button
                    key={id}
                    className={`atlas-place place-${id}${doorCleared(g,id) ? " place-cleared" : ""}`}
                    onClick={() => {
                      setDoor(id);
                      setDifficulty("normal");
                      setPage("dungeon");
                    }}
                  >
                    <span className="atlas-head"><img src={`/jrpg/assets/head-logos/${bossAppearance(id).portraitId.replace("-bust", "")}.webp`} alt="" draggable={false}/></span>
                    <b>{dungeons[id].name}</b>
                    <span className="atlas-resource">{resourceNames[id]}<span aria-label={`${dungeons[id].stars}星`}>{"★".repeat(dungeons[id].stars)}</span></span>
                    <small>
                      {doorCleared(g, id) ? "已击退 · 可扫荡" : dungeons[id].boss}
                    </small>
                  </button>
                ))}
                <button className="atlas-place place-throne" onClick={() => setPage("final")}>
                  <span className="atlas-head"><img src="/jrpg/assets/head-logos/final-aberration.webp" alt="" draggable={false}/></span>
                  <b>终刻王座</b>
                  <span className="atlas-resource">终刻魔王<span aria-label="五星">★★★★★</span></span>
                  <small>两支队伍 · 双战挑战</small>
                </button>
              </nav>
              <div className="atlas-hint">选择地点，查看出发准备<span>此处不消耗体力</span></div>
            </section>
          ) : (
            <DungeonDeparture
              key={page === "final" ? "final" : door}
              resource={page === "final" ? "final" : door}
              game={g}
              busy={busy}
              difficulty={difficulty}
              onDifficulty={setDifficulty}
              onBack={() => { setNotice(""); setPage("map"); }}
              onParty={() => open("tavern", "party")}
              onBag={() => open("medicine", "bag")}
              onChallenge={(sandbox) => void run(async () => {
                const entry = startChallenge(ref.current!, page === "final"
                  ? { final: true, sandbox, requestId: crypto.randomUUID() }
                  : { resource: door, difficulty, requestId: crypto.randomUUID() });
                await commit(entry.game, entry.battle);
              })}
              onSweep={(count) => void run(async () => {
                const result = sweep(ref.current!.game, count, door, difficulty);
                await commit(result.game);
                setDropList(result.rewards);
              })}
            />
          )}
          {notice && !modal && (
            <div className="notice" role="status">
              {notice}
              <button onClick={() => setNotice("")}>知道了</button>
            </div>
          )}
          </SceneSurface>
        </>
      )}
      <SceneOverlay>
      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <section
            className={
              modal === "exp" && g.camp ? "modal memory-modal" : `modal camp-game-window${modal === "shop" ? " camp-shop-front" : ""}`
            }
            data-camp-window={modal}
            data-camp-resource={resource}
            data-camp-scene={current.name}
            ref={modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="camp-window-material" aria-hidden="true" />
            <header>
              <div className="camp-window-heading">
                {modal!=="exp"&&<img className="camp-window-host" src={`/jrpg/assets/portraits/${current.job}.webp`} alt="" draggable={false}/>}
                <div>
                <span className="eyebrow">
                  {modal === "exp" && g.camp
                    ? "八人共享的成长"
                    : `${current.name} · ${jobNames[current.job]}`}
                </span>
                <h2 id="modal-title">
                  {
                    {
                      process: {
                        coin: "清点古币",
                        exp: "研习旧忆",
                        jp: "引导残响",
                        gem: "分析尘玉",
                      }[resource],
                      shop: "商店",
                      party: campEntry === "subjob" ? "副职业资格" : "出战编队",
                      codex: save.battle?.finale
                        ? "终刻魔王 · 图鉴待接入"
                        : `${dungeons[save.battle?.resource ?? door].boss} · 图鉴`,
                      jp: ({skills:"职业技能",supports:"辅助技能",ex:"EX资格",pp:"PP专属指令"} as Record<string,string>)[campEntry] ?? "职业与残响",
                      exp: g.camp ? "旧忆网" : "队伍成长",
                      gem: ({equip:"尘玉镶嵌",forge:"尘玉合成",upgrade:"尘玉升阶",inventory:"尘玉库存"} as Record<string,string>)[campEntry] ?? "尘玉匣",
                      stamina: "酒馆补给",
                      medicine: ({bag:"战斗背包",craft:"药品调和",dismantle:"药品分解"} as Record<string,string>)[campEntry] ?? "随身药品",
                      achievements: "旅程记录",
                      tavern: ({party:"出战编队",supports:"辅助技能",bag:"战斗背包",gem:"尘玉配置",compare:"阵容对比",records:"魔王记录",boards:"排行榜"} as Record<string,string>)[campEntry] ?? "酒馆 · 配置与分享",
                    }[modal]
                  }
                </h2>
                {modal === "shop" && <p className="camp-shop-welcome">每一次归来，都值得清点新的行囊。</p>}
                </div>
              </div>
              {modal === "shop" && <div className="camp-shop-purse" aria-label={`持有古币 ${g.coins.toLocaleString("zh-CN")}`}>
                <span aria-hidden="true">◆</span><span>古币</span><b>{g.coins.toLocaleString("zh-CN")}</b>
              </div>}
              <button autoFocus disabled={busy} onClick={closeModal}>
                关闭 ×
              </button>
            </header>
            <div className="modal-content">
              <BookPager key={`${modal}:${campEntry}`} label="窗口" passthrough={modal==="exp"}>
              {modal === "tavern" && g.camp && (
                <TavernPanel
                  key={`tavern:${campEntry}`}
                  initialTab={campEntry || undefined}
                  game={g}
                  revision={save.revision}
                  busy={busy}
                  onCommit={commitCamp}
                />
              )}
              {error && (
                <p className="counter-error" role="alert">
                  {error}
                </p>
              )}
              {g.camp &&
                modal &&
                [
                  "shop",
                  "party",
                  "jp",
                  "exp",
                  "stamina",
                  "gem",
                  "medicine",
                ].includes(modal) && (
                  <CampPanel
                    key={`${modal}:${campEntry}`}
                    view={campEntry || undefined}
                    game={g}
                    panel={modal}
                    tier={shopTier}
                    revision={save.revision}
                    busy={busy}
                    onCommit={commitCamp}
                  />
                )}
              {modal === "process" && (
                <>
                  <p>
                    确认后统一消耗物品。
                    {resource === "jp"
                      ? "每位角色分别获得全部价值，不分摊。"
                      : resource === "gem"
                        ? "只生成三种基础Ⅰ阶尘玉，每颗家族独立判定，各1/3。"
                        : "奖励不会自动处理。"}
                  </p>
                  <ItemPages label="待处理战利品" size={4} className="camp-processing-tray">
                        {rewards
                          .filter((r) => r.resource === resource)
                          .map((r) => (
                            <article className="camp-loot-item" data-rarity={r.rarity} key={r.id}>
                              <CampItemMark id={r.resource==="gem"?"gem":r.resource==="exp"?"scroll":r.resource==="jp"?"certificate":"coin"}/>
                              <div className="camp-loot-description">
                                <span className={`rarity ${r.rarity}`}>
                                  {r.rarity}
                                </span>{" "}
                                {r.name}
                                <small>库存 {g.inventory[r.id] ?? 0} · 单件价值 {rewardValue(g, resource, r.value)}</small>
                              </div>
                              <label className="camp-loot-quantity">处理数量
                                <input
                                  aria-label={`${r.name}处理数量`}
                                  type="number"
                                  disabled={busy}
                                  min="0"
                                  max={g.inventory[r.id] ?? 0}
                                  value={selection[r.id] ?? 0}
                                  onChange={(e) =>
                                    change(
                                      r.id,
                                      Number(e.target.value),
                                      setSelection,
                                      selection,
                                      g.inventory[r.id] ?? 0,
                                    )
                                  }
                                />
                              </label>
                              <div className="camp-loot-yield"><small>预计收益</small><b>
                                {rewardValue(
                                  g,
                                  resource,
                                  (selection[r.id] ?? 0) * r.value,
                                )}
                              </b></div>
                            </article>
                          ))}
                  </ItemPages>
                  <div className="modal-actions">
                    <span>
                      预计获得 <b>{total}</b> {resourceNames[resource]}
                    </span>
                    <button
                      disabled={busy || !total}
                      className="primary"
                      onClick={() =>
                        void run(async () => {
                          const before = ref.current!.game;
                          const r = processRewards(before, resource, selection);
                          await commit(r.game);
                          setSelection({});
                          setNotice(
                            resource === "gem"
                              ? `${r.summary}：${Object.entries(r.game.gems)
                                  .map(
                                    ([k, v]) =>
                                      `${k} +${v - (before.gems[k] ?? 0)}`,
                                  )
                                  .join(" / ")}`
                              : r.summary,
                          );
                        })
                      }
                    >
                      {busy ? "处理中…" : "确认处理"}
                    </button>
                  </div>
                </>
              )}
              {!g.camp && modal === "shop" && (
                <>
                  <p>
                    加入购物清单，确认时一次扣款。 当前古币 <b>{g.coins}</b>
                  </p>
                  {medicines.map((m, i) => (
                    <div className="shop-row" key={m.id}>
                      <span
                        className="item-sprite utility-sprite"
                        style={{ backgroundPosition: spritePosition(i, 4, 2) }}
                        aria-hidden="true"
                      />
                      <div>
                        <b>{m.name}</b>
                        <small>
                          {m.description} · 已有{g.inventory[m.id] ?? 0}
                        </small>
                      </div>
                      <span>{m.price} 古币</span>
                      <input
                        aria-label={`${m.name}购买数量`}
                        type="number"
                        disabled={busy}
                        min="0"
                        value={cart[m.id] ?? 0}
                        onChange={(e) =>
                          change(
                            m.id,
                            Number(e.target.value),
                            setCart,
                            cart,
                            9999,
                          )
                        }
                      />
                    </div>
                  ))}
                  <div className="modal-actions">
                    <span>
                      合计 <b>{cost}</b> 古币
                    </span>
                    <button
                      className="primary"
                      disabled={busy || !cost || cost > g.coins}
                      onClick={() =>
                        void run(async () => {
                          await commit(buyMedicines(ref.current!.game, cart));
                          setCart({});
                          setNotice("购物清单已结算，药品已放入背包。");
                        })
                      }
                    >
                      确认购买
                    </button>
                  </div>
                </>
              )}
              {!g.camp && (modal === "party" || modal === "jp") && (
                <>
                  <p>
                    DEMO
                    ONLY：默认出战为剑士、学者、神官、商人；本切片不开放换队。
                  </p>
                  <div className="roster">
                    {jobs.map((id) => {
                      const stats = heroStats(id, level);
                      return (
                        <article key={id}>
                          <h3>
                            {names[id]}{" "}
                            <small>
                              {[
                                "warrior",
                                "scholar",
                                "cleric",
                                "merchant",
                              ].includes(id)
                                ? "出战"
                                : "营地"}
                            </small>
                          </h3>
                          {modal === "party" ? (
                            <>
                              <Gauge
                                label="HP"
                                value={g.heroes[id].hp}
                                max={stats.maxHp}
                              />
                              <Gauge
                                label="SP"
                                value={g.heroes[id].sp}
                                max={stats.maxSp}
                                tone="sp"
                              />
                              <small>
                                固有武器：{stats.weapons.join(" / ")}
                              </small>
                            </>
                          ) : (
                            <>
                              <b>残响 {g.jp[id]}</b>
                              <p>
                                {learned[id]
                                  ?.map((k) => skillBook[k].name)
                                  .join(" · ") ?? "本职业技能待后续接入"}
                              </p>
                              <small>
                                {learned[id]
                                  ? "前两项已学习 · 其余技能尚未开放"
                                  : "本切片未实现战斗技能"}
                              </small>
                            </>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
              {!g.camp && modal === "exp" && (
                <>
                  <div className="level-display">
                    Lv.<b>{level}</b>
                  </div>
                  <Gauge label="旧忆" value={g.exp} max={117000} tone="sp" />
                  <p>
                    当前级进度：{g.exp - expForLevel(level)} /{" "}
                    {level === 100
                      ? "已满级"
                      : expForLevel(level + 1) - expForLevel(level)}
                  </p>
                  <p>
                    升到下一级还需{" "}
                    {level === 100 ? 0 : expForLevel(level + 1) - g.exp} 旧忆
                  </p>
                  <p className="muted">
                    累计阈值：10L(L+17)。成长不恢复HP/SP、不复活；非沙盒挑战入场自动恢复。完整节点界面待后续实现。
                  </p>
                </>
              )}
              {!g.camp && modal === "stamina" && (
                <>
                  <p>
                    体力 {g.stamina} · 本周目已消耗 {g.spent}
                  </p>
                  <p>队伍：新非沙盒挑战需20体力，入场自动恢复</p>
                  <div className="demo-tools">
                    <span className="badge">DEMO ONLY · 开发测试工具</span>
                    <p>下列按钮只用于体验Demo，不代表正式体力获取规则。</p>
                    {[20, 500].map((n) => (
                      <button
                        key={n}
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await commit(grantStamina(ref.current!.game, n));
                          })
                        }
                      >
                        {n === 20 ? "模拟打卡" : "补充测试体力"} +{n}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {!g.camp && modal === "gem" && (
                <>
                  <p>以下为已分析的基础尘玉，未分析的矿石仍留在奖励背包。</p>
                  {["火灼玉", "水澜玉", "木华玉"].map((name, i) => (
                    <div className={`gem-row gem-${i}`} key={name}>
                      <span
                        className="item-sprite utility-sprite"
                        style={{
                          backgroundPosition: spritePosition(i + 5, 4, 2),
                        }}
                        aria-hidden="true"
                      />
                      <b>{name}</b>
                      <strong>× {g.gems[name] ?? 0}</strong>
                    </div>
                  ))}
                  <p className="muted">
                    装备效果、炼玉与高阶路线：待正式配置及后续实现。
                  </p>
                </>
              )}
              {!g.camp && modal === "medicine" && (
                <>
                  {medicines.map((m, i) => (
                    <div className="shop-row" key={m.id}>
                      <span
                        className="item-sprite utility-sprite"
                        style={{ backgroundPosition: spritePosition(i, 4, 2) }}
                        aria-hidden="true"
                      />
                      <b>
                        {m.name} ×{g.inventory[m.id] ?? 0}
                      </b>
                      <span>{m.description}</span>
                    </div>
                  ))}
                  <p className="muted">
                    调和系统尚未接入。药品在战斗的“道具”菜单使用。
                  </p>
                </>
              )}
              {modal === "achievements" && (
                <section className="camp-archive-page">
                  <h3>{g.firstWin ? "◆" : "◇"} 初叩金门</h3>
                  <p>
                    {g.firstWin
                      ? "已首次战胜铸金监守·普通"
                      : "尚未达成：首次战胜铸金监守·普通"}
                  </p>
                  <p className="muted">
                    成就只记录经历，不提供任何资源或属性奖励。
                  </p>
                  <p>
                    已发现尘玉：
                    {[
                      ...new Set([
                        ...Object.keys(g.gems),
                        ...(g.camp?.archives ?? []).flatMap((a) =>
                          Object.keys(a.gems),
                        ),
                      ]),
                    ].join("、") || "暂无"}
                  </p>
                  <h3>已归档旅程</h3>
                  {(g.camp?.archives ?? []).map((a) => (
                    <article key={a.monthKey}>
                      <b>{a.monthKey}</b>
                      <p>
                        消耗体力 {a.spent} · 战斗 {a.battles}场 · 首胜{" "}
                        {a.firstWin ? "已达成" : "未达成"} · 打卡{" "}
                        {a.days.length}天 · 旧忆投资{" "}
                        {Object.values(a.nodes).reduce((x, y) => x + y, 0)}
                      </p>
                    </article>
                  ))}
                </section>
              )}
              {modal === "codex" && save.battle?.finale && (
                <p>
                  独立魔王AI与图鉴待接入；本地原型暂使用监守AI，不能当作正式魔王机制信息。
                </p>
              )}
              {modal === "codex" && !save.battle?.finale && (
                <>
                  <div className="camp-codex-frontispiece">
                    <img src={`/jrpg/assets/portraits/${bossAppearance(codexDoor).portraitId}.webp`} alt="" draggable={false}/>
                    <div><span>书库藏录 · 首领档案</span><h3>{dungeons[codexDoor].boss}</h3><p>区分已经发现的信息，与可能出现的机制。</p></div>
                  </div>
                  {!save.battle && (
                    <div className="inline">
                      {dungeonOrder.map((id) => (
                        <button
                          key={id}
                          aria-pressed={id === door}
                          onClick={() => {
                            setDoor(id);
                            setDifficulty("normal");
                          }}
                        >
                          {dungeons[id].boss}
                        </button>
                      ))}
                    </div>
                  )}
                  {!save.battle && (
                    <div className="inline difficulty-tabs" role="group" aria-label="图鉴难度">
                      <button
                        aria-pressed={difficulty === "normal"}
                        onClick={() => setDifficulty("normal")}
                      >
                        普通资料
                      </button>
                      <button
                        aria-pressed={difficulty === "advanced"}
                        onClick={() => setDifficulty("advanced")}
                      >
                        进阶资料
                      </button>
                    </div>
                  )}
                  <input
                    aria-label="检索图鉴"
                    placeholder="检索技能名或机制"
                    value={codexSearch}
                    onChange={(e) => setCodexSearch(e.target.value)}
                  />
                  <h3>本月实际发现</h3>
                  <p>
                    {codexDifficulty === "advanced" ? "进阶" : "普通"}{" "}
                    {"★".repeat(codexEncounter.stars)} · 原型共用动作库 · HP{" "}
                    {codexEncounter.hp} / Shield {codexEncounter.shield}
                  </p>
                  <p>
                    已发现弱点：
                    {codexEncounter.weaknesses
                      .map((w) =>
                        (
                          save.battle?.discoveredWeaknesses ??
                          codexDiscovery.weaknesses
                        ).includes(w)
                          ? w
                          : "?",
                      )
                      .join(" / ")}
                  </p>
                  <h3>永久资料 · 可能出现的招式</h3>
                  {Object.entries(intentInfo)
                    .filter(([name, data]) =>
                      (name + data.detail).includes(codexSearch),
                    )
                    .map(([name, data]) => (
                      <div className="codex-entry" key={name}>
                        <h3>
                          {name}{" "}
                          <small>
                            {(
                              save.battle?.discoveredSkills ??
                              codexDiscovery.skills
                            ).includes(name)
                              ? "已目击"
                              : "可能招式 · 未目击"}
                          </small>
                        </h3>
                        <p>{data.detail}</p>
                      </div>
                    ))}
                  <h3>动态优先级 · DEMO ONLY AI</h3>
                  <ol>
                    <li>有待发重剑：重剑清算。</li>
                    <li>没有物攻提升：核账。</li>
                    <li>至少两名存活角色HP≤60%，或有人防御：金砂迸射。</li>
                    <li>否则：铸金斩。</li>
                  </ol>
                  <p>
                    半血首次获得物防提升3轮。物攻提升使物理伤害×1.5；物防/属防提升使对应承伤×0.75。同类只延长持续时间，最多9轮。
                  </p>
                  <p>
                    Break立即删除本轮和下一轮全部未执行节点；再下一轮恢复盾与合法行动。Break不隐藏下一Intent。速度变化只重新排序下一轮，不重新抽速度因子。
                  </p>
                  <p>
                    PP：受伤与造成Break后积累。主职业药师可在道具页使用“节约”，其余专属指令尚待接入。
                  </p>
                </>
              )}
              {notice && (
                <p className="inline-notice" role="status">
                  {notice}
                </p>
              )}
              </BookPager>
            </div>
            {modal!=="exp"&&<footer className="camp-window-footnote"><span>{current.name} · 灯火之内</span><span><kbd>A / ←</kbd> 上一页　<kbd>D / →</kbd> 下一页　<kbd>Backspace</kbd> 返回</span></footer>}
          </section>
        </div>
      )}
      {!!dropList.length && (
        <div className="modal-backdrop">
          <section
            className="modal rewards-modal"
            role="dialog"
            aria-modal="true"
            aria-label="获得奖励"
          >
            <header>
              <div>
                <span className="eyebrow">REWARDS</span>
                <h2>旅途的收获</h2>
              </div>
              <button autoFocus onClick={() => setDropList([])}>
                收下 →
              </button>
            </header>
            <p>已进入奖励背包。前往对应设施处理后才会转化为资源。</p>
            {!reducedMotion && (
              <PixelEffect
                effect="reward"
                token={dropList.join(",")}
                duration={450}
                className="reward-fx"
              />
            )}
            <ItemPages label="战利品" size={8} className="reward-grid">
              {dropList.map((id, i) => {
                const r = rewards.find((r) => r.id === id)!;
                const rewardIndex = r.iconIndex;
                return (
                  <article
                    className={`reward ${r.rarity}`}
                    key={i}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <span className="rarity">{r.rarity}</span>
                    <span className="reward-glyph">
                      <span
                        className={`item-sprite reward-sprite${r.difficulty === "advanced" ? " advanced-reward-sprite" : ""}`}
                        style={{
                          backgroundPosition: spritePosition(rewardIndex, 4, 4),
                        }}
                        role="img"
                        aria-label={r.name}
                      />
                    </span>
                    <b>{r.name}</b>
                    <small>{resourceNames[r.resource]} · 待处理</small>
                  </article>
                );
              })}
            </ItemPages>
          </section>
        </div>
      )}
      </SceneOverlay>
    </div>
  );
}
