export const BATTLE_CANVAS_WIDTH=1920;
export const BATTLE_CANVAS_HEIGHT=1080;

/** Only this scale changes on resize; all internal measurements stay logical. */
export function battleCanvasScale(width:number,height:number,angle:number):number {
  if(width<=0||height<=0)return 0;
  const quarterTurn=angle%180!==0;
  return Math.min(width/(quarterTurn?BATTLE_CANVAS_HEIGHT:BATTLE_CANVAS_WIDTH),
    height/(quarterTurn?BATTLE_CANVAS_WIDTH:BATTLE_CANVAS_HEIGHT));
}

type Rect={left:number;top:number;width:number;height:number};

/** Convert a screen-space anchor back into the rotated canvas's local space. */
export function canvasAnchorBounds(anchor:Rect,canvas:Rect,angle:number,scale:number) {
  const radians=angle*Math.PI/180;
  // Right-angle rotations must not introduce rounding noise in popup placement.
  const cos=Math.round(Math.cos(radians)),sin=Math.round(Math.sin(radians));
  const points=[
    [anchor.left,anchor.top],[anchor.left+anchor.width,anchor.top],
    [anchor.left,anchor.top+anchor.height],[anchor.left+anchor.width,anchor.top+anchor.height],
  ].map(([x,y])=>{
    const dx=x-canvas.left-canvas.width/2,dy=y-canvas.top-canvas.height/2;
    return {x:(cos*dx+sin*dy)/scale+BATTLE_CANVAS_WIDTH/2,
      y:(-sin*dx+cos*dy)/scale+BATTLE_CANVAS_HEIGHT/2};
  });
  return {left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),
    right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y))};
}
