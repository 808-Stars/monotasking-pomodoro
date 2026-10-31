import {Fragment} from "react";
import type {WikiArticle,WikiBlock,WikiInline} from "../types.ts";
import {entryHref} from "../wikiIndex.ts";
import {wikiArticles,wikiCategories,wikiContentDate} from "../content/index.ts";

export const ruleLabels={confirmed:"规则已确定",mixed:"含待定项",candidate:"候选方案"};
export const implementationLabels={local:"本地已接入",partial:"部分接入",pending:"尚未接入",unverified:"实现状态未核对"};

function Inline({items}:{items:WikiInline[]}){
  return <>{items.map((item,i)=><Fragment key={i}>{typeof item==="string"?item:<a href={entryHref(item.entry,item.section)}>{item.label}</a>}</Fragment>)}</>;
}
function Block({block}:{block:WikiBlock}){
  switch(block.kind){
    case "paragraph":return <p><Inline items={block.content}/></p>;
    case "list":return <ul>{block.items.map((items,i)=><li key={i}><Inline items={items}/></li>)}</ul>;
    case "table":return <div className="wiki-table-scroll" role="region" aria-label={`数据表：${block.columns.join("、")}`} tabIndex={0}><table><thead><tr>{block.columns.map(c=><th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{block.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th scope="row" key={j}>{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
    case "formula":return <pre className="wiki-formula"><code>{block.text}</code></pre>;
    case "notice":return <aside className="wiki-notice"><strong>{block.title}</strong><p>{block.text}</p></aside>;
    case "spoiler":return <details className="wiki-spoiler"><summary>{block.title}</summary>{block.blocks.map((b,i)=><Block block={b} key={i}/>)}</details>;
  }
}
export function WikiArticleView({article}:{article:WikiArticle}){
  const category=wikiCategories.find(c=>c.id===article.category)!;
  return <article className="wiki-article">
    <nav className="wiki-breadcrumb" aria-label="当前位置"><a href="/jrpg/wiki.html">规则Wiki</a><span>/</span><a href={`/jrpg/wiki.html?category=${category.id}`}>{category.title}</a><span>/</span><span>{article.topic}</span></nav>
    <header className="wiki-article-heading">
      {article.portrait&&<img className="wiki-article-portrait" src={article.portrait} alt="" onError={e=>{e.currentTarget.hidden=true;}}/>}
      <div><h1>{article.title}</h1><p className="wiki-definition">{article.summary}</p></div>
    </header>
    <div className="wiki-article-status"><span className={`wiki-rule-status wiki-rule-${article.ruleStatus}`}>{ruleLabels[article.ruleStatus]}</span><span>{implementationLabels[article.implementationStatus]}</span></div>
    <p className="wiki-status-note">{article.implementationNote}</p>
    {article.sections.map(section=><section className="wiki-prose-section" key={section.id} aria-labelledby={section.id}>
      <h2 id={section.id}>{section.title}<a className="wiki-heading-anchor" href={`#${encodeURIComponent(section.id)}`} aria-label={`链接到${section.title}`}>#</a></h2>
      {section.blocks.map((block,i)=><Block key={i} block={block}/>)}
    </section>)}
    <aside className="wiki-related"><h2>相关词条</h2><div>{article.related.map(id=>{
      const other=wikiArticles.find(a=>a.id===id);
      return other?<a key={id} href={entryHref(id)}>{other.title}</a>:null;
    })}</div></aside>
    <footer className="wiki-source"><p>规则依据：游戏总设计 {article.sourceSections.join("、")}</p><p>内容整理：{wikiContentDate}。本页是可阅读的规则快照，不自动同步、不替代总设计。未运行验证不等于规则尚未确定。</p></footer>
  </article>;
}
