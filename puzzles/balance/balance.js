// Balance it! — game logic + rendering (vanilla JS, no dependencies)
(function (root) {
  'use strict';

  var MINUS = '−';

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
    return { level: i, target: L.t || 0, budget: L.b || Infinity,
      left: L.l.map(mk), right: L.r.map(mk), moves: 0, lastId: null };
  }

  // Won when both sides add up to the target (they're always equal to each other).
  function isWon(s) { return sum(s.left) === s.target; }

  // Lost when a level with a move limit (`b`) runs out of moves.
  function isLost(s) { return !isWon(s) && s.moves >= s.budget; }

  // Every move lowers both sums by the moved tile's original value, so the fewest
  // moves = smallest set of tiles whose values add up to (start sum − target).
  // Infinity if impossible. ponytail: brute force 2^n, fine for <~16 tiles.
  function minMoves(levels, i) {
    var L = levels[i], all = L.l.concat(L.r);
    var need = L.l.reduce(function (a, v) { return a + v; }, 0) - (L.t || 0);
    var best = Infinity;
    for (var mask = 0; mask < (1 << all.length); mask++) {
      var total = 0, count = 0;
      for (var b = 0; b < all.length; b++) if (mask & (1 << b)) { total += all[b]; count++; }
      if (total === need && count < best) best = count;
    }
    return best;
  }

  // Move tile `id` to the other side; its sign flips. Returns a new state.
  function move(s, id) {
    if (isWon(s) || isLost(s)) return s;
    var fromLeft = s.left.some(function (t) { return t.id === id; });
    var src = fromLeft ? s.left : s.right;
    var dst = fromLeft ? s.right : s.left;
    var tile = src.filter(function (t) { return t.id === id; })[0];
    if (!tile) return s;
    var nsrc = src.filter(function (t) { return t.id !== id; });
    var ndst = dst.concat([{ id: tile.id, v: -tile.v }]);
    return {
      level: s.level,
      target: s.target,
      budget: s.budget,
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

  // "5 − 2 − 3 = 0" — an empty side reads as 0
  function equationText(s) {
    function expr(tiles) {
      if (!tiles.length) return '0';
      return tiles.map(function (t, i) {
        if (i === 0) return plain(t.v);
        return (t.v < 0 ? ' ' + MINUS + ' ' : ' + ') + Math.abs(t.v);
      }).join('');
    }
    return expr(s.left) + ' = ' + expr(s.right);
  }

  var Logic = {
    sum: sum, signed: signed, plain: plain, newLevel: newLevel, isWon: isWon, isLost: isLost,
    minMoves: minMoves, move: move, stars: stars, equationText: equationText
  };

  // Allow `require()` from Node for tests.
  if (typeof module !== 'undefined' && module.exports) { module.exports = Logic; }
  if (typeof document === 'undefined') return;

  // ---------- Browser UI ----------

  // UI strings, picked by <html lang>. Add a language = add a key.
  var STRINGS = {
    en: {
      level: function (n) { return 'Level ' + n; },
      solved: function (n) { return ', solved with ' + n + ' of 3 stars'; },
      plus: 'plus ', minus: 'minus ',
      moveTo: function (side) { return '. Move to the ' + side + ' side'; },
      left: 'left', right: 'right',
      flipped: 'flipped!',
      stars: function (n) { return n + ' of 3 stars'; },
      perfect: 'Fewest moves possible. Nice thinking!',
      tryFewer: function (m) { return 'Solved! Can you do it in ' + m + (m === 1 ? ' move?' : ' moves?'); },
      again: 'Play again from level 1',
      next: 'Next level',
      lost: function (sum, t) { return 'Both sides add up to ' + sum + ', but the goal is ' + t + '. Think about which numbers to throw — and what they turn into!'; }
    },
    pl: {
      level: function (n) { return 'Poziom ' + n; },
      solved: function (n) { return ', rozwiązany na ' + n + ' z 3 gwiazdek'; },
      plus: 'plus ', minus: 'minus ',
      moveTo: function (side) { return '. Przenieś na ' + side + ' stronę'; },
      left: 'lewą', right: 'prawą',
      flipped: 'zmiana!',
      stars: function (n) { return n + ' z 3 gwiazdek'; },
      perfect: 'Najmniej możliwych ruchów. Świetne myślenie!',
      tryFewer: function (m) { return 'Udało się! A dasz radę w ' + m + (m === 1 ? ' ruchu?' : ' ruchach?'); },
      again: 'Zagraj od nowa od poziomu 1',
      next: 'Następny poziom',
      lost: function (sum, t) { return 'Obie strony mają w sumie ' + sum + ', a cel to ' + t + '. Pomyśl, które liczby przerzucić — i czym się staną!'; }
    }
  };
  var T = STRINGS[document.documentElement.lang] || STRINGS.en;

  var LEVELS = root.BALANCE_LEVELS;
  var STORAGE_KEY = root.BALANCE_KEY || 'kc:balance'; // other cards reuse this engine with their own key
  LEVELS.forEach(function (L, i) {
    var a = L.l.reduce(function (x, y) { return x + y; }, 0);
    var b = L.r.reduce(function (x, y) { return x + y; }, 0);
    if (a !== b) console.warn('Balance it! level ' + (i + 1) + ' does not balance: ' + a + ' vs ' + b);
    if (a === (L.t || 0) || minMoves(LEVELS, i) === Infinity) console.warn('Balance it! level ' + (i + 1) + ' is already solved or impossible');
  });

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    levels: $('levels'), left: $('left'), right: $('right'),
    leftSum: $('left-sum'), rightSum: $('right-sum'),
    win: $('win'), stars: $('stars'), eq: $('eq-text'), note: $('win-note'),
    next: $('next'), reset: $('reset'), moves: $('moves'), min: $('min-moves'),
    goal: $('goal-num'), budget: $('budget'), lost: $('lost'), lostNote: $('lost-note'), retry: $('retry')
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
  Object.keys(progress.best).forEach(function (k) { if (+k >= LEVELS.length) delete progress.best[k]; });
  var start = Math.min(progress.current || 0, LEVELS.length - 1);
  var state = newLevel(LEVELS, start);

  var STAR_PATH = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z';

  function renderLevels() {
    el.levels.textContent = '';
    LEVELS.forEach(function (_, i) {
      var b = document.createElement('button');
      b.className = 'level-btn' + (progress.best[i] ? ' done' : '');
      b.textContent = String(i + 1);
      var label = T.level(i + 1);
      if (progress.best[i]) label += T.solved(progress.best[i]);
      b.setAttribute('aria-label', label);
      if (i === state.level) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', function () { goTo(i); });
      el.levels.appendChild(b);
    });
  }

  function renderSide(zone, tiles, side, done) {
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
      b.dataset.v = t.v;
      b.textContent = signed(t.v);
      b.disabled = done;
      b.setAttribute('aria-label',
        (pos ? T.plus : T.minus) + Math.abs(t.v) +
        (done ? '' : T.moveTo(side === 'left' ? T.right : T.left)));
      if (t.id === state.lastId) {
        var tag = document.createElement('span');
        tag.className = 'flipped-tag';
        tag.setAttribute('aria-hidden', 'true');
        tag.textContent = T.flipped;
        b.appendChild(tag);
      }
      b.addEventListener('click', function () { onMove(t.id); });
      zone.appendChild(b);
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
    var won = isWon(state), lost = isLost(state);
    var min = minMoves(LEVELS, state.level);
    renderLevels();
    renderSide(el.left, state.left, 'left', won || lost);
    renderSide(el.right, state.right, 'right', won || lost);
    el.leftSum.textContent = plain(sum(state.left));
    el.rightSum.textContent = plain(sum(state.right));
    el.goal.textContent = plain(state.target);
    el.moves.textContent = String(state.moves);
    el.min.textContent = String(min);
    if (el.budget) el.budget.textContent = String(state.budget);
    if (el.lost) {
      el.lost.hidden = !lost;
      el.lostNote.textContent = T.lost(plain(sum(state.left)), plain(state.target));
    }

    el.win.hidden = !won;
    if (won) {
      var n = stars(state.moves, min);
      renderStars(n);
      el.eq.textContent = equationText(state);
      el.note.textContent = n === 3
        ? T.perfect
        : T.tryFewer(min);
      var last = state.level === LEVELS.length - 1;
      el.next.textContent = last ? T.again : T.next;
    }
  }

  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Throw a copy of the tile along a parabola over the = sign, spinning so the
  // old sign turns into the new one mid-air. Calls done() when it lands.
  function fly(from, oldV, target, done) {
    if (reduceMotion || !target.animate) return done();
    var to = target.getBoundingClientRect();
    var flyer = document.createElement('div');
    flyer.className = 'flyer';
    flyer.style.width = to.width + 'px';
    flyer.style.height = to.height + 'px';
    [oldV, -oldV].forEach(function (v, i) {
      var face = document.createElement('span');
      face.className = 'tile ' + (v > 0 ? 'pos' : 'neg') + (i ? ' back' : '');
      face.textContent = signed(v);
      flyer.appendChild(face);
    });
    document.body.appendChild(flyer);
    target.style.visibility = 'hidden';

    // Free fall: x moves evenly, y follows a parabola peaking `h` px above the start/end.
    var h = 140, frames = [], N = 24;
    for (var k = 0; k <= N; k++) {
      var p = k / N;
      var x = from.left + (to.left - from.left) * p;
      var y = from.top + (to.top - from.top) * p - 4 * h * p * (1 - p);
      frames.push({ transform: 'translate(' + x + 'px,' + y + 'px) perspective(600px) rotateY(' + 180 * p + 'deg)' });
    }
    var anim = flyer.animate(frames, { duration: 850, easing: 'linear' });
    anim.onfinish = anim.oncancel = function () {
      flyer.remove();
      target.style.visibility = '';
      done();
    };
  }

  var flying = false;

  function onMove(id) {
    if (flying) return;
    var src = document.querySelector('.tile[data-id="' + id + '"]');
    var from = src.getBoundingClientRect();
    var oldV = Number(src.dataset.v);
    state = move(state, id);
    var won = isWon(state);
    if (won) {
      var n = stars(state.moves, minMoves(LEVELS, state.level));
      progress.best[state.level] = Math.max(progress.best[state.level] || 0, n);
      save(progress);
    }
    render();
    el.win.hidden = true; // reveal after the landing
    if (el.lost) el.lost.hidden = true;
    var moved = document.querySelector('.tile[data-id="' + id + '"]');
    flying = true;
    fly(from, oldV, moved, function () {
      flying = false;
      if (isLost(state)) {
        el.lost.hidden = false;
        el.retry.focus();
        return;
      }
      if (!isWon(state)) {
        // Keep keyboard focus on the tile that just jumped.
        var t = document.querySelector('.tile[data-id="' + id + '"]');
        if (t) t.focus();
        return;
      }
      el.win.hidden = false;
      el.next.focus();
    });
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
  if (el.retry) el.retry.addEventListener('click', function () { goTo(state.level); });

  render();
})(typeof window !== 'undefined' ? window : globalThis);
