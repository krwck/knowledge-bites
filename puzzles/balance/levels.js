// Balance it! — level data.
// Each level is an equation: the numbers on the left must add up to the numbers on the right.
// `l` = left side, `r` = right side, `t` = goal: both sides must add up to t (default 0),
// `b` = optional move limit (run out = try again).
// Add new levels at the end; tests check they balance, are solvable and not already solved.
window.BALANCE_LEVELS = [
  { l: [5, -2],          r: [3] },
  { l: [7],              r: [4, 3] },
  { l: [10, -6],         r: [-1, 5] },
  { l: [8, -3, -1],      r: [6, -2] },
  { l: [-4, 9],          r: [12, -7] }
];
