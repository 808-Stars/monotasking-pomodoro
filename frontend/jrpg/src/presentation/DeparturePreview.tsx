import {SceneDisplayControls,SceneSurface} from "./SceneDisplay.tsx";
import { useState } from "react";
import { mountGame } from "./GameViewport.tsx";
import DungeonDeparture from "../features/DungeonDeparture.tsx";
import { createGame, type Resource } from "../game/economy.ts";
import { dungeons, dungeonOrder, type Difficulty } from "../game/dungeons.ts";
import "../style.css";
import "../traveler-theme.css";

const fixture = createGame();
fixture.stamina = 600;
fixture.dungeonWins = [...dungeonOrder];
fixture.discoveredWeaknesses = ["枪", "火"];

function DeparturePreview() {
  const [resource, setResource] = useState<Resource | "final">("coin");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [message, setMessage] = useState("");
  return <div className="app-shell departure-preview-shell">
    <nav aria-label="五副本界面预览" style={{display:"flex",gap:12,padding:"14px 0",flexWrap:"wrap",alignItems:"center"}}>
      <span>独立美术预览 · 不读写存档</span>
      {[...dungeonOrder, "final" as const].map(id => <button key={id} aria-pressed={resource === id} onClick={() => { setResource(id); setDifficulty("normal"); setMessage(""); }}>{id === "final" ? "终刻王座" : dungeons[id].name}</button>)}
      <a href="/jrpg/">返回Demo</a>
      {message && <span role="status">{message}</span>}
      <SceneDisplayControls />
    </nav>
    <SceneSurface kind="departure">
    <DungeonDeparture key={resource} resource={resource} game={fixture} busy={false} difficulty={difficulty} onDifficulty={setDifficulty}
      onBack={() => { setMessage("这是独立预览；正式Demo中的此按钮返回冒险地图。"); window.scrollTo({top:0}); }}
      onChallenge={() => { setMessage("仅预览，不开始战斗、不消耗体力。"); window.scrollTo({top:0}); }}
      onSweep={() => { setMessage("仅预览，不执行扫荡、不修改库存。"); window.scrollTo({top:0}); }}
      onParty={() => { setMessage("正式Demo中将打开队伍配置；本页不读取真实阵容。"); window.scrollTo({top:0}); }}
      onBag={() => { setMessage("正式Demo中将打开背包配置；本页不读取真实背包。"); window.scrollTo({top:0}); }} />
    </SceneSurface>
  </div>;
}
mountGame(<DeparturePreview />);
