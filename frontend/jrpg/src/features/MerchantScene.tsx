import { useEffect, useRef, useState } from "react";
import { isEditingTarget } from "../presentation/keyboard.ts";
import "./merchant-scene.css";

interface Props {
  busy: boolean;
  overlayOpen: boolean;
  places: { name: string; job: string }[];
  line: string;
  onOption: (index: number) => void;
  onNavigate: (index: number) => void;
  onMap: () => void;
  onReset: () => void;
}

export default function MerchantScene({
  busy,
  overlayOpen,
  places,
  line,
  onOption,
  onNavigate,
  onMap,
  onReset,
}: Props) {
  const [panel, setPanel] = useState<"talk" | "nav" | null>(null);
  const merchant = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (panel && !overlayOpen)
      panelRef.current
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus();
  }, [panel]); // Closing a transaction restores its own initiating option.
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" || busy || overlayOpen || !panel||isEditingTarget(e.target)) return;
      e.preventDefault();
      if(e.repeat)return;
      setPanel(null);
      (panel === "talk" ? merchant : navigation).current?.focus();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [busy, overlayOpen, panel]);
  function close() {
    if (busy) return;
    setPanel(null);
    (panel === "talk" ? merchant : navigation).current?.focus();
  }
  return (
    <main
      className={`merchant-world ${panel ? `merchant-${panel}` : ""}`}
      aria-label="商铺场景"
      inert={overlayOpen}
    >
      <button
        className="merchant-empty-space"
        tabIndex={-1}
        aria-label="收起交谈与导航"
        onClick={close}
        disabled={busy}
      />
      <div className="merchant-location">
        <span className="merchant-location-name">商铺</span>
        <button
          ref={navigation}
          aria-expanded={panel === "nav"}
          aria-controls="merchant-navigation"
          disabled={busy}
          onClick={() => setPanel(panel === "nav" ? null : "nav")}
        >
          营地导航
        </button>
      </div>
      <button
        ref={merchant}
        className="merchant-person"
        aria-label="与商人交谈"
        aria-expanded={panel === "talk"}
        disabled={busy}
        onClick={() => setPanel(panel === "talk" ? null : "talk")}
      >
        <span className="merchant-interact">
          <span aria-hidden="true">◇</span> 商人 <small>交谈</small>
        </span>
      </button>
      {!panel && <p className="merchant-greeting">今天还是老样子吗？</p>}
      {panel === "talk" && (
        <section
          className="merchant-conversation"
          ref={panelRef}
          aria-label="与商人交谈"
        >
          <div className="merchant-conversation-head">
            <span>商人</span>
            <button onClick={close} aria-label="结束交谈" disabled={busy}>
              ×
            </button>
          </div>
          <p>{line}</p>
          <div className="merchant-choices">
            <button
              aria-label="看看你有什么货"
              disabled={busy}
              onClick={() => onOption(1)}
            >
              看看你有什么货
            </button>
            <button disabled>
              来点狠货怎么样 <small>专业 · 尚未开放</small>
            </button>
            <button disabled>
              来点……你懂的 <small>神秘 · 尚未开放</small>
            </button>
            <button
              aria-label="清点带回来的东西"
              className="merchant-count"
              disabled={busy}
              onClick={() => onOption(0)}
            >
              清点带回来的东西
            </button>
          </div>
        </section>
      )}
      {panel === "nav" && (
        <nav
          id="merchant-navigation"
          className="merchant-navigation"
          aria-label="营地地点"
          ref={panelRef}
        >
          <div className="merchant-conversation-head">
            <span>去哪里？</span>
            <button aria-label="收起导航" onClick={close}>
              ×
            </button>
          </div>
          {places.map((place, index) => (
            <button
              key={place.name}
              disabled={busy}
              aria-current={index === 2 ? "location" : undefined}
              onClick={() => (index === 2 ? close() : onNavigate(index))}
            >
              {place.name}
              <small>{index === 2 ? "当前所在" : "前往"}</small>
            </button>
          ))}
          <button onClick={onMap} disabled={busy} aria-label="冒险地图">
            冒险地图 <small>离开营地</small>
          </button>
          <details className="merchant-dev">
            <summary>Demo 设置</summary>
            <button disabled={busy} onClick={onReset}>
              Reset Demo
            </button>
          </details>
        </nav>
      )}
      <span className="merchant-scene-hint">
        {panel === "talk"
          ? "点击空白处，结束交谈"
          : panel === "nav"
            ? "选择下一处灯火"
            : "点击商人交谈"}
      </span>
    </main>
  );
}
