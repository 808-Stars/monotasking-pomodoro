export type WikiCategoryId="start"|"combat"|"builds"|"camp"|"dungeons"|"tavern";
export type WikiRuleStatus="confirmed"|"mixed"|"candidate";
export type WikiImplementationStatus="local"|"partial"|"pending"|"unverified";
export type WikiInline=string|{entry:string;label:string;section?:string};
export type WikiBlock=
  |{kind:"paragraph";content:WikiInline[]}
  |{kind:"list";items:WikiInline[][]}
  |{kind:"table";columns:string[];rows:string[][]}
  |{kind:"formula";text:string}
  |{kind:"notice";title:string;text:string}
  |{kind:"spoiler";title:string;blocks:WikiBlock[]};
export interface WikiArticle {
  id:string;title:string;category:WikiCategoryId;topic:string;aliases:string[];summary:string;
  ruleStatus:WikiRuleStatus;implementationStatus:WikiImplementationStatus;implementationNote:string;
  sourceSections:string[];sections:{id:string;title:string;blocks:WikiBlock[]}[];related:string[];
  facts?:Record<string,number|number[]|string[]>;
  portrait?:string;
}
export interface WikiCategory {id:WikiCategoryId;title:string;description:string;symbol:string;}
export type WikiRoute={kind:"home"}|{kind:"entry"|"missing";id:string}|{kind:"category";id:WikiCategoryId}|{kind:"search";query:string}|{kind:"terms"|"pending"};
export interface WikiSearchResult {article:WikiArticle;excerpt:string;}
