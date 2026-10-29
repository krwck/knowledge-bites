// Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const J = require('../puzzles/jumper/jumper.js');

// Can the frog get from the first column to the last stepping only on multiples?
function crossable(grid, n) {
  const rows = grid.length, cols = grid[0].length, seen = new Set();
  const todo = [];
  for (let r = 0; r < rows; r++) if (grid[r][0] % n === 0) todo.push([r, 0]);
  while (todo.length) {
    const [r, c] = todo.pop(), k = r + ',' + c;
    if (seen.has(k)) continue;
    seen.add(k);
    if (c === cols - 1) return true;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const R = r + dr, C = c + dc;
      if (R >= 0 && R < rows && C >= 0 && C < cols && grid[R][C] % n === 0) todo.push([R, C]);
    }
  }
  return false;
}

test('every generated river can be crossed, numbers stay in the table range', () => {
  for (const n of J.TABLES) {
    for (let i = 0; i < 200; i++) {
      const g = J.makeGrid(n, 4, 6, Math.random);
      assert.ok(crossable(g, n), `×${n}: ${JSON.stringify(g)}`);
      for (const v of g.flat()) assert.ok(v >= 1 && v <= n * 10, `×${n}: ${v}`);
    }
  }
});

const start = () => ({ level: 0, n: 3, grid: [[3, 4, 9], [6, 6, 12]], pos: null, splashes: 0, trail: [], sunk: {}, won: false });

test('hop rules: start in first column, then one step at a time', () => {
  const s = start();
  assert.strictEqual(J.hop(s, 0, 1), s, 'cannot start past the first column');
  const t = J.hop(s, 0, 0);
  assert.deepStrictEqual(t.pos, { r: 0, c: 0 });
  assert.strictEqual(J.hop(t, 1, 1), t, 'no diagonal hops');
  assert.strictEqual(J.hop(t, 0, 2), t, 'no long jumps');
});

test('wrong stone splashes back to the bank', () => {
  const t = J.hop(J.hop(start(), 0, 0), 0, 1); // 4 is not a multiple of 3
  assert.strictEqual(t.pos, null);
  assert.strictEqual(t.splashes, 1);
  assert.deepStrictEqual(t.trail, []);
  assert.ok(t.sunk['0,1']);
});

test('reaching the last column wins', () => {
  let s = start();
  for (const [r, c] of [[0, 0], [1, 0], [1, 1]]) s = J.hop(s, r, c);
  assert.ok(!s.won);
  s = J.hop(s, 1, 2);
  assert.ok(s.won);
  assert.deepStrictEqual(s.trail, [3, 6, 6, 12]);
  assert.strictEqual(J.hop(s, 0, 2), s, 'no hops after winning');
});

test('stars', () => {
  assert.strictEqual(J.stars(0), 3);
  assert.strictEqual(J.stars(1), 2);
  assert.strictEqual(J.stars(4), 1);
});
