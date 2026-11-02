import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createGame, heroStats, processRewards, type GameState } from "../src/game/economy.ts";
import { migrateCamp } from "../src/game/camp/migrate.ts";
import { checkout } from "../src/game/camp/shop.ts";
import { unlockSubjob } from "../src/game/camp/jobs.ts";
import { buyNode, features, growthFor, hasFeature, memoryNodes, previewNodeRefund, refundNode, resourceMultiplier, supportSlots } from "../src/game/camp/memory.ts";

function purchase(ids: string[]) {
  let g = migrateCamp(createGame());
  g.exp = 999999;
  for (const id of ids) g = buyNode(g, id);
  return g;
}

const supportRoute = ["R5C6", "R6C6", "R7C6", "R7C5", "R8C5", "R9C5", "R9C6", "R8C6", "R8C7", "R9C7"];

test("all permanent and function nodes reject direct undo without spending or healing", () => {
  const g = migrateCamp(createGame());
  g.camp!.purchasedNodes = Object.fromEntries(memoryNodes.map(n => [n.id, n.cost]));
  g.inventory["memory-scroll"] = 81;
  g.heroes.warrior.hp = 0;
  const before = structuredClone(g);
  for (const n of memoryNodes.filter(n => n.kind !== "属性" || n.growth === 20)) {
    assert.throws(() => previewNodeRefund(g, n.id), /不能撤销/, n.id);
    assert.throws(() => refundNode(g, n.id), /不能撤销/, n.id);
  }
  assert.deepEqual(g, before);
});

test("cascade refunds only ordinary nodes at actual paid prices and preserves disconnected slots and equipment", () => {
  const g = purchase(supportRoute);
  g.camp!.purchasedNodes.R5C6 = 123;
  g.camp!.purchasedNodes.R8C5 = 777;
  g.camp!.supports.warrior = ["warrior-support-1", "warrior-support-2", "warrior-support-3", "warrior-support-4"];
  g.camp!.subjobUnlocks.warrior = ["scholar"];
  g.camp!.equippedSubjobs.warrior = "scholar";
  g.heroes.warrior.hp = 0;
  g.heroes.scholar.sp = 7;
  const p = previewNodeRefund(g, "R5C6");
  assert.deepEqual([...p.ids].sort(), ["R5C6", "R6C6", "R7C5", "R7C6", "R8C5", "R8C6", "R8C7"]);
  assert.equal(p.cost, 7);
  assert.equal(p.refund, 6100);
  g.inventory["memory-scroll"] = 6;
  const before = structuredClone(g);
  assert.throws(() => refundNode(g, "R5C6"), /7/);
  assert.deepEqual(g, before);
  g.inventory["memory-scroll"] = 7;
  const next = refundNode(g, "R5C6");
  assert.equal(next.exp, g.exp + 6100);
  assert.equal(next.inventory["memory-scroll"], 0);
  assert.deepEqual(Object.keys(next.camp!.purchasedNodes).sort(), ["R5C5", "R9C5", "R9C6", "R9C7"]);
  assert.equal(growthFor(next).maxSp, 0.2);
  assert.equal(supportSlots(next), 4);
  assert.deepEqual(next.camp!.supports, g.camp!.supports);
  assert.deepEqual(next.camp!.equippedSubjobs, g.camp!.equippedSubjobs);
  assert.deepEqual(next.heroes, g.heroes);
  assert.throws(() => refundNode(next, "R5C6"), /不能撤销/);
});

test("isolated protected nodes cannot anchor purchases; reconnection starts at the root", () => {
  const isolated = migrateCamp(createGame());
  isolated.exp = 999999;
  isolated.camp!.purchasedNodes.R9C5 = 4000;
  isolated.camp!.purchasedNodes.R9C6 = 2000;
  assert.throws(() => buyNode(isolated, "R8C5"), /连通/);
  assert.throws(() => buyNode(isolated, "R8C6"), /连通/);
  const g = purchase(supportRoute);
  g.inventory["memory-scroll"] = 20;
  let next = refundNode(g, "R5C6");
  assert.throws(() => buyNode(next, "R8C5"), /连通/);
  assert.throws(() => buyNode(next, "R8C6"), /连通/);
  for (const id of ["R5C6", "R6C6", "R7C6", "R7C5", "R8C5"]) next = buyNode(next, id);
  // The reconnected function and permanent nodes bridge the next actual edge.
  next = buyNode(next, "R8C6");
  assert.ok(hasFeature(next, "R8C6"));
  assert.equal(next.camp!.purchasedNodes.R9C5, 4000);
  assert.equal(next.camp!.purchasedNodes.R9C6, 2000);
});

