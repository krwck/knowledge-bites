// Balance it! — level data.
// Each level is an equation: the numbers on the left must add up to the numbers on the right.
// `l` = left side, `r` = right side, `t` = goal: both sides must add up to t (default 0).
// Add new levels at the end; tests check they balance, are solvable and not already solved.
window.BALANCE_LEVELS = [
  { l: [5, -2],          r: [3] },
  { l: [7],              r: [4, 3] },
  { l: [10, -6],         r: [-1, 5] },
  { l: [8, -3, -1],      r: [6, -2] },
  { l: [-4, 9],          r: [12, -7] },
  // From here on: hit a target — pick *which* numbers to move.
  { l: [6, 2],           r: [5, 3],        t: 2 },
  { l: [9, -4, 3],       r: [6, 2],        t: 3 },
  { l: [7, -3, 5],       r: [4, 1, 4],     t: 1 },
  { l: [8, -5, 6, -2],   r: [3, 4],        t: 2 },
  { l: [12, -7, 3],      r: [5, -4, 7],    t: -3 }
];
