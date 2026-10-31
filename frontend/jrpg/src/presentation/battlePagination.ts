export interface BattlePage { start:number; end:number }

/** Greedy, whole-entry pages. Oversized entries occupy their own page. */
export function packBattlePages(heights:readonly number[], capacity:number, limit=Infinity, gap=8):BattlePage[] {
  const pages:BattlePage[]=[];
  let start=0,used=0;
  heights.forEach((height,index)=>{
    if(index>start&&(index-start>=limit||used+gap+height>capacity)) {
      pages.push({start,end:index});start=index;used=0;
    }
    used+=(index>start?gap:0)+height;
  });
  if(heights.length)pages.push({start,end:heights.length});
  return pages.length?pages:[{start:0,end:0}];
}

export function battlePageForItem(pages:readonly BattlePage[], index:number):number {
  return Math.max(0,pages.findIndex(page=>index>=page.start&&index<page.end));
}

export function boundedBattlePage(page:number,count:number):number {
  return Math.max(0,Math.min(page,Math.max(0,count-1)));
}
