import { heroStats, type GameState } from "../../game/economy.ts";
import { jobNames } from "../../game/camp/catalog.ts";

/** Presentation only; selection callbacks do not spend or persist resources. */
export function CampHeroPicker({ value, onSelect }: { value:string; onSelect:(id:string)=>void }) {
  return <div className="camp-portrait-picker" role="group" aria-label="营地角色">
    {Object.entries(jobNames).map(([id,name])=><button type="button" key={id}
      aria-label={`查看${name}`} aria-pressed={id===value} onClick={()=>onSelect(id)}>
      <img src={`/jrpg/assets/head-logos/${id}.webp`} alt="" draggable={false}/><span>{name}</span>
    </button>)}
  </div>;
}

export function CampHeroSheet({ hero, game }: { hero:string; game:GameState }) {
  const stats=heroStats(hero,game);
  return <aside className="camp-hero-sheet" aria-label={`${jobNames[hero]}行旅档案`}>
    <div className="camp-hero-portrait"><img src={`/jrpg/assets/portraits/${hero}.webp`} alt={jobNames[hero]} draggable={false}/></div>
    <h3>{jobNames[hero]}</h3>
    <p className="camp-hero-subjob">副职业 · {jobNames[game.camp?.equippedSubjobs[hero] ?? ""] ?? "未配置"}</p>
    <dl>
      <div><dt>HP</dt><dd>{game.heroes[hero].hp}<small> / {stats.maxHp}</small></dd></div>
      <div><dt>SP</dt><dd>{game.heroes[hero].sp}<small> / {stats.maxSp}</small></dd></div>
      <div><dt>残响</dt><dd>{game.jp[hero].toLocaleString("zh-CN")}</dd></div>
    </dl>
    <p className="camp-sheet-note">八人同行，各有所长</p>
  </aside>;
}

export function CampItemMark({ id }: { id:string }) {
  const basic=id==='hp'||id.startsWith('hp-')?0:id==='sp'||id.startsWith('sp-')?1:id==='cleanse'||id.startsWith('cleanse-')?2:id==='revive'||id.startsWith('revive-')?3:id==='bp'?4:
    id==='gem'||id.includes('火灼玉')?5:id.includes('水澜玉')?6:id.includes('木华玉')?7:-1;
  if(basic>=0)return <span className="camp-item-mark mark-bitmap" aria-hidden="true"><i className="item-mark-bitmap" style={{backgroundImage:'url("/jrpg/assets/items/medicine-gem-atlas.webp")',backgroundSize:'400% 200%',backgroundPosition:`${(basic%4)/3*100}% ${basic>=4?100:0}%`}}/></span>;
  const type=(id.includes("certificate")||id.startsWith("shop-pass-"))?"certificate":id.includes("scroll")?"scroll":
    id.includes("flower")?"flower":id==="coin"?"coin":id.includes("gem")||/[玉晶石]/.test(id)?"gem":
    /herb|fruit|bud|salt/.test(id)?"herb":"potion";
  const paths:Record<string,string>={
    potion:"M11 4h10M12 4v7l-5 6v9q0 3 3 3h12q3 0 3-3v-9l-5-6V4M8 20h16M12 23h8",
    coin:"M27 16a11 11 0 1 1-22 0 11 11 0 0 1 22 0ZM24 16a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM16 11l5 5-5 5-5-5Z",
    certificate:"M7 3h18v20H7ZM11 8h10M11 12h8M17 18l3 2 3-2v10l-3-2-3 2Z",
    scroll:"M9 5h15v21H8q-5 0-5-4 0-4 5-4h16M9 5q-4 0-4 4h4ZM12 10h8M12 14h6M8 22h12",
    flower:"M16 15C2 16 4 6 11 9c-3-9 7-10 8-2 7-7 13 1 6 5 9 2 5 11-2 7 2 8-7 12-9 4-7 6-13-2-7-6ZM16 13v6M13 16h6",
    gem:"M10 5h12l7 9-13 15L3 14ZM3 14h26M10 5l6 24 6-24",
    herb:"M7 27 24 6M12 21C-1 18 3 7 13 13M18 15c-3-11 6-14 10-10-1 6-4 9-10 10",
  };
  return <span className={`camp-item-mark mark-${type}`} aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" strokeLinecap="round"><path d={paths[type]}/></svg>
  </span>;
}
