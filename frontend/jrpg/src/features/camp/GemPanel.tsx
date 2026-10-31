import { useState } from "react";
import { type GameState } from "../../game/economy.ts";
import { jobNames } from "../../game/camp/catalog.ts";
import {
  gemFamilies,
  gemRecipes,
  gemKey,
  gemName,
  parseGem,
  availableGemSlots,
  equipGem,
  combineGem,
  upgradeGem,
  gemEffectsNotice,
  gemReverseDisabledReason,
  type GemFamily,
  type GemTier,
  type GemSlot,
} from "../../game/camp/gems.ts";
import "./tavern.css";
import { CampHeroPicker, CampHeroSheet, CampItemMark } from "./CampArtwork.tsx";
import {ItemPages} from "../PageTurns.tsx";
import "./gem-workbench.css";
type Props = {
  game: GameState;
  busy: boolean;
  view?: string;
  onChange: (title: string, change: (g: GameState) => GameState) => void;
};
const slotNames: Record<string, string> = {
  helmet: "头盔",
  armor: "盔甲",
  shield: "盾牌",
  accessory1: "饰品Ⅰ",
  accessory2: "饰品Ⅱ",
};
export default function GemPanel({ game: g, busy, onChange, view }: Props) {
  const [hero, setHero] = useState("warrior"),
    [tier, setTier] = useState<GemTier>(1),
    [family, setFamily] = useState<GemFamily>("火灼玉"),
    [count, setCount] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<GemSlot>("helmet");
  const inventory = Object.entries(g.gems).filter(([, n]) => n > 0);
  const [localPage, setPage] = useState<"equip"|"forge"|"upgrade"|"inventory">("equip");
  const page = view === "equip" || view === "forge" || view === "upgrade" || view === "inventory" ? view : localPage;
  const slots = availableGemSlots(g, hero);
  const slot = slots.includes(selectedSlot) ? selectedSlot : slots[0];
  const equipped = slot ? g.camp?.gemEquipment?.[hero]?.[slot] : undefined;
  const lockedSlots = (["helmet", "armor", "shield", "accessory1", "accessory2"] as const)
    .filter((part) => !slots.includes(part));
  return (
    <section className="camp-gem-workbench gem-workbench" data-gem-view={page}>
      {!view && <nav className="camp-tabs" aria-label="尘玉工作台">
        {([["equip","装备镶嵌"],["forge","炼成与升阶"],["inventory","尘玉库存"]] as const).map(([id,label])=>
          <button type="button" key={id} aria-pressed={page===id} onClick={()=>setPage(id)}>{label}</button>)}
      </nav>}
      {page==="equip"&&<>
      <header className="gem-workbench-heading">
        <h3>尘玉配置</h3>
        <p>{gemEffectsNotice}</p>
      </header>
      <CampHeroPicker value={hero} onSelect={setHero}/>
      <div className="gem-workbench-equipment">
        <div className="gem-workbench-hero"><CampHeroSheet hero={hero} game={g}/></div>
        <div className="gem-workbench-body">
          <div className="gem-workbench-slots" role="group" aria-label={`${jobNames[hero]}尘玉装备栏`}>
            {slots.map((part) => {
              const key = g.camp?.gemEquipment?.[hero]?.[part];
              return <button type="button" key={part} aria-pressed={slot === part}
                onClick={() => setSelectedSlot(part)}>
                <span>{slotNames[part] ?? part}</span>
                <small>{key ? gemName(key) : "未装备"}</small>
              </button>;
            })}
            {lockedSlots.map((part) => <button type="button" key={part} disabled>
              <span>{slotNames[part]}</span><small>尚未开放</small>
            </button>)}
          </div>
          <section className="gem-workbench-current" aria-label="所选部位与尘玉" aria-live="polite">
            <CampItemMark id={equipped??"gem"}/>
            <div>
              <small>{jobNames[hero]} · {slot ? slotNames[slot] ?? slot : "暂无开放栏位"}</small>
              <h4>{equipped ? gemName(equipped) : "未装备"}</h4>
              <p>{equipped ? `${parseGem(equipped).family} · ${["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ"][parseGem(equipped).tier - 1]}阶` : slot ? "从下方库存选择尘玉镶嵌" : "装备栏尚未开放"}</p>
            </div>
            <button type="button" disabled={busy || !slot || !equipped}
              onClick={() => { if (slot) onChange("保存尘玉配置", (s) => equipGem(s, hero, slot, null)); }}>
              卸下尘玉
            </button>
          </section>
          <div className="gem-workbench-inventory-heading"><h4>尘玉库存</h4><small>选择尘玉 · 预览镶嵌</small></div>
          <ItemPages label="可镶嵌尘玉" size={6} resetKey={`${hero}:${slot ?? "locked"}`} className="gem-workbench-tiles">
            {inventory.length ? inventory.map(([key, n]) => {
              const gem = parseGem(key);
              const isEquipped = !!equipped && parseGem(equipped).key === gem.key;
              return <button type="button" key={key} className="gem-workbench-tile"
                disabled={busy || !slot} aria-pressed={isEquipped}
                aria-label={`${gemName(key)}，库存${n}${isEquipped ? "，当前部位已装备" : "，预览镶嵌"}`}
                onClick={() => { if (slot) onChange("保存尘玉配置", (s) => equipGem(s, hero, slot, gem.key)); }}>
                <CampItemMark id={key}/>
                <span><b>{gemName(key)}</b><small>{isEquipped ? "当前已装备" : `${["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ"][gem.tier - 1]}阶`} · 库存 {n}</small></span>
              </button>;
            }) : <p className="gem-workbench-empty">尘玉匣尚空。带回石样，便能开始分析与炼成。</p>}
          </ItemPages>
        </div>
      </div>
      </>}
      {(page==="forge" || page==="upgrade")&&<>
      <h3>炼玉</h3>
      <p>
        同阶异族按固定配方合成；同族同阶三合一升阶。已装备的尘玉不会被消耗。
      </p>
      <div className="camp-craft-tools"><label>
        阶级{" "}
        <select
          aria-label="炼玉阶级"
          value={tier}
          onChange={(e) => setTier(Number(e.target.value) as GemTier)}
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ"][n - 1]}
            </option>
          ))}
        </select>
      </label>
      <label>
        数量{" "}
        <input
          aria-label="炼玉数量"
          type="number"
          min="1"
          step="1"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </label>
      </div>
      {page !== "upgrade" && <ItemPages label="炼玉配方" size={3} className="camp-gem-recipes">
      {gemRecipes.map((r) => (
        <div className="camp-row" key={r.output}>
          <CampItemMark id="gem"/>
          <span>
            {r.inputs.map((x) => gemName(gemKey(x, tier))).join(" + ")} →{" "}
            {gemName(gemKey(r.output, tier))}
          </span>
          <button
            disabled={busy}
            onClick={() =>
              onChange(`合成${r.output}×${count}`, (s) =>
                combineGem(s, r.output, tier, count),
              )
            }
          >
            预览合成
          </button>
        </div>
      ))}
      </ItemPages>}
      {(!view || page === "upgrade") && <div className="camp-craft-tools">
      <label>
        升阶家族{" "}
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value as GemFamily)}
        >
          {gemFamilies.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <button
        disabled={busy || tier === 4}
        onClick={() =>
          onChange("尘玉升阶", (s) =>
            upgradeGem(s, gemKey(family, tier), count),
          )
        }
      >
        预览三合一升阶
      </button>
      </div>}
      </>}
      {page==="inventory"&&<>
      <h3>库存</h3>
      <ItemPages label="尘玉库存" size={6} className="gem-workbench-tiles">{inventory.length?inventory.map(([key,n])=>
        <article key={key} className="gem-workbench-tile"><CampItemMark id="gem"/><div><b>{gemName(key)}</b><p>持有数量 · {n}</p></div></article>):<p className="gem-workbench-empty">尘玉匣尚空。带回石样，便能开始分析与炼成。</p>}</ItemPages>
      <p>{gemReverseDisabledReason}</p>
      </>}
    </section>
  );
}
