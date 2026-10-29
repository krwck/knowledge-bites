// Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const P = require('../puzzles/pizza/pizza.js');

test('every level is possible; cut levels also offer a cut that cannot work', () => {
  P.LEVELS.forEach((L, i) => {
    if (L.n) return assert.ok(P.fits(L.n, L.t), `level ${i + 1}`);
    assert.ok(L.cuts.some(n => P.fits(n, L.t)), `level ${i + 1} has a good cut`);
    assert.ok(L.cuts.some(n => !P.fits(n, L.t)), `level ${i + 1} has a trap cut`);
  });
});

const take = (s, k) => { for (let i = 0; i < k; i++) s = P.toggle(s, i); return s; };

test('serving an equivalent fraction wins (6/8 = 3/4)', () => {
  let s = P.cut(P.newLevel(6), 8); // level 7: 3/4, cut into 8
  s = P.serve(take(s, 6));
  assert.ok(s.won);
  assert.strictEqual(s.mistakes, 0);
});

test('wrong serve is a mistake; the 3rd one restarts the level', () => {
  let s = take(P.newLevel(0), 1); // 1/4 is not 1/2
  s = P.serve(s);
  assert.ok(!s.won);
  assert.strictEqual(s.mistakes, 1);
  s = P.serve(P.serve(s));
  assert.ok(s.cold);
  assert.strictEqual(s.mistakes, 0);
  assert.strictEqual(P.count(s), 0);
});

test('toggling a slice twice puts it back', () => {
  const s = P.toggle(P.toggle(P.newLevel(0), 2), 2);
  assert.strictEqual(P.count(s), 0);
});

test('uncut pizza cannot be served', () => {
  const s = P.newLevel(5);
  assert.strictEqual(P.serve(s), s);
});
