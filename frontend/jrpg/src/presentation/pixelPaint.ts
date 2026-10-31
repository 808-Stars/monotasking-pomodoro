import type { Mark } from "./battleVfx.ts";
export interface PixelSpan { x:number; y:number; width:number; height:number; color:string; alpha:number }
/** Rasterize once onto a 64px grid. No browser antialiasing, no random particles. */
export function rasterMarks(marks:readonly Mark[]):PixelSpan[] {
  const spans:PixelSpan[]=[];
  for(const mark of marks) {
    const points=mark.points.map(([x,y])=>[Math.round(x/2),Math.round(y/2)] as const);
    const cells=new Set<number>();
    const cell=(x:number,y:number)=>{ if(x>=0&&y>=0&&x<64&&y<64) cells.add(y*64+x); };
    if(mark.fill && points.length>=3) {
      for(let y=0;y<64;y++) {
        const crossings:number[]=[];
        for(let i=0;i<points.length;i++) {
          const a=points[i],b=points[(i+1)%points.length],scan=y+.5;
          if((a[1]<=scan&&b[1]>scan)||(b[1]<=scan&&a[1]>scan))
            crossings.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));
        }
        crossings.sort((a,b)=>a-b);
        for(let i=0;i+1<crossings.length;i+=2)
          for(let x=Math.max(0,Math.ceil(crossings[i]-.5));x<Math.min(64,Math.ceil(crossings[i+1]-.5));x++) cell(x,y);
      }
    } else {
      const size=Math.max(1,Math.round((mark.width??2)/2)),offset=Math.floor(size/2);
      for(let i=1;i<points.length;i++) {
        let [x,y]=points[i-1]; const [endX,endY]=points[i];
        const dx=Math.abs(endX-x),dy=-Math.abs(endY-y),sx=x<endX?1:-1,sy=y<endY?1:-1;
        let error=dx+dy;
        while(true) {
          for(let yy=0;yy<size;yy++) for(let xx=0;xx<size;xx++) cell(x+xx-offset,y+yy-offset);
          if(x===endX&&y===endY) break;
          const twice=error*2;
          if(twice>=dy){ error+=dy;x+=sx; }
          if(twice<=dx){ error+=dx;y+=sy; }
        }
      }
    }
    // Merge contiguous cells to avoid alpha doubling at joined stroke corners.
    const sorted=[...cells].sort((a,b)=>a-b);
    for(let i=0;i<sorted.length;) {
      const start=sorted[i],y=Math.floor(start/64),x=start%64;
      let width=1;i++;
      while(i<sorted.length&&sorted[i]===start+width&&Math.floor(sorted[i]/64)===y){width++;i++;}
      spans.push({x,y,width,height:1,color:mark.color,alpha:mark.alpha});
    }
  }
  return spans;
}
