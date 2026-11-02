import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/economy.ts";
import { migrateCamp } from "../src/game/camp/migrate.ts";
import { checkout } from "../src/game/camp/shop.ts";
test("checkout enforces layers, cumulative certificate quota and atomic balance", () => {
  let g = migrateCamp(createGame());
  g.coins = 100000;
  assert.throws(() => checkout(g, { concentrate: 1 }));
  g.inventory["shop-pass-professional"] = 1;
  g.inventory["shop-pass-mystery"] = 1;
  g = checkout(g, { hp: 2, concentrate: 1, "certificate-warrior": 7 });
  assert.equal(g.coins, 64600);
  assert.equal(g.inventory.hp, 6);
  g.inventory["certificate-warrior"] = 0;
  assert.throws(() => checkout(g, { "certificate-warrior": 1 }));
  for (const n of [-1, 0.5, NaN, Infinity])
    assert.throws(() => checkout(g, { hp: n }));
  const before = structuredClone(g);
  assert.throws(() => checkout(g, { hp: 99999 }));
  assert.deepEqual(g, before);
});
test("checkout rejects inventory overflow without deducting currency", () => {
  const g = migrateCamp(createGame());
  g.coins = 100;
  g.inventory.hp = Number.MAX_SAFE_INTEGER;
  assert.throws(() => checkout(g, { hp: 1 }));
  assert.equal(g.coins, 100);
  assert.equal(g.inventory.hp, Number.MAX_SAFE_INTEGER);
});
