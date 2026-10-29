// Number jumper — game logic + rendering (vanilla JS, no dependencies)
(function (root) {
  'use strict';

  var STORAGE_KEY = 'kc:jumper';
  var TABLES = [2, 5, 10, 3, 4, 6, 7, 8, 9]; // one level per times table
  var ROWS = 4, COLS = 6;

  // ---------- Pure logic (no DOM) ----------

  function randInt(rnd, lo, hi) { return lo + Math.floor(rnd() * (hi - lo + 1)); }

  // A ROWS×COLS river. One winding path from the left bank to the right bank holds
  // multiples of n (n×1 … n×10); every other stone is a number that is NOT a multiple.
  function makeGrid(n, rows, cols, rnd) {
    var onPath = {};
    var r = randInt(rnd, 0, rows - 1);
    for (var c = 0; c < cols; c++) {
      var to = randInt(rnd, 0, rows - 1);
      onPath[r + ',' + c] = true;
      while (r !== to) { r += to > r ? 1 : -1; onPath[r + ',' + c] = true; }
    }
    var grid = [];
    for (var i = 0; i < rows; i++) {
      var row = [];
      for (var j = 0; j < cols; j++) {
        var v;
        if (onPath[i + ',' + j]) v = n * randInt(rnd, 1, 10);
        else do { v = randInt(rnd, 2, n * 10); } while (v % n === 0);
        row.push(v);
      }
      grid.push(row);
    }
    return grid;
  }

  function newLevel(i, rnd) {
    var n = TABLES[i];
    return { level: i, n: n, grid: makeGrid(n, ROWS, COLS, rnd || Math.random),
      pos: null, splashes: 0, trail: [], sunk: {}, won: false };
  }

  // From the bank (pos null) you can reach the first column; otherwise one step up/down/left/right.
  function canHop(s, r, c) {
    if (s.won) return false;
    if (!s.pos) return c === 0;
    return Math.abs(s.pos.r - r) + Math.abs(s.pos.c - c) === 1;
  }

  // Returns a new state. A wrong stone = splash: back to the bank, trail cleared.
  function hop(s, r, c) {
    if (!canHop(s, r, c)) return s;
    var v = s.grid[r][c];
    var next = { level: s.level, n: s.n, grid: s.grid, pos: { r: r, c: c },
      splashes: s.splashes, trail: s.trail.concat([v]), sunk: s.sunk, won: false };
    if (v % s.n !== 0) {
      next.sunk = Object.assign({}, s.sunk); next.sunk[r + ',' + c] = true;
      next.pos = null; next.trail = []; next.splashes += 1;
      next.splashed = { r: r, c: c, v: v };
    } else if (c === s.grid[0].length - 1) {
      next.won = true;
    }
    return next;
  }

  function stars(splashes) { return splashes === 0 ? 3 : splashes === 1 ? 2 : 1; }

  var Logic = { TABLES: TABLES, makeGrid: makeGrid, newLevel: newLevel, canHop: canHop, hop: hop, stars: stars };

  if (typeof module !== 'undefined' && module.exports) { module.exports = Logic; }
  if (typeof document === 'undefined') return;

  // ---------- Browser UI ----------

  var STRINGS = {
    en: {
      level: function (n) { return 'Level ' + n + ', times table of ' + TABLES[n - 1]; },
      solved: function (n) { return ', solved with ' + n + ' of 3 stars'; },
      stone: function (v, ok) { return String(v) + (ok ? '. Hop here' : ''); },
      splash: function (v, n) { return 'Splash! ' + v + ' is not a multiple of ' + n + '. Back to the bank — try again.'; },
      start: 'Tap a stone in the first column to start.',
      stars: function (n) { return n + ' of 3 stars'; },
      perfect: 'No splashes at all. Perfect!',
      tryAgain: function (k) { return k + (k === 1 ? ' splash' : ' splashes') + '. Can you cross with none?'; },
      again: 'Play again from level 1',
      next: 'Next level'
    },
    pl: {
      level: function (n) { return 'Poziom ' + n + ', tabliczka ' + TABLES[n - 1]; },
      solved: function (n) { return ', rozwiązany na ' + n + ' z 3 gwiazdek'; },
      stone: function (v, ok) { return String(v) + (ok ? '. Skocz tutaj' : ''); },
      splash: function (v, n) { return 'Plum! ' + v + ' nie jest wielokrotnością ' + n + '. Wracasz na brzeg — spróbuj jeszcze raz.'; },
      start: 'Stuknij kamień w pierwszej kolumnie, żeby zacząć.',
      stars: function (n) { return n + ' z 3 gwiazdek'; },
      perfect: 'Ani jednego plusku. Idealnie!',
      tryAgain: function (k) {
        var w = k === 1 ? ' plusk' : (k % 10 >= 2 && k % 10 <= 4 && (k % 100 < 12 || k % 100 > 14)) ? ' pluski' : ' plusków';
        return k + w + '. Dasz radę przejść suchą stopą?';
      },
      again: 'Zagraj od nowa od poziomu 1',
      next: 'Następny poziom'
    }
  };
  var T = STRINGS[document.documentElement.lang] || STRINGS.en;

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    levels: $('levels'), river: $('river'), pond: $('pond'), frog: $('frog'), start: $('bank-start'),
    goal: $('goal-num'), status: $('status'), tip: $('tip-list'),
    win: $('win'), stars: $('stars'), trail: $('trail'), note: $('win-note'),
    next: $('next'), reset: $('reset'), splashes: $('splashes')
  };

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { best: {} }; }
    catch (e) { return { best: {} }; }
  }
  function save(p) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
  }

  var progress = load();
  progress.levels = TABLES.length;
  var state = newLevel(Math.min(progress.current || 0, TABLES.length - 1));
  var busy = false;
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STAR_PATH = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z';

  function renderLevels() {
    el.levels.textContent = '';
    TABLES.forEach(function (n, i) {
      var b = document.createElement('button');
      b.className = 'level-btn' + (progress.best[i] ? ' done' : '');
      b.textContent = '×' + n;
      var label = T.level(i + 1);
      if (progress.best[i]) label += T.solved(progress.best[i]);
      b.setAttribute('aria-label', label);
      if (i === state.level) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', function () { goTo(i); });
      el.levels.appendChild(b);
    });
  }

  function renderRiver() {
    el.river.textContent = '';
    el.river.style.setProperty('--cols', COLS);
    state.grid.forEach(function (row, r) {
      row.forEach(function (v, c) {
        var b = document.createElement('button');
        var here = state.pos && state.pos.r === r && state.pos.c === c;
        var reach = canHop(state, r, c);
        b.className = 'stone' + (state.sunk[r + ',' + c] ? ' sunk' : '') + (reach ? ' reach' : '') + (here ? ' here' : '');
        b.id = 'stone-' + r + '-' + c;
        b.textContent = String(v);
        b.disabled = state.won || !reach;
        b.setAttribute('aria-label', T.stone(v, reach));
        b.addEventListener('click', function () { onHop(r, c); });
        el.river.appendChild(b);
      });
    });
  }

  function renderStars(n) {
    el.stars.textContent = '';
    el.stars.setAttribute('aria-label', T.stars(n));
    for (var i = 0; i < 3; i++) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '34'); svg.setAttribute('height', '34');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', STAR_PATH);
      p.setAttribute('fill', i < n ? '#FFD25E' : '#FFFFFF');
      p.setAttribute('stroke', '#1B2240'); p.setAttribute('stroke-width', '1.8');
      p.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(p);
      el.stars.appendChild(svg);
    }
  }

  function render() {
    renderLevels();
    renderRiver();
    el.goal.textContent = String(state.n);
    el.tip.textContent = [1, 2, 3, 4].map(function (k) { return state.n * k; }).join(', ') + ', …';
    el.splashes.textContent = String(state.splashes);
    el.win.hidden = !state.won;
    if (state.won) {
      var n = stars(state.splashes);
      renderStars(n);
      el.trail.textContent = state.trail.join(' → ');
      el.note.textContent = n === 3 ? T.perfect : T.tryAgain(state.splashes);
      el.next.textContent = state.level === TABLES.length - 1 ? T.again : T.next;
    }
  }

  // Where the frog sits: centre of a stone, the start bank, or the flag.
  function spot(target) {
    var p = el.pond.getBoundingClientRect(), t = target.getBoundingClientRect();
    return { x: t.left - p.left + t.width / 2, y: t.top - p.top + t.height / 2 };
  }
  function transformAt(pt) { return 'translate(' + pt.x + 'px,' + pt.y + 'px) translate(-50%,-60%)'; }

  var frogAt = { x: 0, y: 0 };
  function place(target) { frogAt = spot(target); el.frog.style.transform = transformAt(frogAt); }

  // Hop along a parabola to `target`; `then` runs on landing.
  function jump(target, then) {
    var from = frogAt, to = spot(target), frames = [];
    place(target);
    if (reduceMotion || !el.frog.animate) return then();
    for (var k = 0; k <= 12; k++) {
      var q = k / 12;
      frames.push({ transform: transformAt({ x: from.x + (to.x - from.x) * q, y: from.y + (to.y - from.y) * q - 200 * q * (1 - q) }) });
    }
    el.frog.animate(frames, { duration: 380, easing: 'linear' }).onfinish = then;
  }

  function sink(then) {
    if (reduceMotion || !el.frog.animate) return then();
    el.frog.animate([
      { opacity: 1, transform: el.frog.style.transform },
      { opacity: 0, transform: el.frog.style.transform + ' scale(.2) translateY(30px)' }
    ], { duration: 450, easing: 'ease-in' }).onfinish = then;
  }

  function onHop(r, c) {
    if (busy) return;
    var next = hop(state, r, c);
    if (next === state) return;
    busy = true;
    el.status.textContent = '';
    var stone = $('stone-' + r + '-' + c);
    jump(stone, function () {
      state = next;
      if (state.splashed) {
        stone.classList.add('sunk', 'splash');
        el.status.textContent = T.splash(state.splashed.v, state.n);
        sink(function () {
          place(el.start);
          busy = false;
          render();
        });
        return;
      }
      if (state.won) {
        progress.best[state.level] = Math.max(progress.best[state.level] || 0, stars(state.splashes));
        save(progress);
        jump($('bank-flag'), function () { busy = false; render(); el.next.focus(); });
        return;
      }
      busy = false;
      render();
      // Keep keyboard users moving: focus a stone they can hop to next.
      var reach = el.river.querySelector('.stone.reach');
      if (reach) reach.focus();
    });
  }

  function goTo(i) {
    state = newLevel(i);
    progress.current = i;
    save(progress);
    el.status.textContent = T.start;
    render();
    place(el.start);
  }

  el.next.addEventListener('click', function () {
    goTo(state.level === TABLES.length - 1 ? 0 : state.level + 1);
    var first = el.river.querySelector('.stone.reach');
    if (first) first.focus();
  });
  el.reset.addEventListener('click', function () { goTo(state.level); });
  window.addEventListener('resize', function () {
    var at = state.won ? $('bank-flag') : state.pos ? $('stone-' + state.pos.r + '-' + state.pos.c) : el.start;
    place(at);
  });

  goTo(state.level);
})(typeof window !== 'undefined' ? window : globalThis);
