export type Point = readonly [number, number];
export interface Mark {
  points: Point[];
  color: string;
  alpha: number;
  width?: number;
  fill?: boolean;
}
export const theatreEffects = [
  "physical","spear","bow","fan","axe","staff",
  "fire","water","wood","wind","earth","thunder",
  "heal","energy","shield","boost","debuff","cleanse",
  "explosion","stasis","silence","float","erosion","confusion",
  "evade","critical","weak","break","ko","reward",
] as const;
export type TheatreEffect = typeof theatreEffects[number];
const ivory = "#e1d6b4", gold = "#bea066", blue = "#809eae", green = "#8da581";
/** Deliberate, low-resolution key shapes, with no battle RNG or image loads. */
export function effectFrame(effect: string, progress: number): Mark[] {
  if (!Number.isFinite(progress) || progress <= 0 || progress >= 1 ||
      !theatreEffects.includes(effect as TheatreEffect)) return [];
  // Ten readable key drawings, not smoothly interpolated vector glitter.
  const t = Math.floor(progress * 10) / 10;
  const strength = Math.min(1, progress * 7) * Math.min(1, (1-progress) * 3);
  const expand = Math.min(1, t * 2.5), lift = t * 14;
  const marks: Mark[] = [];
  const add = (points: Point[], color: string, fill = true, alpha = 1, width = 2) => {
    marks.push({points:points.map(([x,y]) => [
      Math.max(2, Math.min(126, Math.round(x / 2) * 2)),
      Math.max(2, Math.min(126, Math.round(y / 2) * 2)),
    ]), color,fill,alpha:Math.max(0.001,alpha*strength),width});
  };
  const line = (p: Point[], color = ivory, width = 2, alpha = 1) => add(p,color,false,alpha,width);
  const diamond = (x: number,y: number,r: number,color=ivory,alpha=1) =>
    add([[x,y-r],[x+r*0.6,y],[x,y+r],[x-r*0.6,y]],color,true,alpha);
  const ring = (r: number,color=gold,alpha=1,cy=66) => {
    const points: Point[] = [];
    for (let i=0;i<=12;i++) {
      const angle=i*Math.PI/6;
      points.push([64+Math.cos(angle)*r,cy+Math.sin(angle)*r*0.65]);
    }
    line(points,color,2,alpha);
  };
  const chips = (color=ivory,count=6) => {
    for(let i=0;i<count;i++) {
      const angle=i*2.399+0.3, radius=15+expand*(20+(i%3)*9);
      diamond(64+Math.cos(angle)*radius,64+Math.sin(angle)*radius,2+(i%2)*2,color,0.7);
    }
  };
  if(effect === "physical") {
    const d=t*8;
    add([[22,102-d],[43,64-d],[101,20],[83,61],[42,94-d]],"#777b7a",true,0.65);
    add([[25,102-d],[53,55],[103,20],[74,58],[43,91-d]],ivory);
    line([[30,101-d],[63,61],[99,25]],gold,2);
    chips(gold,4);
  } else if(effect === "spear") {
    const x=12+expand*22;
    add([[x,62],[98,54],[119,64],[98,72],[x,68]],"#798e99",true,0.7);
    add([[x+6,64],[94,60],[114,64],[94,66]],ivory);
    line([[91,39],[99,50]],gold); line([[91,90],[99,78]],gold);
  } else if(effect === "bow") {
    const x=24+expand*35;
    line([[8,76],[x+16,63]],blue,4,0.6);
    line([[x-22,68],[x+27,57]],ivory,2);
    add([[x+31,56],[x+19,52],[x+22,63]],gold);
    line([[x-17,62],[x-12,69],[x-20,76]],gold);
    line([[99,40],[108,54],[115,58]],ivory,2,0.65);
    line([[100,75],[110,67],[116,64]],ivory,2,0.65);
  } else if(effect === "fan") {
    add([[32,94],[27,56],[41,32],[58,24],[82,32],[106,52],[107,74]],"#918091",true,0.5);
    for(let i=0;i<4;i++) line([[33,91],[43+i*16,31+i*7],[60+i*14,40+i*9]],ivory,2,0.7);
    line([[32,92],[59,92],[84,85],[104,71]],gold,4);
  } else if(effect === "axe") {
    add([[39,22],[77,24],[98,49],[91,76],[70,96],[61,113],[54,84],[53,57]],"#8c8474",true,0.75);
    add([[47,21],[68,25],[76,61],[69,91],[61,112],[59,76]],ivory);
    line([[28,98],[46,90],[63,112],[85,90],[102,98]],gold,4);
    chips(gold,5);
  } else if(effect === "staff") {
    ring(18+expand*18,blue,0.6);
    diamond(64,64,26,gold,0.55); diamond(64,64,16,ivory);
    line([[18,64],[44,64]],ivory,4); line([[84,64],[110,64]],ivory,4);
  } else if(effect === "fire" || effect === "explosion") {
    for(let i=0;i<3;i++) {
      const x=38+i*25, y=100-lift, h=28+(i===1?35:9)*expand;
      add([[x-12,y],[x-15,y-17],[x-5,y-h],[x+1,y-h-9],[x+3,y-h+16],
        [x+12,y-28],[x+16,y-10],[x+8,y+4]],"#ac7866",true,0.8);
      add([[x-6,y],[x-6,y-13],[x+1,y-h+17],[x+7,y-7]],"#dcc298",true,0.9);
    }
    if(effect === "explosion") { ring(22+expand*30,"#bd957c",0.7); chips(gold,8); }
    else { diamond(43,29-lift/2,3,gold); diamond(88,25,4,gold); }
  } else if(effect === "water") {
    add([[20,86],[28,56],[42,35],[62,31],[82,43],[99,34],[109,49],[102,73],
      [90,88],[65,96],[41,96]],"#658394",true,0.65);
    add([[25,81],[32,58],[43,45],[57,44],[65,53],[60,68],[76,78],[95,69],
      [99,49],[104,61],[94,83],[67,91],[43,91]],"#b8cbd0",true,0.85);
    ring(31+expand*10,blue,0.7,98-lift/2);
  } else if(effect === "wood") {
    line([[64,107],[60,79],[71,57],[66,29]],"#687765",4);
    line([[60,80],[36,62],[30,41]],green,4);
    line([[67,66],[92,50],[98,33]],green,4);
    for(const [x,y,flip] of [[37,57,1],[49,75,-1],[85,51,-1],[70,38,1]])
      add([[x,y+10],[x+flip*15,y+2],[x+flip*17,y-14],[x+flip*3,y-9]],green,true,0.8);
    diamond(62,91-lift,5,ivory,0.5);
  } else if(effect === "wind") {
    line([[18,89],[28,95],[55,95],[79,83],[95,64],[92,47],[77,37]],"#9dac9d",6,0.5);
    line([[19,78],[28,83],[48,83],[70,73],[84,58],[83,45],[75,40]],ivory,2,0.9);
    line([[33,48],[48,39],[70,31],[96,36],[108,52],[110,68]],blue,4,0.65);
    line([[20,105],[41,104],[62,96]],green,2);
  } else if(effect === "earth") {
    for(let i=0;i<3;i++) {
      const x=30+i*31, y=99, h=22+expand*(i===1?40:20);
      add([[x-13,y],[x-8,y-h],[x+5,y-h-10],[x+15,y-13],[x+10,y+6]],"#958773",true,0.85);
      add([[x-8,y-h],[x+5,y-h-10],[x+4,y-4],[x-5,y+1]],"#c0b297",true,0.9);
    }
    line([[17,112],[38,108],[51,113],[75,108],[109,112]],gold,2,0.7); chips(gold,5);
  } else if(effect === "thunder") {
    const zig: Point[] = [[75,14],[53,43],[76,45],[44,79],[62,78],[48,113]];
    line(zig,"#877d9d",8,0.55); line(zig,ivory,4);
    line([[69,49],[96,54],[89,77],[107,78]],blue,2);
    line([[51,76],[25,74],[33,53],[21,46]],gold,2); chips(blue,4);
  } else if(effect === "heal") {
    ring(26+expand*12,green,0.65,88);
    add([[59,36-lift],[69,36-lift],[69,51-lift],[84,51-lift],[84,61-lift],
      [69,61-lift],[69,77-lift],[59,77-lift],[59,61-lift],[44,61-lift],
      [44,51-lift],[59,51-lift]],"#b9c8a7",true,0.85);
    diamond(30,73-lift,4,green); diamond(98,64-lift,4,ivory);
  } else if(effect === "energy" || effect === "boost" || effect === "debuff") {
    const c=effect==="debuff"?"#aa8186":effect==="boost"?gold:blue;
    ring(25+expand*16,c,0.6,86);
    for(let i=0;i<3;i++) {
      const x=39+i*25, y=70-lift+(i%2)*12, direction=effect==="debuff"?-1:1;
      line([[x-8,y+direction*6],[x,y-direction*4],[x+8,y+direction*6]],c,4);
      line([[x,y+direction*18],[x,y-direction*4]],ivory,2,0.7);
    }
  } else if(effect === "shield") {
    add([[35,34],[64,24],[93,34],[90,70],[78,89],[64,104],[50,89],[38,70]],blue,true,0.25);
    line([[35,34],[64,24],[93,34],[90,70],[78,89],[64,104],[50,89],[38,70],[35,34]],gold,3);
    line([[47,47],[64,41],[81,47]],ivory,2);
  } else if(effect === "cleanse" || effect === "reward") {
    ring(20+expand*25,ivory,0.6,90);
    for(let i=0;i<5;i++) diamond(28+i*18,45+(i%2)*18-lift,5,i%2?gold:ivory,0.8);
  } else if(effect === "stasis") {
    ring(32,blue,0.8);
    line([[42,28],[86,28],[75,42],[53,80],[42,94],[86,94]],ivory,3);
    line([[42,28],[53,42],[75,80],[86,94]],gold,3);
    add([[55,80],[73,80],[78,88],[50,88]],blue,true,0.6);
  } else if(effect === "silence") {
    ring(32,"#a7a1b3",0.6);
    line([[43,52],[49,52],[49,77]],ivory,3);
    line([[57,42],[57,84]],ivory,3); line([[70,45],[70,81]],ivory,3);
    line([[81,52],[81,77],[86,77]],ivory,3);
    line([[37,90],[91,35]],"#a07882",4);
  } else if(effect === "float") {
    ring(30,blue,0.6,99);
    for(let i=0;i<3;i++) {
      const x=38+i*26;
      line([[x,89-lift],[x,49-lift]],blue,3,0.8);
      line([[x-7,58-lift],[x,49-lift],[x+7,58-lift]],ivory,2);
    }
  } else if(effect === "erosion") {
    for(let i=0;i<4;i++) {
      const x=34+i*20,y=41+(i%2)*17+lift;
      add([[x,y-14],[x+7,y],[x+6,y+9],[x-5,y+9],[x-8,y]],"#8a9773",true,0.8);
      line([[x-2,y],[x-2,y+6]],ivory,2,0.5);
    }
    ring(32,green,0.4,103);
  } else if(effect === "confusion") {
    line([[29,44],[43,32],[67,32],[78,44],[74,62],[53,73],[47,88],[65,96],[85,88],[99,68]],"#a697b1",4);
    line([[27,81],[35,65],[58,51],[80,53],[91,68],[83,84],[65,86],[59,74]],gold,2);
    diamond(94,31,5,ivory,0.75);
  } else if(effect === "evade") {
    for(let i=0;i<4;i++) {
      const x=26+i*18+lift;
      line([[x,35],[x-10,53],[x-10,82],[x,94]],blue,2,0.3+i*0.15);
    }
    line([[26,106],[49,106],[68,99]],ivory,2,0.8);
  } else if(effect === "weak") {
    const r=30+expand*12;
    for(const [x,y,dx,dy] of [[64-r,64-r,1,1],[64+r,64-r,-1,1],[64-r,64+r,1,-1],[64+r,64+r,-1,-1]])
      line([[x+dx*10,y],[x,y],[x,y+dy*10]],gold,3);
  } else if(effect === "critical") {
    add([[64,22],[71,52],[103,64],[71,74],[64,106],[56,74],[25,64],[56,53]],gold,true,0.65);
    add([[64,40],[68,58],[85,64],[68,68],[64,87],[60,68],[43,64],[60,58]],ivory);
  } else if(effect === "break") {
    const r=16+expand*29;
    for(let i=0;i<7;i++) {
      const a=i*Math.PI*2/7;
      const x=64+Math.cos(a)*r,y=64+Math.sin(a)*r;
      add([[x-5,y-8],[x+7,y-3],[x+3,y+7],[x-8,y+4]],i%2?blue:ivory,true,0.85);
      line([[64+Math.cos(a)*17,64+Math.sin(a)*17],[x,y]],gold,2,0.6);
    }
    ring(32+expand*17,gold,0.45);
  } else if(effect === "ko") {
    for(let i=0;i<5;i++) diamond(36+i*15,64+(i%2)*15+lift,4,"#71808b",0.8);
  }
  return marks;
}
