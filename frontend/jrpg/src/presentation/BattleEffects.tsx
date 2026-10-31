import { useEffect, useRef } from "react";
import { battleEffectSprite } from "./battleEffectSprites.ts";

const images=new Map<string,HTMLImageElement>();
function imageFor(src:string) {
  let image=images.get(src);
  if(!image){image=new Image();images.set(src,image);image.src=src;}
  return image;
}

/** Approved PNG sprite playback only; battle timing and state remain external. */
export function BattleEffects({effects,token,duration,progress}: {
  effects: string[]; token: string | number; duration: number; progress?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const signature = effects.join(",");
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if(!ctx || !element) return;
    let raf = 0, start: number | null = null, cancelled=false;
    let currentProgress=progress??0;
    const layers=signature.split(",").map(effect=>({effect,
      image:battleEffectSprite(effect,.5)?.src})).filter(layer=>!!layer.image)
      .map(layer=>({effect:layer.effect,image:imageFor(layer.image!)}));
    const paint = (p: number) => {
      if(cancelled)return;
      currentProgress=p;
      ctx.clearRect(0,0,256,256);
      ctx.imageSmoothingEnabled = false;
      for(const {effect,image} of layers) {
        // Shield shatter occurs after the hit, not before the sword arrives.
        const q = effect === "break" && signature.includes(",") ? (p-0.15)/0.85 : p;
        const sprite=battleEffectSprite(effect,q);
        if(!sprite||!image.complete||!image.naturalWidth)continue;
        const width=image.naturalWidth/2,height=image.naturalHeight/sprite.rows;
        ctx.globalAlpha=sprite.alpha;
        ctx.drawImage(image,(sprite.frame%2)*width,Math.floor(sprite.frame/2)*height,
          width,height,0,0,256,256);
      }
      ctx.globalAlpha = 1;
      element.dataset.progress = String(Math.round(p*100));
    };
    // Late loads repaint the current beat, never restart or extend its duration.
    const loaded=()=>paint(currentProgress);
    for(const {image} of layers)image.addEventListener("load",loaded);
    if(progress !== undefined) paint(progress);
    else if(duration > 0) {
      const tick = (now: number) => {
        start ??= now;
        const p = Math.min(1,(now-start)/duration);
        paint(p);
        if(p < 1) raf = requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
    }
    return () => {
      cancelled=true;cancelAnimationFrame(raf);
      for(const {image} of layers)image.removeEventListener("load",loaded);
      ctx.clearRect(0,0,256,256);
    };
  },[signature,token,duration,progress]);
  return <canvas ref={canvas} width={256} height={256} className="theatre-effect"
    data-effects={signature} aria-hidden="true" />;
}
