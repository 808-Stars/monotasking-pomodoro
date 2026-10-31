import { useId, useState, type CSSProperties, type ReactNode } from "react";
import {SceneDisplayControls,SceneSurface} from "../presentation/SceneDisplay.tsx";
import { BattleInfoDialog } from "./BattleInfoDialog.tsx";
import type { BattleState } from "../game/battle.ts";
import { poseSource } from "../presentation/motion.ts";
import type { bossAppearance } from "../presentation/enemyArt.ts";
import type { BattleSceneCheckpoint } from "../presentation/battleSceneState.ts";
import "./battle-stage.css";
import "./battle-card-scene.css";

const curtainLeft = "/jrpg/assets/ui/battle-entry/theatre-curtain-v1.webp";
const curtainRight = curtainLeft;

export function BattleEntryCurtains() {
  return <span className="battle-entry-curtains" aria-hidden="true">
    <img className="battle-curtain-left" src={curtainLeft} alt="" draggable={false} />
    <img className="battle-curtain-right" src={curtainRight} alt="" draggable={false} />
  </span>;
}

function BattleOpeningAccent() {
  const gradientId = useId();
  return <svg className="battle-opening-accent" viewBox="0 0 1200 360"
    aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#765036" />
        <stop offset=".35" stopColor="#b69455" />
        <stop offset=".7" stopColor="#ead8aa" />
        <stop offset="1" stopColor="#f1e8cf" />
      </linearGradient>
    </defs>
    <g className="opening-accent-rails" fill="none" stroke="#b79860" strokeWidth="2">
      <path pathLength="1" d="M120 113H238L264 99H444M756 99H936L962 113H1080" />
      <path pathLength="1" d="M120 247H238L264 261H444M756 261H936L962 247H1080" />
      <path pathLength="1" d="M220 113L203 99H176L169 106L176 113M980 113L997 99H1024L1031 106L1024 113" />
      <path pathLength="1" d="M220 247L203 261H176L169 254L176 247M980 247L997 261H1024L1031 254L1024 247" />
      <path pathLength="1" d="M447 99L462 92L477 99L462 106ZM723 99L738 92L753 99L738 106Z" />
      <path pathLength="1" d="M447 261L462 254L477 261L462 268ZM723 261L738 254L753 261L738 268Z" />
    </g>
    <g className="opening-accent-impact" fill="none" stroke="#d7bd87">
      <ellipse cx="600" cy="180" rx="135" ry="81" strokeWidth="2" />
      <path d="M600 67V37M600 293V323M422 180H384M778 180H816" strokeWidth="2" />
      <path d="M479 107L459 92M721 107L741 92M479 253L459 268M721 253L741 268" strokeWidth="1" />
    </g>
    <g className="opening-accent-trail" fill="none" strokeLinecap="round">
      <path d="M70 253C347 241 690 170 1118 82" stroke="#7c4035" strokeWidth="5" />
      <path d="M124 273C382 248 703 184 1087 107" stroke="#b08855" strokeWidth="1.5" />
    </g>
    <g className="opening-accent-blade">
      <path fill="#63372e" opacity=".65" d="M42 250C296 230 715 153 1158 56C824 159 382 252 42 250Z" />
      <path fill={`url(#${gradientId})`} d="M55 235C350 224 733 135 1172 45C838 144 403 250 55 235Z" />
      <path fill="none" stroke="#f2e3ba" strokeWidth="1.5" d="M81 235C384 218 780 124 1150 51" />
      <path fill="#efe2be" d="M1150 51L1172 45L1155 56L1158 52Z" />
    </g>
  </svg>;
}

export function BattleScene({appearance,checkpoint,state,error,onRetry,children,header,commands,closing,battleLog,duration=440}: {
  appearance: ReturnType<typeof bossAppearance>;
  checkpoint: BattleSceneCheckpoint;
  state: BattleState;
  error?: string;
  onRetry?: () => void;
  children: ReactNode;
  header?: ReactNode;
  commands?: ReactNode;
  closing?: ReactNode;
  battleLog?: ReactNode;
  duration?: number;
}) {
  const opening = checkpoint.phase === "opening";
  // Only a scene mounted in its opening gets the reveal veil. Restoring an
  // already-open main scene must not replay the start effect on refresh.
  const [revealOnEntry] = useState(() => opening);
  const [logOpen,setLogOpen]=useState(false);
  return <div className="battle-scene-shell">
    <header className="battle-scene-header">
      {header}
      <SceneDisplayControls />
    </header>
    <SceneSurface kind="battle">
    <section className="battle battle-card-scene" data-theatre="mineral-ink"
    data-battle-scene={checkpoint.phase} style={{"--battle-background":`url("${appearance.background}")`,"--beat-duration":`${duration}ms`,"--tempo":"1s"} as CSSProperties}>
    <div className="battle-scene-background" aria-hidden="true" />
    <div className="battle-scene-shade" aria-hidden="true" />
    {!opening&&battleLog&&<button type="button" className="battle-log-toggle"
      aria-label="查看战斗记录" title="战斗记录" aria-haspopup="dialog"
      onClick={()=>setLogOpen(true)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 15 12 8 18 15Z" fill="currentColor" />
      </svg>
    </button>}
    {!opening&&logOpen&&battleLog&&<BattleInfoDialog title="战斗记录" onClose={()=>setLogOpen(false)}>
      {battleLog}
    </BattleInfoDialog>}
    {opening && <>
      <link rel="preload" as="image" href={curtainLeft} />
    </>}
    {opening ? <div className={`battle-opening ${checkpoint.openingElapsedMs >= 2200 && !error ? "opening-transition" : ""}`}>
      <div className="arena opening-arena" style={{
        "--warden-art-scale":appearance.stage.scale,
        "--warden-depth-offset":`${appearance.stage.depthOffset}%`,
      } as CSSProperties}>
        {state.enemies.map(unit => <div key={unit.id} className="guardian">
          <img className="guardian-seal" data-opening-unit={unit.id}
            src={poseSource(unit.id === "guardian" ? appearance.unitArtId : unit.id,"idle")}
            alt={unit.name} draggable={false} />
        </div>)}
        <div className="battle-party">
          {state.party.map(unit => <div key={unit.id} className="battle-combatant">
            <img className="battle-hero-art" data-opening-unit={unit.id}
              src={poseSource(unit.id,"idle")} alt={unit.name} draggable={false} />
          </div>)}
        </div>
      </div>
      {checkpoint.openingElapsedMs >= 1500 && <div className="battle-opening-title" role="status">
        <BattleEntryCurtains />
        <span className="battle-opening-flash" aria-hidden="true" />
        <BattleOpeningAccent />
        <strong className="battle-opening-wordmark">战斗开始</strong>
        <span className="battle-opening-fragments" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
      </div>}
      {error && <div className="opening-error" role="alert"><p>{error}</p><button onClick={onRetry}>重试保存开幕进度</button></div>}
    </div> : <>
      <div className="battle-scene-content">{children}</div>
      {revealOnEntry && <div className="battle-entry-reveal" aria-hidden="true">
        <BattleEntryCurtains />
      </div>}
    </>}
    {!opening && closing}
    </section>
    </SceneSurface>
    {!opening && commands && <div className="battle battle-scene-footer">
      {commands}
    </div>}
  </div>;
}
