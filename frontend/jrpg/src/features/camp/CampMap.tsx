import { useState, type CSSProperties } from "react";
import { jobNames } from "../../game/camp/catalog.ts";

// Keep coordinates on the same 16:9 plane as the illustration, including cropping.
const places = [
  { x: 19, y: 49, purpose: "尘玉分析 · 镶嵌与炼成" },
  { x: 49, y: 78, purpose: "补给 · 阵容 · 记录与榜单" },
  { x: 27, y: 69, purpose: "普通 · 专业 · 神秘货架" },
  { x: 71, y: 28, purpose: "首领图鉴 · 旅程成就" },
  { x: 50, y: 25, purpose: "残响引导 · 职业技能" },
  { x: 78, y: 71, purpose: "整队 · 副职业配置" },
  { x: 29, y: 27, purpose: "旧忆图谱 · 成长规划" },
  { x: 82, y: 48, purpose: "背包 · 药品调和与分解" },
];

type Scene = { name: string; job: string };

export default function CampMap({ scenes, onEnter, onAdventure }: {
  scenes: readonly Scene[];
  onEnter: (index: number) => void;
  onAdventure: () => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const selected = hovered === null ? null : scenes[hovered];
  return (
    <section className="camp-town-map" aria-label="营地地图">
      <div className="camp-town-plane">
        <nav className="camp-town-places" aria-label="选择营地场所">
          {scenes.map((scene, index) => {
            const place = places[index];
            return (
              <button
                key={scene.job}
                className="camp-town-place"
                style={{ "--town-x": `${place.x}%`, "--town-y": `${place.y}%` } as CSSProperties}
                aria-label={`${scene.name}：${place.purpose}`}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                onClick={() => onEnter(index)}
              >
                <img src={`/jrpg/assets/head-logos/${scene.job}.webp`} alt="" draggable={false} />
                <b>{scene.name}</b>
                <span className="camp-town-pin" aria-hidden="true" />
              </button>
            );
          })}
        </nav>
      </div>
      <header className="camp-town-heading">
        <span>灯火之内</span>
        <h1>营地地图</h1>
        <p>灯仍亮着，旅人尽可归来。</p>
      </header>
      <div className="camp-town-guide" aria-live="polite" aria-atomic="true">
        <strong>{selected ? `${selected.name} · ${jobNames[selected.job as keyof typeof jobNames]}` : "八处灯火，一处归途"}</strong>
        <span>{hovered === null ? "选择一处场所进入，或打开冒险地图前往灯火之外。" : places[hovered].purpose}</span>
      </div>
      <button className="camp-town-adventure" onClick={onAdventure} aria-label="冒险地图：前往灯火之外">
        <small>灯火之外</small>
        <b>冒险地图 <span aria-hidden="true">→</span></b>
      </button>
    </section>
  );
}
