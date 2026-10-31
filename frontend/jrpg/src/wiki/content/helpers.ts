import type {WikiArticle,WikiBlock,WikiInline} from "../types.ts";
export const p=(...content:WikiInline[]):WikiBlock=>({kind:"paragraph",content});
export const list=(...items:string[]):WikiBlock=>({kind:"list",items:items.map(text=>[text])});
export const table=(columns:string[],rows:string[][]):WikiBlock=>({kind:"table",columns,rows});
export const formula=(text:string):WikiBlock=>({kind:"formula",text});
export const notice=(title:string,text:string):WikiBlock=>({kind:"notice",title,text});
export const link=(entry:string,label:string):WikiInline=>({entry,label});
type ArticleInput=Pick<WikiArticle,"id"|"title"|"category"|"topic"|"summary"|"sourceSections"|"sections"> & Partial<WikiArticle>;
export function article(input:ArticleInput):WikiArticle {
  return {aliases:[],related:[],ruleStatus:"confirmed",implementationStatus:"unverified",
    implementationNote:"本词条说明设计规则；本轮尚未核对对应代码与运行表现，不代表功能已经完整实现。",...input};
}
export const section=(id:string,title:string,...blocks:WikiBlock[])=>({id,title,blocks});
