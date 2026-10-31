import type {WikiArticle,WikiBlock,WikiRoute,WikiSearchResult} from "./types.ts";
import {wikiArticles,wikiCategories} from "./content/index.ts";

export function entryHref(id:string,section?:string):string {
  return `/jrpg/wiki.html?entry=${encodeURIComponent(id)}${section?`#${encodeURIComponent(section)}`:""}`;
}
export function parseWikiRoute(params:URLSearchParams):WikiRoute {
  if(params.has("entry")){
    const id=params.get("entry")??"";
    return {kind:wikiArticles.some(a=>a.id===id)?"entry":"missing",id};
  }
  if(params.has("category")){
    const id=params.get("category");
    const category=wikiCategories.find(c=>c.id===id);
    return category?{kind:"category",id:category.id}:{kind:"home"};
  }
  if(params.has("search"))return {kind:"search",query:params.get("search")??""};
  if(params.get("index")==="terms")return {kind:"terms"};
  if(params.get("index")==="pending")return {kind:"pending"};
  return {kind:"home"};
}
function blockText(block:WikiBlock):string {
  switch(block.kind){
    case "spoiler":return "";
    case "paragraph":return block.content.map(x=>typeof x==="string"?x:x.label).join("");
    case "list":return block.items.map(items=>items.map(x=>typeof x==="string"?x:x.label).join("")).join(" ");
    case "table":return [...block.columns,...block.rows.flat()].join(" ");
    case "formula":return block.text;
    case "notice":return `${block.title} ${block.text}`;
  }
}
export function articleSearchText(article:WikiArticle):string {
  return [article.title,article.summary,...article.aliases,...article.sections.flatMap(s=>[s.title,...s.blocks.map(blockText)])].join(" ");
}
export function searchWiki(query:string,articles:readonly WikiArticle[]=wikiArticles):WikiSearchResult[] {
  const key=query.trim().toLocaleLowerCase();
  if(!key)return articles.slice(0,8).map(article=>({article,excerpt:article.summary}));
  return articles.map((article,index)=>{
    const title=article.title.toLocaleLowerCase(),aliases=article.aliases.map(a=>a.toLocaleLowerCase());
    const text=articleSearchText(article),where=text.toLocaleLowerCase().indexOf(key);
    const score=title===key?5:aliases.includes(key)?4:title.includes(key)?3:aliases.some(a=>a.includes(key))?2:where>=0?1:0;
    const start=Math.max(0,where-28);
    return {article,index,score,excerpt:score>1?article.summary:`${start>0?"…":""}${text.slice(start,start+140)}${text.length>start+140?"…":""}`};
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.index-b.index)
    .map(({article,excerpt})=>({article,excerpt}));
}
