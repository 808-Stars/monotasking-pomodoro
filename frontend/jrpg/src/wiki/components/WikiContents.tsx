import type {WikiArticle} from "../types.ts";
import {entryHref} from "../wikiIndex.ts";
export function WikiContents({article}:{article?:WikiArticle}){
  return <aside className="wiki-contents" aria-label={article?"本页目录":"常用规则"}>
    <h2>{article?"本页目录":"常用规则"}</h2>
    {article?<ol>{article.sections.map(s=><li key={s.id}><a href={`#${encodeURIComponent(s.id)}`}>{s.title}</a></li>)}</ol>:
      <ul>{[["ap","异常如何积累"],["break","Break何时恢复"],["evasion","逐Hit回避"],["memory-protection","撤点会发生什么"],["sweeping","奖励概率"],["sharing","阵容分享边界"]].map(([id,label])=><li key={id}><a href={entryHref(id)}>{label}</a></li>)}</ul>}
    <p>先确认概念，再看数值。<br/>明确待定项，不用旧稿补齐。</p>
    <a className="wiki-back-top" href="#wiki-top">回到顶部 ↑</a>
  </aside>;
}
