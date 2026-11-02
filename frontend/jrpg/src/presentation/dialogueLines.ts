/** Wrap in logical scene pixels. Visual zoom must never supply this width. */
export function dialogueLines(text:string,width:number,measure:(text:string)=>number):string[]{
 if(!Number.isFinite(width)||width<=0)return text.split('\n');
 const result:string[]=[];
 for(const paragraph of text.split('\n')){
  if(measure(paragraph)<=width){result.push(paragraph);continue;}
  const parts=[...new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(paragraph)].map(p=>p.segment);
  let line='';
  for(const part of parts){
   if(line&&measure(line+part)>width){
    if(/^[，。！？、；：）】》”’]/u.test(part)&&Array.from(line).length>1){
     const chars=Array.from(line),tail=chars.pop()!;result.push(chars.join(''));line=tail+part;
    }else{result.push(line);line=part;}
   }else line+=part;
  }
  result.push(line);
 }
 return result;
}
