// Hit the target! — level data (runs on the Balance it! engine, see ../balance/balance.js).
// `l`/`r` = sides, `t` = both sides must add up to t, `b` = move limit (fewest moves + 2).
// Each level has exactly ONE fewest-moves answer, using tiles from both sides and at least
// one negative — so the sign flip matters and clicking around runs out of moves.
window.BALANCE_KEY = 'kc:target';
window.BALANCE_LEVELS = [
  { l: [4, 7, -7],          r: [-2, 6],          t: 5,  b: 4 },
  { l: [10, 8, -9],         r: [12, -5, 2],      t: 4,  b: 4 },
  { l: [-3, -9],            r: [-9, -7, 4],      t: -2, b: 4 },
  { l: [-3, -7],            r: [-5, -5, 4, -4],  t: 3,  b: 5 },
  { l: [-9, 9, -7],         r: [-4, 5, -5, -3],  t: -1, b: 5 },
  { l: [-8, -9, 3],         r: [-9, -1, -3, -1], t: 1,  b: 5 },
  { l: [3, 3, 11, -7],      r: [4, -1, 3, 4],    t: -2, b: 6 },
  { l: [8, -2, -1, 7, 3, 3], r: [7, 11],         t: -5, b: 6 }
];
