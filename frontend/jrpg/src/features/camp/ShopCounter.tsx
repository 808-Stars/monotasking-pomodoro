import { useState } from "react";
import { medicines, type GameState } from "../../game/economy.ts";
import { products } from "../../game/camp/catalog.ts";
import { warehouseQuantity } from "../../game/camp/backpack.ts";
import { ItemPages } from "../PageTurns.tsx";
import { CampItemMark } from "./CampArtwork.tsx";
import "./shop-counter.css";

export type ShopCounterProps = {
  game: GameState;
  layer: number;
  cart: Record<string, number>;
  onCart: (cart: Record<string, number>) => void;
  busy: boolean;
  onCheckout: () => void;
};

const format = (value: number) => value.toLocaleString("zh-CN");

/** A local shopping draft. Only the parent may preview and commit a purchase. */
export default function ShopCounter({ game, layer, cart, onCart, busy, onCheckout }: ShopCounterProps) {
  const stock = products.filter((product) => product.tier === layer);
  const [selection, setSelection] = useState("");
  const selected = stock.find((product) => product.id === selection) ?? stock[0];
  const [draft, setDraft] = useState({ id: "", quantity: "1" });
  const [notice, setNotice] = useState("");
  const quantityText = draft.id === selected?.id ? draft.quantity : "1";
  const quantity = Number(quantityText);
  const basket = products.filter((product) => (cart[product.id] ?? 0) > 0);
  const count = basket.reduce((sum, product) => sum + cart[product.id], 0);
  const total = basket.reduce((sum, product) => sum + product.price * cart[product.id], 0);
  const certificateRemaining = selected?.job
    ? Math.max(0, 7 - (game.camp?.certificatePurchases[selected.job] ?? 0))
    : undefined;
  const inBasket = selected ? (cart[selected.id] ?? 0) : 0;
  const available = certificateRemaining === undefined ? undefined : Math.max(0, certificateRemaining - inBasket);
  const validQuantity = Number.isSafeInteger(quantity) && quantity > 0;
  const validCart = Object.entries(cart).every(([id, amount]) =>
    Number.isSafeInteger(amount) && amount >= 0 && (amount === 0 || products.some((product) => product.id === id)),
  );
  const canAdd = !!selected && validQuantity && validCart &&
    Number.isSafeInteger(inBasket + quantity) &&
    Number.isSafeInteger((game.inventory[selected.id] ?? 0) + inBasket + quantity) &&
    Number.isSafeInteger(total + selected.price * quantity) &&
    (available === undefined || quantity <= available);
  const affordable = total <= game.coins;

  function setQuantity(value: string) {
    if (selected) setDraft({ id: selected.id, quantity: value });
    setNotice("");
  }

  function addToBasket() {
    if (busy || !selected || !canAdd) return;
    onCart({ ...cart, [selected.id]: inBasket + quantity });
    setNotice(`已加入${selected.name} × ${quantity}`);
  }

  function removeFromBasket(id: string) {
    if (busy) return;
    const next = { ...cart };
    delete next[id];
    onCart(next);
    setNotice("已从购物篮移除");
  }

  return (
    <section className="shop-counter" aria-label="商店柜台" aria-busy={busy}>
      <div className="shop-counter-balance">
        <span>持有古币 <b>{format(game.coins)}</b></span>
        <span className="shop-counter-feedback" role="status">{notice || "挑选货品，加入旅途所需"}</span>
      </div>

      <div className="shop-counter-display">
        <nav className="shop-counter-shelf" aria-label="选择商品">
          <ItemPages label="货架" size={4} resetKey={layer} className="shop-counter-products">
            {stock.map((product) => (
              <button type="button" className="shop-counter-product" key={product.id}
                aria-pressed={selected?.id === product.id} disabled={busy}
                onClick={() => {
                  setSelection(product.id);
                  setDraft({ id: product.id, quantity: "1" });
                  setNotice("");
                }}>
                <CampItemMark id={product.id} />
                <span className="shop-counter-product-copy">
                  <span className="shop-counter-product-name">{product.name}</span>
                  <span className="shop-counter-product-description" title={product.description}>{product.description}</span>
                </span>
                <span className="shop-counter-product-price">{format(product.price)}<small> 古币</small></span>
                {(cart[product.id] ?? 0) > 0 && <span className="shop-counter-badge">篮中 {cart[product.id]}</span>}
              </button>
            ))}
          </ItemPages>
        </nav>

        {selected ? <article className="shop-counter-detail" aria-label={`${selected.name}商品详情`}>
          <div className="shop-counter-showpiece"><CampItemMark id={selected.id} /></div>
          <div className="shop-counter-intro" aria-live="polite">
            <span className="shop-counter-kind">{medicines.some((medicine) => medicine.id === selected.id) ? "战斗物品" : "成长物品"}</span>
            <h3>{selected.name}</h3>
            <p className="shop-counter-description">{selected.description}</p>
          </div>
          <div className="shop-counter-facts">
            <span>单价 <b>{format(selected.price)}</b> 古币</span>
            <span>仓库库存 <b>{format(warehouseQuantity(game, selected.id))}</b></span>
            {certificateRemaining !== undefined && <span className="shop-counter-limit">本周目剩余 {certificateRemaining} 张 · 可再加入 {available} 张</span>}
          </div>
          <div className="shop-counter-order">
            <div className="shop-counter-stepper" role="group" aria-label={`${selected.name}购买数量调整`}>
              <button type="button" aria-label={`减少${selected.name}购买数量`} disabled={busy || !validQuantity || quantity <= 1}
                onClick={() => setQuantity(String(quantity - 1))}>−</button>
              <input type="number" min={1} step={1} max={available}
                aria-label={`${selected.name}购买数量`} aria-invalid={!validQuantity || (available !== undefined && quantity > available)}
                value={quantityText} disabled={busy} onChange={(event) => setQuantity(event.target.value)} />
              <button type="button" aria-label={`增加${selected.name}购买数量`}
                disabled={busy || !validQuantity || !Number.isSafeInteger(quantity + 1) || (available !== undefined && quantity >= available)}
                onClick={() => setQuantity(String(quantity + 1))}>＋</button>
            </div>
            <button type="button" className="shop-counter-add" disabled={busy || !canAdd} onClick={addToBasket}>加入购物篮</button>
          </div>
          <p className="shop-counter-order-note">
            {!validQuantity ? "请输入正整数数量" : available !== undefined && quantity > available
              ? "所选数量超过本周目剩余供应" : `本次 ${format(selected.price * quantity)} 古币 · 篮中已有 ${inBasket} 件`}
          </p>
        </article> : <p className="shop-counter-empty">此货架暂无商品。</p>}
      </div>

      <footer className="shop-counter-basket">
        <div className="shop-counter-basket-heading">
          <details className="shop-counter-summary">
            <summary>购物篮 · {basket.length} 种 / {format(count)} 件{basket.length > 0 ? " · 查看明细" : " · 尚未添加"}</summary>
            <div className="shop-counter-basket-list">
              {basket.length === 0 ? <p>选择货品后，点击「加入购物篮」。</p> : <ItemPages label="购物篮明细" size={3}>{basket.map((product) => (
                <div className="shop-counter-basket-item" key={product.id}>
                  <span>{product.name} × {cart[product.id]}</span>
                  <span>{format(product.price * cart[product.id])} 古币</span>
                  <button type="button" disabled={busy} aria-label={`从购物篮移除${product.name}`}
                    onClick={() => removeFromBasket(product.id)}>移除</button>
                </div>
              ))}</ItemPages>}
            </div>
          </details>
          <button type="button" className="shop-counter-clear" disabled={busy || Object.keys(cart).length === 0}
            onClick={() => { onCart({}); setNotice("购物篮已清空"); }}>清空购物篮</button>
        </div>
        <div className="shop-counter-settle">
          <span>合计 <b>{format(total)}</b> 古币</span>
          <span className="shop-counter-budget" role="status">{!validCart || !Number.isSafeInteger(total)
            ? "清单数量无效，请移除或清空后重选" : affordable ? `购后余 ${format(game.coins - total)}` : `还差 ${format(total - game.coins)} 古币`}</span>
          <button type="button" className="shop-counter-checkout"
            disabled={busy || !basket.length || !validCart || !Number.isSafeInteger(total) || !affordable}
            onClick={onCheckout}>预览结账</button>
        </div>
      </footer>
    </section>
  );
}
