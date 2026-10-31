import { useEffect, useRef } from "react";
import { motionFrames, effectNames, poseSource } from "./motion.ts";

const imageCache = new Map<string, HTMLImageElement>();
function imageFor(src: string) {
  let image = imageCache.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    imageCache.set(src, image);
  }
  return image;
}
export function preloadMotion(ids: string[]) {
  for (const id of ids) imageFor(poseSource(id, "idle"));
  for (const icon of [
    "sword",
    "spear",
    "bow",
    "fan",
    "axe",
    "staff",
    "fire",
    "water",
    "wood",
    "wind",
    "earth",
    "thunder",
    "heal",
    "potion",
    "shield",
    "boost",
  ])
    imageFor(`/jrpg/assets/action-icons/${icon}.webp`);
  for (const key of Object.keys(effectNames))
    imageFor(`/jrpg/assets/motion/effects/${key}.webp`);
}
export function PoseImage({
  id,
  pose,
  className,
  alt,
  style,
  speed = 1,
}: {
  id: string;
  pose: string;
  className: string;
  alt: string;
  style?: React.CSSProperties;
  speed?: number;
}) {
  return (
    <img
      className={className}
      src={poseSource(id, pose)}
      data-pose={pose}
      alt={alt}
      style={{
        ...style,
        animationDuration: `${(pose === "hurt" ? 240 : 360) / Math.max(1, speed)}ms`,
      }}
      onError={(e) => {
        const fallback = poseSource(id, "idle");
        if (e.currentTarget.getAttribute("src") !== fallback)
          e.currentTarget.src = fallback;
      }}
    />
  );
}
export function ActionIcon({
  icon,
  token,
  duration,
  reduced = false,
}: {
  icon: string;
  token: string;
  duration: number;
  reduced?: boolean;
}) {
  return (
    <span
      key={token}
      className={`action-icon ${reduced ? "icon-still" : ""}`}
      data-icon={icon}
      style={{ "--icon-duration": `${duration}ms` } as React.CSSProperties}
      role="img"
      aria-label={`${icon}动作图标`}
    >
      <img src={`/jrpg/assets/action-icons/${icon}.webp`} alt="" />
    </span>
  );
}
/** Playback only: never mutates the save, battle, random cursor or target. */
export function PixelEffect({
  effect,
  token,
  duration = 240,
  className = "",
}: {
  effect: string;
  token: string | number;
  duration?: number;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current,
      image = imageFor(`/jrpg/assets/motion/effects/${effect}.webp`);
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let cancelled = false,
      frame = 0,
      start = 0;
    const draw = (now: number) => {
      if (cancelled) return;
      if (!start) start = now;
      const progress = (now - start) / duration;
      ctx.clearRect(0, 0, 256, 256);
      if (progress >= 1) return;
      const frames = motionFrames(effect),
        index = frames[progress < 0.48 ? 0 : 1];
      const cw = image.naturalWidth / 2,
        ch = effect === "fire" ? image.naturalHeight / 2 : image.naturalHeight;
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = progress > 0.8 ? (1 - progress) / 0.2 : 0.85;
      ctx.drawImage(
        image,
        (index % 2) * cw,
        Math.floor(index / 2) * ch,
        cw,
        ch,
        0,
        0,
        256,
        256,
      );
      c.dataset.frame = String(index);
      frame = requestAnimationFrame(draw);
    };
    const play = () => {
      if (!cancelled) frame = requestAnimationFrame(draw);
    };
    if (image.complete && image.naturalWidth) play();
    else image.addEventListener("load", play, { once: true });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      image.removeEventListener("load", play);
      ctx.clearRect(0, 0, 256, 256);
    };
  }, [effect, token, duration]);
  return (
    <canvas
      ref={canvas}
      width={256}
      height={256}
      className={`pixel-effect ${className}`}
      data-effect={effect}
      aria-hidden="true"
    />
  );
}
