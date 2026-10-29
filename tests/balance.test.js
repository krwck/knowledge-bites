// Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../puzzles/balance/balance.js');

// Load the level data the same way the browser does.
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../puzzles/balance/levels.js'), 'utf8'), ctx);
const LEVELS = JSON.parse(JSON.stringify(ctx.window.BALANCE_LEVELS)); // plain arrays from this realm

test('every level balances, is solvable and not already solved', () => {
  LEVELS.forEach((L, i) => {
    const a = L.l.reduce((x, y) => x + y, 0);
    const b = L.r.reduce((x, y) => x + y, 0);
    assert.strictEqual(a, b, `level ${i + 1}`);
    assert.notStrictEqual(a, L.t || 0, `level ${i + 1} already solved`);
    assert.ok(B.minMoves(LEVELS, i) < Infinity, `level ${i + 1} impossible`);
  });
});

test('target level: pick the right tiles', () => {
  const lv = [{ l: [9, -4, 3], r: [6, 2], t: 3 }]; // 8 → 3: move tiles worth 5 (9 and −4)
  assert.strictEqual(B.minMoves(lv, 0), 2);
  let s = B.newLevel(lv, 0);
  s = B.move(s, s.left[0].id);
  assert.ok(!B.isWon(s));
  s = B.move(s, s.left[0].id);
  assert.strictEqual(B.sum(s.left), 3);
  assert.strictEqual(B.sum(s.right), 3);
  assert.ok(B.isWon(s));
  assert.strictEqual(B.equationText(s), '3 = 6 + 2 − 9 + 4');
});

test('moving a tile flips its sign and keeps both sides equal', () => {
  let s = B.newLevel(LEVELS, 0); // 5 − 2 = 3
  const three = s.right[0];
  s = B.move(s, three.id);
  assert.deepStrictEqual(s.left.map(t => t.v), [5, -2, -3]);
  assert.strictEqual(s.right.length, 0);
  assert.strictEqual(B.sum(s.left), B.sum(s.right));
  assert.ok(B.isWon(s));
  assert.strictEqual(s.moves, 1);
});

test('sides stay equal after any sequence of moves', () => {
  let s = B.newLevel(LEVELS, 3);
  const ids = s.left.concat(s.right).map(t => t.id);
  for (const id of ids.slice(0, 3)) {
    s = B.move(s, id);
    assert.strictEqual(B.sum(s.left), B.sum(s.right));
  }
});

test('no moves allowed once solved', () => {
  let s = B.newLevel(LEVELS, 0);
  s = B.move(s, s.right[0].id);
  const after = B.move(s, s.left[0].id);
  assert.strictEqual(after, s);
});

test('stars', () => {
  assert.strictEqual(B.stars(1, 1), 3);
  assert.strictEqual(B.stars(2, 1), 2);
  assert.strictEqual(B.stars(5, 1), 1);
});

test('equation text', () => {
  let s = B.newLevel(LEVELS, 0);
  s = B.move(s, s.right[0].id);
  assert.strictEqual(B.equationText(s), '5 − 2 − 3 = 0');
  let t = B.newLevel(LEVELS, 1); // 7 = 4 + 3
  t = B.move(t, t.left[0].id);
  assert.strictEqual(B.equationText(t), '0 = 4 + 3 − 7');
});

// ---- Hit the target! (same engine, its own levels) ----
const tctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../puzzles/target/levels.js'), 'utf8'), tctx);
const TARGET = JSON.parse(JSON.stringify(tctx.window.BALANCE_LEVELS));

test('target levels: one best answer, both sides and a negative needed, limit = best + 2', () => {
  TARGET.forEach((L, i) => {
    const all = L.l.concat(L.r), nl = L.l.length;
    const S = L.l.reduce((x, y) => x + y, 0);
    assert.strictEqual(S, L.r.reduce((x, y) => x + y, 0), `level ${i + 1} balances`);
    const min = B.minMoves(TARGET, i);
    assert.strictEqual(L.b, min + 2, `level ${i + 1} budget`);
    const best = [];
    for (let m = 0; m < 1 << all.length; m++) {
      const picked = all.map((v, k) => [v, k]).filter(([, k]) => m >> k & 1);
      if (picked.length === min && picked.reduce((a, [v]) => a + v, 0) === S - L.t) best.push(picked);
    }
    assert.strictEqual(best.length, 1, `level ${i + 1} has a unique best answer`);
    const ks = best[0].map(([, k]) => k);
    assert.ok(ks.some(k => k < nl) && ks.some(k => k >= nl), `level ${i + 1} uses both sides`);
    assert.ok(best[0].some(([v]) => v < 0), `level ${i + 1} needs a negative`);
  });
});

test('running out of moves loses and freezes the board', () => {
  const lv = [{ l: [4, 7, -7], r: [-2, 6], t: 5, b: 2 }];
  let s = B.newLevel(lv, 0);
  s = B.move(s, s.left[0].id); // throw +4: both sides 0
  s = B.move(s, s.left[0].id); // throw +7: both sides −7
  assert.ok(B.isLost(s));
  assert.ok(!B.isWon(s));
  assert.strictEqual(B.move(s, s.left[0].id), s);
});
