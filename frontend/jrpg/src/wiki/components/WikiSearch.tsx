import type {WikiSearchResult} from "../types.ts";
import {wikiCategories} from "../content/index.ts";
import {entryHref} from "../wikiIndex.ts";
import {ruleLabels} from "./WikiArticle.tsx";

export function WikiSearchView({query,results}:{query:string;results:WikiSearchResult[]}){
  const empty=!query.trim();
  return <section className="wiki-search-page">
    <p className="wiki-breadcrumb"><a href="/jrpg/wiki.html">规则Wiki</a> / 站内搜索</p>
    <h1>{empty?"常用词条":`搜索：${query}`}</h1>
    <p className="wiki-definition">{empty?"输入名称、缩写、旧称或正文关键词，查找相关规则。":`找到 ${results.length} 篇相关词条。`}</p>
    {!results.length?<div className="wiki-empty"><h2>没有找到匹配词条</h2><p>试试更短的名称，例如“回避”“PP”“尘玉”。也可以从分类目录继续查找。</p><a href="/jrpg/wiki.html">浏览规则分类</a></div>:
      <div className="wiki-search-results">{results.map(({article,excerpt})=><article key={article.id}>
        <p className="wiki-result-category">{wikiCategories.find(c=>c.id===article.category)?.title} / {article.topic}<span>{ruleLabels[article.ruleStatus]}</span></p>
        <h2><a href={entryHref(article.id)}>{article.title}</a></h2><p>{excerpt}</p>
      </article>)}</div>}
  </section>;
}
