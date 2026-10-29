// Fraction pizza — game logic + rendering (vanilla JS, no dependencies)
(function (root) {
  'use strict';

  var STORAGE_KEY = 'kc:pizza';
  var MAX_MISTAKES = 3; // the 3rd wrong serve = pizza got cold, level restarts

  // `n` = slices already cut, or `cuts` = slice counts to choose from (cut it yourself).
  // `t` = [top, bottom]: the fraction to serve.
  var LEVELS = [
    { n: 4,  t: [1, 2] },
    { n: 8,  t: [1, 4] },
    { n: 6,  t: [2, 3] },
    { n: 8,  t: [3, 4] },
    { n: 12, t: [5, 6] },
    { cuts: [4, 6, 8],  t: [1, 3] },
    { cuts: [6, 8, 10], t: [3, 4] },
    { cuts: [8, 9, 10], t: [2, 3] }
  ];

  // ---------- Pure logic (no DOM) ----------

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  // Can a pizza cut into n slices serve exactly top/bottom?
  function fits(n, t) { return (n * t[0]) % t[1] === 0; }

  function newLevel(i) {
    var L = LEVELS[i];
    return { level: i, t: L.t, n: L.n || 0, taken: {}, mistakes: 0, won: false, cold: false };
  }

  function cut(s, n) {
    if (s.won) return s;
    return { level: s.level, t: s.t, n: n, taken: {}, mistakes: s.mistakes, won: false, cold: false };
  }

  function toggle(s, k) {
    if (s.won || !s.n) return s;
    var taken = Object.assign({}, s.taken);
    if (taken[k]) delete taken[k]; else taken[k] = true;
    return { level: s.level, t: s.t, n: s.n, taken: taken, mistakes: s.mistakes, won: false, cold: false };
  }

  function count(s) { return Object.keys(s.taken).length; }

  // taken/n equals top/bottom  ⇔  taken × bottom = top × n
  function serve(s) {
    if (s.won || !s.n) return s;
    var ok = count(s) * s.t[1] === s.t[0] * s.n;
    var next = { level: s.level, t: s.t, n: s.n, taken: s.taken, mistakes: s.mistakes + (ok ? 0 : 1), won: ok, cold: false };
    if (!ok && next.mistakes >= MAX_MISTAKES) {
      next = newLevel(s.level);
      next.cold = true;
    }
    return next;
  }

  function stars(mistakes) { return mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1; }

  var Logic = { LEVELS: LEVELS, MAX_MISTAKES: MAX_MISTAKES, gcd: gcd, fits: fits, newLevel: newLevel,
    cut: cut, toggle: toggle, count: count, serve: serve, stars: stars };

  if (typeof module !== 'undefined' && module.exports) { module.exports = Logic; }
  if (typeof document === 'undefined') return;

  // ---------- Browser UI ----------

  var STRINGS = {
    en: {
      level: function (n) { return 'Level ' + n; },
      solved: function (n) { return ', solved with ' + n + ' of 3 stars'; },
      slice: function (k, n, on) { return 'Slice ' + k + ' of ' + n + (on ? ', taken' : ''); },
      cutFirst: 'First, cut the pizza: how many equal slices?',
      cutInto: function (n) { return n + ' slices'; },
      taken: function (a, n) { return 'On the plate: ' + a + '/' + n; },
      wrong: function (a, n, t) { return 'Hmm, ' + a + '/' + n + ' is not ' + t + '. Try again!'; },
      cold: 'Oh no, the pizza got cold! Here is a fresh one.',
      stars: function (n) { return n + ' of 3 stars'; },
      perfect: 'First try. Perfect slicing!',
      tryAgain: function (k) { return k + (k === 1 ? ' mistake' : ' mistakes') + '. Can you do it first try?'; },
      again: 'Play again from level 1',
      next: 'Next level'
    },
    pl: {
      level: function (n) { return 'Poziom ' + n; },
      solved: function (n) { return ', rozwiązany na ' + n + ' z 3 gwiazdek'; },
      slice: function (k, n, on) { return 'Kawałek ' + k + ' z ' + n + (on ? ', wzięty' : ''); },
      cutFirst: 'Najpierw pokrój pizzę: na ile równych kawałków?',
      cutInto: function (n) { return n + ' kawałków'; },
      taken: function (a, n) { return 'Na talerzu: ' + a + '/' + n; },
      wrong: function (a, n, t) { return 'Hmm, ' + a + '/' + n + ' to nie ' + t + '. Spróbuj jeszcze raz!'; },
      cold: 'O nie, pizza wystygła! Masz nową.',
      stars: function (n) { return n + ' z 3 gwiazdek'; },
      perfect: 'Za pierwszym razem. Idealnie pokrojone!',
      tryAgain: function (k) { return k + (k === 1 ? ' błąd' : ' błędy') + '. Dasz radę za pierwszym razem?'; },
      again: 'Zagraj od nowa od poziomu 1',
      next: 'Następny poziom'
    }
  };
  var T = STRINGS[document.documentElement.lang] || STRINGS.en;

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    levels: $('levels'), pizza: $('pizza'), cuts: $('cuts'), plate: $('plate'), status: $('status'),
    goal: $('goal-num'), serve: $('serve'), mistakes: $('mistakes'),
    win: $('win'), stars: $('stars'), eq: $('eq-text'), note: $('win-note'),
    next: $('next'), reset: $('reset')
  };

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { best: {} }; }
    catch (e) { return { best: {} }; }
  }
  function save(p) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
  }

  var progress = load();
  progress.levels = LEVELS.length;
  var state = newLevel(Math.min(progress.current || 0, LEVELS.length - 1));

  var SVG = 'http://www.w3.org/2000/svg';
  var STAR_PATH = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z';
  function frac(t) { return t[0] + '/' + t[1]; }
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVG, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

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

  // Pizza: n wedges around (0,0), radius 100. Taken slices slide outward and get pepperoni.
  function renderPizza() {
    el.pizza.textContent = '';
    var R = 100, n = state.n || 1;
    for (var k = 0; k < n; k++) {
      var a0 = (k / n) * 2 * Math.PI - Math.PI / 2, a1 = ((k + 1) / n) * 2 * Math.PI - Math.PI / 2;
      var mid = (a0 + a1) / 2, on = !!state.taken[k];
      var g = svgEl('g', { class: 'slice' + (on ? ' on' : '') });
      if (on) g.setAttribute('transform', 'translate(' + 10 * Math.cos(mid) + ' ' + 10 * Math.sin(mid) + ')');
      var d = n === 1
        ? 'M0 -100A100 100 0 1 1 -0.01 -100Z'
        : 'M0 0L' + R * Math.cos(a0) + ' ' + R * Math.sin(a0) +
          'A' + R + ' ' + R + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + R * Math.cos(a1) + ' ' + R * Math.sin(a1) + 'Z';
      g.appendChild(svgEl('path', { d: d, class: 'crust' }));
      g.appendChild(svgEl('circle', { cx: 0.6 * R * Math.cos(mid), cy: 0.6 * R * Math.sin(mid), r: 9, class: 'pep' }));
      if (state.n && !state.won) {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-pressed', String(on));
        g.setAttribute('aria-label', T.slice(k + 1, n, on));
        (function (k) {
          g.addEventListener('click', function () { act(toggle(state, k)); });
          g.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(toggle(state, k)); focusSlice(k); }
          });
        })(k);
      }
      el.pizza.appendChild(g);
    }
  }
  function focusSlice(k) { var s = el.pizza.querySelectorAll('.slice')[k]; if (s) s.focus(); }

  function renderCuts() {
    var L = LEVELS[state.level];
    el.cuts.textContent = '';
    el.cuts.hidden = !L.cuts;
    if (!L.cuts) return;
    var label = document.createElement('span');
    label.className = 'cuts-label';
    label.textContent = T.cutFirst;
    el.cuts.appendChild(label);
    L.cuts.forEach(function (n) {
      var b = document.createElement('button');
      b.className = 'chip';
      b.textContent = T.cutInto(n);
      b.setAttribute('aria-pressed', String(state.n === n));
      b.disabled = state.won;
      b.addEventListener('click', function () { act(cut(state, n)); });
      el.cuts.appendChild(b);
    });
  }

  function renderStars(n) {
    el.stars.textContent = '';
    el.stars.setAttribute('aria-label', T.stars(n));
    for (var i = 0; i < 3; i++) {
      var svg = svgEl('svg', { width: 34, height: 34, viewBox: '0 0 24 24', 'aria-hidden': 'true' });
      svg.appendChild(svgEl('path', { d: STAR_PATH, fill: i < n ? '#FFD25E' : '#FFFFFF', stroke: '#1B2240', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }));
      el.stars.appendChild(svg);
    }
  }

  function render() {
    renderLevels();
    renderCuts();
    renderPizza();
    el.goal.textContent = frac(state.t);
    el.plate.textContent = state.n ? T.taken(count(state), state.n) : '';
    el.mistakes.textContent = state.mistakes + ' / ' + MAX_MISTAKES;
    el.serve.disabled = state.won || !state.n || !count(state);
    el.win.hidden = !state.won;
    if (state.won) {
      var n = stars(state.mistakes);
      renderStars(n);
      el.eq.textContent = count(state) + '/' + state.n + ' = ' + frac(state.t);
      el.note.textContent = n === 3 ? T.perfect : T.tryAgain(state.mistakes);
      el.next.textContent = state.level === LEVELS.length - 1 ? T.again : T.next;
    }
  }

  function act(next) {
    if (next === state) return;
    state = next;
    el.status.textContent = '';
    render();
  }

  el.serve.addEventListener('click', function () {
    var before = state;
    state = serve(state);
    if (state.won) {
      progress.best[state.level] = Math.max(progress.best[state.level] || 0, stars(state.mistakes));
      save(progress);
      el.status.textContent = '';
      render();
      el.next.focus();
      return;
    }
    el.status.textContent = state.cold ? T.cold : T.wrong(count(before), before.n, frac(before.t));
    render();
  });

  function goTo(i) {
    state = newLevel(i);
    progress.current = i;
    save(progress);
    el.status.textContent = '';
    render();
  }

  el.next.addEventListener('click', function () { goTo(state.level === LEVELS.length - 1 ? 0 : state.level + 1); });
  el.reset.addEventListener('click', function () { goTo(state.level); });

  render();
})(typeof window !== 'undefined' ? window : globalThis);
