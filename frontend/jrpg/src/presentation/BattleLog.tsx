import { isValidElement, type ReactNode } from "react";
import type { BattleState } from "../game/battle.ts";
import { battleLogEntries, type BattleLogEntry } from "../game/battleLog.ts";
import { BattlePages } from "./BattlePages.tsx";
import { packBattlePages } from "./battlePagination.ts";

interface LogCardProps { entry:BattleLogEntry; start?:number; end?:number; continued?:boolean }

function LogCard({entry,start=0,end=entry.lines.length,continued=false}:LogCardProps) {
  return <div className={`battle-log-entry log-${entry.kind}`}>
    <article>
      <header>
        <span className="battle-log-context">
          {entry.round!==undefined?`第${entry.round}轮`:"历史"}
          {entry.actor?` · ${entry.actor}`:entry.kind==="system"?" · 系统":""}
        </span>
        <strong>{entry.command}</strong>
        {!!entry.bp&&<span className="battle-log-bp">BP ×{entry.bp}</span>}
      </header>
      {continued&&<p className="battle-log-continuation">{start===0?"分段记录":"续页"} · 结果 {start+1}–{end} / {entry.lines.length}</p>}
      {end>start&&<ul className="battle-log-results">
        {entry.lines.slice(start,end).map((line,index)=><li key={start+index}>{line}</li>)}
      </ul>}
    </article>
  </div>;
}

/** Only oversized commands continue at complete, measured result-row boundaries. */
function splitLogCard(item:ReactNode,element:HTMLElement,capacity:number):ReactNode[]|null {
  if(!isValidElement<LogCardProps>(item)||item.type!==LogCard)return null;
  const rows=Array.from(element.querySelectorAll<HTMLElement>('.battle-log-results > li'));
  const heights=rows.map(row=>{
    const style=getComputedStyle(row);
    return Math.ceil(row.offsetHeight+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0));
  });
  const {entry,start=0,continued=false}=item.props;
  // Reserve repeated card chrome, a 24px continuation label and rounding slack.
  const overhead=element.offsetHeight-heights.reduce((sum,height)=>sum+height,0)+(continued?0:24)+4;
  const parts=packBattlePages(heights,Math.max(1,capacity-overhead),Infinity,0);
  if(parts.length<2)return null;
  return parts.map(part=><LogCard key={`${item.key}:${start+part.start}`} entry={entry}
    start={start+part.start} end={start+part.end} continued/>);
}

export function BattleLog({state}:{state:BattleState}) {
  const entries=battleLogEntries(state);
  return <div className="battle-log-content battle-log-paged">
    <p className="battle-log-note">按指令分组 · 保留最近60条完整记录 · 超长记录按结果续页</p>
    <BattlePages label="战斗记录" resetKey={state.id} splitOversized={splitLogCard}>
      {entries.map((entry,index)=><LogCard key={index} entry={entry}/>)}
    </BattlePages>
    {!entries.length&&<p>尚无战斗记录。</p>}
    <p className="battle-log-debug">Seed cursor {state.rng.cursor}</p>
  </div>;
}
