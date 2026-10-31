import { isConfirmKey } from "./keyboard.ts";

export const commandBranches = [
  ["attack","攻击"],["skill","技能"],["pp","绝技"],
  ["item","道具"],["defend","防御"],["retreat","撤退"],
] as const;
export type CommandBranch = (typeof commandBranches)[number][0];
export interface CommandMenuState { owner:string;branch:CommandBranch|null;chosen:boolean }
export function commandKeyAction(key:string) {
  if(isConfirmKey(key))return "confirm";
  switch(key.toLowerCase()){
    case "w":case "arrowup":return "previous";
    case "s":case "arrowdown":return "next";
    case "a":case "arrowleft":return "decrease-bp";
    case "d":case "arrowright":return "increase-bp";
    case "backspace":return "back";
    default:return null;
  }
}
export function nextCommandIndex(current:number,direction:-1|1,count:number):number {
  if(count<=0)return -1;
  if(current<0||current>=count)return direction===1?0:count-1;
  return (current+direction+count)%count;
}
/** Selection only: actual BP payment remains in the battle engine. */
export function adjustCommandBP(current:number,delta:-1|0|1,available:number):number {
  return Math.max(0,Math.min(3,available,current+delta));
}
export function menuForTurn(state:CommandMenuState,owner:string):CommandMenuState {
  return state.owner===owner?state:{owner,branch:null,chosen:false};
}
export function backCommandMenu(state:CommandMenuState):CommandMenuState {
  return {...state,branch:state.chosen?state.branch:null,chosen:false};
}
/** Picking a command category is navigation, not a combat action. */
export function enterCommandMenu(owner:string,branch:CommandBranch):CommandMenuState {
  return {owner,branch,chosen:false};
}