test("an owned disconnected gate meets the explicit prerequisite but not the path requirement", () => {
  let g = purchase(["R6C5", "R6C4", "R6C3", "R5C3", "R5C2", "R5C1", "R4C1", "R3C1", "R2C1", "R2C2", "R1C2"]);
  assert.throws(() => buyNode(g, "R1C1"), /前置/);
  g.camp!.purchasedNodes.R1C7 = 6400;
  g = buyNode(g, "R1C1");
  assert.equal(resourceMultiplier(g, "gem"), 2);
  assert.throws(() => buyNode(g, "R1C8"), /连通/);
});

test("cutting all root routes retains every protected effect and only refunds ordinary nodes", () => {
  let g = migrateCamp(createGame());
  g.exp = 194400;
  for (let pass = 0; pass < 81; pass++) {
    const n = memoryNodes.find(n => !hasFeature(g, n.id) && n.links.some(id => hasFeature(g, id)) && n.requires.every(id => hasFeature(g, id)));
    if (!n) break;
    g = buyNode(g, n.id);
  }
  assert.equal(g.exp, 0);
  g.inventory["memory-scroll"] = 81;
  g.camp!.supports.scholar = ["scholar-support-1", "scholar-support-2", "scholar-support-3", "scholar-support-4"];
  g.camp!.subjobUnlocks.warrior = ["scholar"];
  g.camp!.equippedSubjobs.warrior = "scholar";
  for (const id of ["R5C4", "R4C5", "R5C6", "R6C5"]) g = refundNode(g, id);
  assert.equal(Object.keys(g.camp!.purchasedNodes).length, 33);
  assert.equal(g.inventory["memory-scroll"], 33);
  assert.equal(g.exp, 56000);
  assert.deepEqual(growthFor(g), { maxHp: 0.4, maxSp: 0.4, attack: 0.4, magic: 0.4, defense: 0.4, resistance: 0.4, speed: 0.4, tenacity: 0.4 });
  for (const r of ["coin", "exp", "jp", "gem"] as const) assert.equal(resourceMultiplier(g, r), 2);
  for (const id of Object.values(features)) assert.ok(hasFeature(g, id), id);
  assert.equal(supportSlots(g), 4);
  assert.equal(g.camp!.supports.scholar.length, 4);
  assert.equal(g.camp!.equippedSubjobs.warrior, "scholar");
  // Disconnected unlocks still work through their actual consumers.
  g.coins = 10000;
  g.inventory["shop-pass-professional"] = 1;
  g.inventory["shop-pass-mystery"] = 1;
  const bought = checkout(g, { concentrate: 1, "memory-scroll": 1, "certificate-hunter": 1 });
  assert.equal(bought.coins, 3800);
  assert.equal(bought.inventory.concentrate, 1);
  assert.equal(bought.inventory["memory-scroll"], 34);
  const unlocked = unlockSubjob(bought, "warrior", "hunter");
  assert.deepEqual(unlocked.camp!.subjobUnlocks.warrior, ["scholar", "hunter"]);
  assert.equal(unlocked.inventory["certificate-hunter"], 0);
  for (const [resource, expected] of [["coin", 2000], ["exp", 200], ["jp", 20], ["gem", 2]] as const) {
    const input = structuredClone(g);
    input.inventory[`${resource}-N`] = 1;
    const result = processRewards(input, resource, { [`${resource}-N`]: 1 }).game;
    assert.equal(result.inventory[`${resource}-N`], 0);
    if (resource === "coin") assert.equal(result.coins - input.coins, expected);
    if (resource === "exp") assert.equal(result.exp - input.exp, expected);
    if (resource === "jp") for (const hero of Object.keys(input.jp)) assert.equal(result.jp[hero] - input.jp[hero], expected);
    if (resource === "gem") assert.equal(Object.values(result.gems).reduce((a, b) => a + b, 0) - Object.values(input.gems).reduce((a, b) => a + b, 0), expected);
    assert.deepEqual(result.heroes, input.heroes);
  }
});

test("ordinary nodes keep alternate root paths that bridge connected protected nodes", () => {
  const g = purchase(["R5C6", "R6C6", "R7C6", "R7C5", "R8C5", "R9C5", "R9C4", "R8C4", "R8C3", "R7C3", "R6C3", "R6C4", "R6C5"]);
  g.inventory["memory-scroll"] = 1;
  assert.deepEqual(previewNodeRefund(g, "R5C6"), { ids: ["R5C6"], cost: 1, refund: 400 });
  const next = refundNode(g, "R5C6");
  assert.ok(hasFeature(next, "R8C5"));
  assert.equal(supportSlots(next), 2);
  assert.equal(growthFor(next).magic, 0.35);
});

