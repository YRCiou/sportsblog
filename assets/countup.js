(function () {
  // Matches animatable numbers: optional +/-, optional comma thousands, optional decimals
  // e.g. 12.23 / 2,793 / +0.18 / 527 — but NOT 08:00 / ±11.14 / 6.9–7.9
  var NUM_RE = /^[+\-]?(\d{1,3}(,\d{3})*|\d+)(\.\d+)?$/;

  function parseNum(str) {
    return parseFloat(str.replace(/,/g, ''));
  }

  function formatNum(val, decimals, hasComma, prefix) {
    var s = Math.abs(val).toFixed(decimals);
    if (hasComma) {
      var parts = s.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      s = parts.join('.');
    }
    return prefix + s;
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateEl(el) {
    var text = el.textContent.trim();
    if (!NUM_RE.test(text)) return;

    var prefix = (text[0] === '+' || text[0] === '-') ? text[0] : '';
    var hasComma = text.indexOf(',') !== -1;
    var target = parseNum(text);
    var decimals = (text.split('.')[1] || '').length;
    var duration = 1100;
    var startTime = null;

    function tick(now) {
      if (!startTime) startTime = now;
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var current = target * easeOut(progress);
      el.textContent = formatNum(current, decimals, hasComma, prefix);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function runGrid(grid) {
    var els = grid.querySelectorAll('.stat-card .value');
    for (var i = 0; i < els.length; i++) animateEl(els[i]);
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        runGrid(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.stat-grid').forEach(function (grid) {
    observer.observe(grid);
  });
})();
