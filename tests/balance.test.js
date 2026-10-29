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

test('every level balances', () => {
  LEVELS.forEach((L, i) => {
    const a = L.l.reduce((x, y) => x + y, 0);
    const b = L.r.reduce((x, y) => x + y, 0);
    assert.strictEqual(a, b, `level ${i + 1}`);
  });
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
