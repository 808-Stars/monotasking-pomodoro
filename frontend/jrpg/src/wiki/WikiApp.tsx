import {useEffect} from "react";
import {wikiArticles,wikiCategories,wikiContentDate} from "./content/index.ts";
import {parseWikiRoute,searchWiki} from "./wikiIndex.ts";
import {WikiSidebar} from "./components/WikiSidebar.tsx";
import {WikiHome,WikiCategoryView,WikiIndexes} from "./components/WikiHome.tsx";
import {WikiArticleView} from "./components/WikiArticle.tsx";
import {WikiContents} from "./components/WikiContents.tsx";
import {WikiSearchView} from "./components/WikiSearch.tsx";
import {WikiPagination} from "./components/WikiPagination.tsx";

export function WikiApp({search}:{search?:string}){
  const route=parseWikiRoute(new URLSearchParams(search??(typeof window!=="undefined"?window.location.search:"")));
  const article=route.kind==="entry"?wikiArticles.find(a=>a.id===route.id):undefined;
  const category=article?.category??(route.kind==="category"?route.id:undefined);
  const title=article?.title??(route.kind==="category"?wikiCategories.find(c=>c.id===route.id)?.title:route.kind==="search"?"站内搜索":route.kind==="missing"?"未找到词条":route.kind==="terms"?"全部词条":route.kind==="pending"?"待定规则":"规则目录");
  useEffect(()=>{
    document.title=`${title}｜单×番规则Wiki`;
  },[title]);
  const body=article?<WikiArticleView article={article}/>:route.kind==="category"?<WikiCategoryView id={route.id}/>:route.kind==="search"?<WikiSearchView query={route.query} results={searchWiki(route.query)}/>:route.kind==="terms"||route.kind==="pending"?<WikiIndexes pending={route.kind==="pending"}/>:route.kind==="missing"?
    <section className="wiki-empty"><p className="wiki-breadcrumb">规则Wiki / 未找到</p><h1>未找到词条</h1><p>这个链接可能已经失效，或词条尚未建立。你仍然可以搜索规则、展开分类，或回到首页。</p><a href="/jrpg/wiki.html">返回规则总览</a></section>:<WikiHome/>;
  return <div className="wiki-shell" id="wiki-top">
    <a className="wiki-skip-link" href="#wiki-main">跳到正文</a>
    <header className="wiki-masthead">
      <a className="wiki-brand" href="/jrpg/wiki.html"><span className="wiki-brand-seal" aria-hidden="true">旅</span><span><b>单×番</b><small>MONOPOMO · 规则Wiki</small></span></a>
      <form className="wiki-search-form" action="/jrpg/wiki.html" method="get" role="search">
        <label htmlFor="wiki-search-input">查阅规则</label><div><input id="wiki-search-input" type="search" name="search" placeholder="搜索：Break、AP、旧忆、配方…" defaultValue={route.kind==="search"?route.query:""}/><button type="submit">搜索</button></div>
      </form>
      <a className="wiki-header-game" href="/jrpg/">返回 Demo ↗</a>
    </header>
    <details className="wiki-mobile-nav"><summary>展开规则目录</summary><WikiSidebar category={category} entry={article?.id}/></details>
    <div className="wiki-layout">
      <aside className="wiki-desktop-nav"><WikiPagination label="分类目录"><WikiSidebar category={category} entry={article?.id}/></WikiPagination></aside>
      <main className="wiki-main" id="wiki-main"><WikiPagination key={search??(typeof window!=="undefined"?window.location.search:"")} primary>{body}</WikiPagination></main>
      <div className="wiki-contents-paged"><WikiPagination label="本页目录"><WikiContents article={article}/></WikiPagination></div>
    </div>
    <footer className="wiki-site-footer"><p>单×番 · 旅人规则手册</p><p>依据现行总设计整理 / {wikiContentDate} / 本地只读站点</p><a href="/jrpg/wiki.html?index=terms">词条索引</a></footer>
  </div>;
}
