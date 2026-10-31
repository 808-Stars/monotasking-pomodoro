/** Decorative chrome only: all focus, navigation and actions stay in the menus. */
export function CommandMenuChrome({ title, detail = false, canBoost = true, enemy = false }: {
  title: string; detail?: boolean; canBoost?: boolean; enemy?: boolean;
}) {
  return <>
    <span className="command-panel-edge" aria-hidden="true" />
    <div className="command-menu-heading" aria-hidden="true"><span>{title}</span></div>
    <div className="command-menu-keys" aria-hidden="true">
      {enemy ? "Enter / Space  执行" : detail ? (canBoost ? "← → BP　Backspace 返回" : "Enter 确定　Backspace 返回") : "↑ ↓ 选择　Enter / Space 确定"}
    </div>
  </>;
}
