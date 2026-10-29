// Balance it! — game logic + rendering (vanilla JS, no dependencies)
(function (root) {
  'use strict';

  var MINUS = '−';
  var STORAGE_KEY = 'kc:balance';

  // ---------- Pure logic (no DOM) ----------

  function sum(tiles) {
    return tiles.reduce(function (a, t) { return a + t.v; }, 0);
  }

  function signed(v) { return (v < 0 ? MINUS : '+') + Math.abs(v); }
  function plain(v) { return (v < 0 ? MINUS : '') + Math.abs(v); }

  function newLevel(levels, i) {
    var n = 0;
    function mk(v) { n += 1; return { id: 't' + n, v: v }; }
    var L = levels[i];
    return { level: i, left: L.l.map(mk), right: L.r.map(mk), moves: 0, lastId: null };
  }

  function isWon(s) { return s.left.length === 0 || s.right.length === 0; }

  // Fewest moves = move every tile from the smaller side.
  function minMoves(levels, i) {
    return Math.min(levels[i].l.length, levels[i].r.length);
  }

  // Move tile `id` to the other side; its sign flips. Returns a new state.
  function move(s, id) {
    if (isWon(s)) return s;
    var fromLeft = s.left.some(function (t) { return t.id === id; });
    var src = fromLeft ? s.left : s.right;
    var dst = fromLeft ? s.right : s.left;
    var tile = src.filter(function (t) { return t.id === id; })[0];
    if (!tile) return s;
    var nsrc = src.filter(function (t) { return t.id !== id; });
    var ndst = dst.concat([{ id: tile.id, v: -tile.v }]);
    return {
      level: s.level,
      left: fromLeft ? nsrc : ndst,
      right: fromLeft ? ndst : nsrc,
      moves: s.moves + 1,
      lastId: id
    };
  }

  function stars(moves, min) {
    if (moves <= min) return 3;
    if (moves === min + 1) return 2;
    return 1;
  }

  // "5 − 2 − 3 = 0" (or "0 = …" when the left side is the empty one)
  function equationText(s) {
    var full = s.left.length ? s.left : s.right;
    var expr = full.map(function (t, i) {
      if (i === 0) return plain(t.v);
      return (t.v < 0 ? ' ' + MINUS + ' ' : ' + ') + Math.abs(t.v);
    }).join('');
    return s.left.length ? expr + ' = 0' : '0 = ' + expr;
  }

  var Logic = {
    sum: sum, signed: signed, plain: plain, newLevel: newLevel, isWon: isWon,
    minMoves: minMoves, move: move, stars: stars, equationText: equationText
  };

  // Allow `require()` from Node for tests.
  if (typeof module !== 'undefined' && module.exports) { module.exports = Logic; }
  if (typeof document === 'undefined') return;

  // ---------- Browser UI ----------

  var LEVELS = root.BALANCE_LEVELS;
  LEVELS.forEach(function (L, i) {
    var a = L.l.reduce(function (x, y) { return x + y; }, 0);
    var b = L.r.reduce(function (x, y) { return x + y; }, 0);
    if (a !== b) console.warn('Balance it! level ' + (i + 1) + ' does not balance: ' + a + ' vs ' + b);
  });

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    levels: $('levels'), left: $('left'), right: $('right'),
    leftSum: $('left-sum'), rightSum: $('right-sum'),
    win: $('win'), stars: $('stars'), eq: $('eq-text'), note: $('win-note'),
    next: $('next'), reset: $('reset'), moves: $('moves'), min: $('min-moves')
  };

  // Saved progress: { best: { "0": 3, "1": 2 }, levels: 5, current: 1 }
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { best: {} }; }
    catch (e) { return { best: {} }; }
  }
  function save(p) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
  }

  var progress = load();
  progress.levels = LEVELS.length;
  var start = Math.min(progress.current || 0, LEVELS.length - 1);
  var state = newLevel(LEVELS, start);

  var STAR_PATH = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z';

  function renderLevels() {
    el.levels.textContent = '';
    LEVELS.forEach(function (_, i) {
      var b = document.createElement('button');
      b.className = 'level-btn' + (progress.best[i] ? ' done' : '');
      b.textContent = String(i + 1);
      var label = 'Level ' + (i + 1);
      if (progress.best[i]) label += ', solved with ' + progress.best[i] + ' of 3 stars';
      b.setAttribute('aria-label', label);
      if (i === state.level) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', function () { goTo(i); });
      el.levels.appendChild(b);
    });
  }

  function renderSide(zone, tiles, side, won) {
    zone.textContent = '';
    if (tiles.length === 0) {
      var z = document.createElement('span');
      z.className = 'zero';
      z.textContent = '0';
      zone.appendChild(z);
      return;
    }
    tiles.forEach(function (t) {
      var b = document.createElement('button');
      var pos = t.v > 0;
      b.className = 'tile ' + (pos ? 'pos' : 'neg') + (t.id === state.lastId ? ' pop' : '');
      b.dataset.id = t.id;
      b.textContent = signed(t.v);
      b.disabled = won;
      b.setAttribute('aria-label',
        (pos ? 'plus ' : 'minus ') + Math.abs(t.v) +
        (won ? '' : '. Move to the ' + (side === 'left' ? 'right' : 'left') + ' side'));
      if (t.id === state.lastId) {
        var tag = document.createElement('span');
        tag.className = 'flipped-tag';
        tag.setAttribute('aria-hidden', 'true');
        tag.textContent = 'flipped!';
        b.appendChild(tag);
      }
      b.addEventListener('click', function () { onMove(t.id); });
      zone.appendChild(b);
    });
  }

  function renderStars(n) {
    el.stars.textContent = '';
    el.stars.setAttribute('aria-label', n + ' of 3 stars');
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
    var won = isWon(state);
    var min = minMoves(LEVELS, state.level);
    renderLevels();
    renderSide(el.left, state.left, 'left', won);
    renderSide(el.right, state.right, 'right', won);
    el.leftSum.textContent = plain(sum(state.left));
    el.rightSum.textContent = plain(sum(state.right));
    el.moves.textContent = String(state.moves);
    el.min.textContent = String(min);

    el.win.hidden = !won;
    if (won) {
      var n = stars(state.moves, min);
      renderStars(n);
      el.eq.textContent = equationText(state);
      el.note.textContent = n === 3
        ? 'Fewest moves possible. Nice thinking!'
        : 'Solved! Can you do it in ' + min + (min === 1 ? ' move?' : ' moves?');
      var last = state.level === LEVELS.length - 1;
      el.next.textContent = last ? 'Play again from level 1' : 'Next level';
    }
  }

  function onMove(id) {
    state = move(state, id);
    if (isWon(state)) {
      var n = stars(state.moves, minMoves(LEVELS, state.level));
      progress.best[state.level] = Math.max(progress.best[state.level] || 0, n);
      save(progress);
      render();
      el.next.focus();
      return;
    }
    render();
    // Keep keyboard focus on the tile that just jumped.
    var moved = document.querySelector('.tile[data-id="' + id + '"]');
    if (moved) moved.focus();
  }

  function goTo(i) {
    state = newLevel(LEVELS, i);
    progress.current = i;
    save(progress);
    render();
  }

  el.next.addEventListener('click', function () {
    goTo(state.level === LEVELS.length - 1 ? 0 : state.level + 1);
    var first = document.querySelector('.tile');
    if (first) first.focus();
  });
  el.reset.addEventListener('click', function () { goTo(state.level); });

  render();
})(typeof window !== 'undefined' ? window : globalThis);
