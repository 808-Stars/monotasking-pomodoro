export function nextBattleSpeed(speed:number):number { return speed===1?2:speed===2?4:1; }
export function systemReducedMotion(query?: (value:string)=>{matches:boolean}):boolean {
  const media=query??(typeof matchMedia==="function"?matchMedia.bind(globalThis):undefined);
  return media?.("(prefers-reduced-motion: reduce)").matches??false;
}
