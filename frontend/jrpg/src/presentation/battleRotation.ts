export function nextBattleRotation(angle:number):number { return (angle+90)%360; }

/** Fit the original composition as a single surface, without mobile reflow. */
export function battleRotationScale(width:number,height:number,angle:number):number {
  if(width<=0||height<=0||angle%180===0)return 1;
  return Math.min(1,width/height,height/width);
}
