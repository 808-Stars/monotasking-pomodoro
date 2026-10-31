import {wikiArticles,wikiCategories} from "../content/index.ts";
import {entryHref} from "../wikiIndex.ts";
import type {WikiCategoryId} from "../types.ts";

export function WikiSidebar({category,entry}:{category?:WikiCategoryId;entry?:string}){
  return <nav className="wiki-sidebar" aria-label="规则分类目录">
    <a className="wiki-home-link" href="/jrpg/wiki.html">规则总览</a>
    {wikiCategories.map(c=>{
      const articles=wikiArticles.filter(a=>a.category===c.id);
      const topics=[...new Set(articles.map(a=>a.topic))];
      return <section key={c.id} className={`wiki-nav-category${c.id===category?' wiki-nav-active':''}`}>
        <h3><a href={`/jrpg/wiki.html?category=${c.id}`}><span aria-hidden="true">{c.symbol}</span> {c.title} <small>{articles.length}</small></a></h3>
        <a className="wiki-category-link" href={`/jrpg/wiki.html?category=${c.id}`}>查看分类总览</a>
        {topics.map(topic=><div className="wiki-nav-topic" key={topic}>
          <p>{topic}</p>
          {articles.filter(a=>a.topic===topic).map(a=><a key={a.id} href={entryHref(a.id)} aria-current={a.id===entry?"page":undefined}>{a.title}</a>)}
        </div>)}
      </section>;
    })}
    <div className="wiki-nav-indexes"><a href="/jrpg/wiki.html?index=terms">全部词条与别名</a><a href="/jrpg/wiki.html?index=pending">待定规则索引</a></div>
    <p className="wiki-sidebar-note">规则是旅途的地图，<br/>不是唯一的通关路线。</p>
    <a className="wiki-return" href="/jrpg/">返回游戏 Demo</a>
  </nav>;
}