test("visual adjacency without an actual edge does not save ordinary nodes", () => {
  const g = purchase(["R5C4", "R4C4", "R6C5", "R6C4", "R6C3", "R5C3"]);
  assert.deepEqual(previewNodeRefund(g, "R5C4").ids, ["R5C4", "R4C4"]);
});

test("undo clamps reduced HP and SP capacities without healing or reviving", () => {
  const g = purchase(supportRoute);
  g.inventory["memory-scroll"] = 10;
  for (const id of ["warrior", "scholar"]) {
    g.heroes[id].hp = heroStats(id, g).maxHp;
    g.heroes[id].sp = heroStats(id, g).maxSp;
  }
  g.heroes.cleric.hp = 0;
  g.heroes.cleric.sp = 3;
  const next = refundNode(g, "R5C6");
  assert.equal(next.heroes.warrior.hp, 1600);
  assert.equal(next.heroes.scholar.hp, 1200);
  assert.equal(next.heroes.warrior.sp, 144);
  assert.equal(next.heroes.scholar.sp, 264);
  assert.deepEqual(next.heroes.cleric, g.heroes.cleric);
});

// Render the real TSX component with the same JSX transform as the app.
const atlasFile = new URL("../src/features/camp/MemoryAtlas.tsx", import.meta.url);
const compiled = ts.transpileModule(readFileSync(atlasFile, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const atlasModule = { exports: {} as { default: ComponentType<{ game: GameState; node: string; busy: boolean; onSelect: (id: string) => void; onPurchase: () => void; onRefund: () => void }> } };
function renderRequire(from:URL,id:string):unknown {
  if(id.endsWith('.css'))return {};
  const req=createRequire(from);
  if(!id.endsWith('.tsx'))return req(id);
  const file=new URL(id,from),module={exports:{}};
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',code)((path:string)=>renderRequire(file,path),module,module.exports);
  return module.exports;
}
new Function("require", "module", "exports", compiled)((id:string)=>renderRequire(atlasFile,id), atlasModule, atlasModule.exports);
function renderAtlas(game: GameState, node: string) {
  return renderToStaticMarkup(createElement(atlasModule.exports.default, {
    game, node, busy: false, onSelect() {}, onPurchase() {}, onRefund() {},
  }));
}

test("atlas renders 48 squares, 16 permanent diamonds, 16 function stars and one root with a protection legend", () => {
  const html = renderAtlas(migrateCamp(createGame()), "R5C4");
  assert.equal((html.match(/class="memory-node attribute ordinary /g) ?? []).length, 48);
  assert.equal((html.match(/class="memory-node attribute permanent /g) ?? []).length, 16);
  assert.equal((html.match(/class="memory-node function /g) ?? []).length, 16);
  assert.equal((html.match(/class="memory-node origin /g) ?? []).length, 1);
  assert.match(html, /普通属性.*永久节点.*功能节点/s);
});

test("atlas disallows protected undo and isolated purchases and lists preserved nodes in refund preview", () => {
  const g = purchase(supportRoute);
  g.inventory["memory-scroll"] = 7;
  const protectedHtml = renderAtlas(g, "R9C6");
  assert.doesNotMatch(protectedHtml, /用溯流卷撤销/);
  assert.match(protectedHtml, /不可撤销/);
  const ordinaryHtml = renderAtlas(g, "R5C6");
  const preview = ordinaryHtml.match(/<div class="memory-protection-refund-preview">(.*?)<\/div>/s)?.[1] ?? "";
  assert.match(preview, /主动：R5C6.*退还 400/s);
  assert.match(preview, /连带：R8C5.*退还 1400/s);
  assert.match(preview, /R9C5.*R9C6.*R9C7/s);
  assert.match(preview, /脱节.*保留/s);
  assert.match(preview, /7.*卷/s);
  const next = refundNode(g, "R5C6");
  const isolatedHtml = renderAtlas(next, "R8C5");
  assert.match(isolatedHtml, /<button\b(?=[^>]*disabled="")[^>]*>(?:(?!<\/button>)[\s\S])*唤醒旧忆(?:(?!<\/button>)[\s\S])*<\/button>/);
  assert.match(renderAtlas(next, "R9C5"), /已解锁.*脱节/s);
  g.inventory["memory-scroll"] = 6;
  assert.match(renderAtlas(g, "R5C6"), /<button\b(?=[^>]*disabled="")[^>]*>(?:(?!<\/button>)[\s\S])*用溯流卷撤销(?:(?!<\/button>)[\s\S])*<\/button>/);
});

