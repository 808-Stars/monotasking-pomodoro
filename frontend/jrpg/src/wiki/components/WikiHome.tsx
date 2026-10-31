import type {WikiCategoryId} from "../types.ts";
import {wikiArticles,wikiCategories,wikiContentDate} from "../content/index.ts";
import {entryHref} from "../wikiIndex.ts";

const routes=[
  {title:"第一次来到旧驿镇",note:"先认识资源和旅途的节奏。",ids:["game-loop","resources","stamina","month"]},
  {title:"战斗中遇到了问题",note:"从这一次Hit到下一轮行动。",ids:["timeline","weakness","break","ap","evasion"]},
  {title:"准备自己的构筑",note:"从成长路线，到队伍与行装。",ids:["memory","jobs","subjobs","gems","backpack"]},
];
function EntryLinks({ids}:{ids:string[]}){
  return <>{ids.map(id=>{const a=wikiArticles.find(a=>a.id===id);return a?<a key={id} href={entryHref(id)}>{a.title}</a>:null;})}</>;
}
export function WikiCategoryView({id}:{id:WikiCategoryId}){
  const category=wikiCategories.find(c=>c.id===id)!;
  const articles=wikiArticles.filter(a=>a.category===id);
  const topics=[...new Set(articles.map(a=>a.topic))];
  return <section className="wiki-category-page">
    <p className="wiki-breadcrumb"><a href="/jrpg/wiki.html">规则Wiki</a> / 分类</p>
    <h1>{category.title}</h1><p className="wiki-definition">{category.description}</p>
    {topics.map(topic=><section className="wiki-topic-section" key={topic}><h2>{topic}</h2>
      <dl>{articles.filter(a=>a.topic===topic).map(a=><div key={a.id}><dt><a href={entryHref(a.id)}>{a.title}</a>{a.ruleStatus!=="confirmed"&&<small>含待定项</small>}</dt><dd>{a.summary}</dd></div>)}</dl>
    </section>)}
  </section>;
}
export function WikiHome(){
  return <>
    <header className="wiki-cover">
      <p className="wiki-bookmark">旧驿镇的旅人手册</p><h1>规则Wiki</h1>
      <p className="wiki-cover-intro">翻到需要的一页，<br/>再决定自己的解法。</p>
      <p className="wiki-cover-description">为《单×番 MONOPOMO》整理的JRPG规则库。沿着分类阅读，也可以直接查找某个机制。</p>
      <div className="wiki-cover-meta"><span>{wikiArticles.length} 篇词条</span><span>六大分类</span><time dateTime={wikiContentDate}>{wikiContentDate} 整理</time></div>
    </header>
    <section className="wiki-reading-paths" aria-labelledby="reading-paths"><h2 id="reading-paths">从你现在的问题开始</h2>
      {routes.map((route,i)=><div className="wiki-reading-path" key={route.title}><span aria-hidden="true">{["启程","交锋","整备"][i]}</span><div><h3>{route.title}</h3><p>{route.note}</p><div className="wiki-inline-links"><EntryLinks ids={route.ids}/></div></div></div>)}
    </section>
    <section className="wiki-directory" aria-labelledby="all-categories"><h2 id="all-categories">规则分类</h2><div className="wiki-category-grid">
      {wikiCategories.map(c=>{
        const articles=wikiArticles.filter(a=>a.category===c.id);
        const topics=[...new Set(articles.map(a=>a.topic))];
        return <section className={`wiki-category-section wiki-category-${c.id}`} key={c.id}>
          <header><span className="wiki-category-symbol" aria-hidden="true">{c.symbol}</span><div><h3><a href={`/jrpg/wiki.html?category=${c.id}`}>{c.title}</a></h3><p>{c.description}</p></div></header>
          {topics.map(topic=><div className="wiki-directory-topic" key={topic}><h4>{topic}</h4><div className="wiki-inline-links">{articles.filter(a=>a.topic===topic).map(a=><a href={entryHref(a.id)} key={a.id}>{a.title}</a>)}</div></div>)}
        </section>;
      })}
    </div></section>
    <section className="wiki-job-index" aria-labelledby="job-entrances"><h2 id="job-entrances">八位旅人</h2><div>
      {wikiArticles.filter(a=>a.topic==="八职业").map(a=><a href={entryHref(a.id)} key={a.id}><img src={a.portrait} alt="" loading="lazy" onError={e=>{e.currentTarget.hidden=true;}}/><span>{a.title}</span></a>)}
    </div></section>
    <aside className="wiki-notice wiki-home-note"><strong>设计规则与Demo完成度，分开看。</strong><p>已确定不代表已经实装。词条保留来源、候选边界与待定提示；这份手册不加入新规则，也不以历史版本补齐未定内容。</p><a href="/jrpg/wiki.html?index=pending">查看待定规则索引</a></aside>
  </>;
}
export function WikiIndexes({pending=false}:{pending?:boolean}){
  const articles=(pending?wikiArticles.filter(a=>a.ruleStatus!=="confirmed"):[...wikiArticles])
    .sort((a,b)=>a.title.localeCompare(b.title,"zh-Hans-CN"));
  return <section><p className="wiki-breadcrumb"><a href="/jrpg/wiki.html">规则Wiki</a> / 索引</p>
    <h1>{pending?"待定规则索引":"全部词条与别名"}</h1><p className="wiki-definition">{pending?"这些专题包含尚未裁定的参数、源稿冲突或候选范围。打开词条查看具体边界，而不是把整套系统都视为未确定。":"术语集中查找，旧称指向当前正式词条；不会把历史体系重新带回规则。"}</p>
    <dl className="wiki-term-index">{articles.map(a=><div key={a.id}><dt><a href={entryHref(a.id)}>{a.title}</a></dt><dd>{a.aliases.length>0&&!pending?<span className="wiki-aliases">也可搜索：{a.aliases.join("、")}</span>:null}{a.summary}</dd></div>)}</dl>
  </section>;
}
