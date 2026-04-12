/**
 * theme.js — 深色/淺色模式切換
 * 搭配 <html> 的 data-theme="light"|"dark" 屬性運作。
 * 防閃白（FOUC）的 inline script 已內嵌在各頁面 <head> 中。
 */
(function () {
  var btn = document.getElementById('themeToggle');
  if (!btn) return;

  /** 同步 aria-label */
  function syncLabel() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-label', dark ? '切換淺色模式' : '切換深色模式');
    btn.setAttribute('title',      dark ? '切換淺色模式' : '切換深色模式');
  }

  syncLabel();

  btn.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('yr-theme', next); } catch (e) {}
    syncLabel();
  });
})();
