import {effectNames,motionFrames} from "./motion.ts";

/** Reuse approved artwork explicitly rather than requesting nonexistent PNGs. */
const aliases:Record<string,string>={evade:"wind",critical:"shield",debuff:"boost"};
export function battleEffectSprite(effect:string,progress:number) {
  const key=aliases[effect]??effect;
  if(!Object.hasOwn(effectNames,key)||!Number.isFinite(progress)||progress<=0||progress>=1)return null;
  return {src:`/jrpg/assets/motion/effects/${key}.webp`,
    frame:motionFrames(key)[progress<.48?0:1],rows:key==="fire"?2:1,
    alpha:progress>.8?(1-progress)/.2:.85};
}
