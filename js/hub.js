// Hub page: subject filters + earned-stars badges
(function () {
  'use strict';

  // ---- Filters ----
  var chips = document.querySelectorAll('.chip[data-filter]');
  var cards = document.querySelectorAll('.card-grid > li');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.dataset.filter;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      cards.forEach(function (li) {
        li.hidden = f !== 'all' && li.dataset.subject !== f;
      });
    });
  });

  // ---- Progress (saved by each puzzle in localStorage) ----
  document.querySelectorAll('[data-progress]').forEach(function (el) {
    var data = null;
    try { data = JSON.parse(localStorage.getItem('kc:' + el.dataset.progress) || 'null'); } catch (e) { /* storage unavailable */ }
    if (!data || !data.best) return;
    var total = 0, max = 0;
    Object.keys(data.best).forEach(function (k) { total += data.best[k]; });
    max = (data.levels || Object.keys(data.best).length) * 3;
    el.textContent = '· ★ ' + total + '/' + max;
  });
})();
