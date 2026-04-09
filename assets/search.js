/**
 * search.js — 全站文章搜尋
 * 點擊右上角搜尋按鈕後展開搜尋欄，即時比對所有文章標題/摘要/分類/關鍵字
 */
(() => {
  const toggle  = document.getElementById('searchToggle');
  const panel   = document.getElementById('searchPanel');
  const input   = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  const closeBtn = document.getElementById('searchClose');
  if (!toggle || !panel || !input) return;

  const BASE = document.querySelector('base')?.href ?? (location.origin + '/');
  let posts = null;

  /* ── 取得文章資料 ─────────────────────────────────────── */
  async function fetchPosts() {
    if (posts) return;
    try {
      const res  = await fetch(new URL('posts-data.json', BASE));
      const data = await res.json();
      posts = data.posts ?? [];
    } catch { posts = []; }
  }

  /* ── 搜尋邏輯：支援多詞（空格分隔），all-and 匹配 ───── */
  function runSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q || !posts?.length) return [];
    const terms = q.split(/\s+/);
    return posts.filter(p => {
      const haystack = [p.title, p.excerpt, p.topic, p.category]
        .join(' ').toLowerCase();
      return terms.every(t => haystack.includes(t));
    });
  }

  /* ── 渲染結果 ─────────────────────────────────────────── */
  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                          .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function highlight(text, query) {
    const terms = query.trim().split(/\s+/).filter(Boolean);
    let result = esc(text);
    terms.forEach(t => {
      const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi');
      result = result.replace(re, m => `<mark>${m}</mark>`);
    });
    return result;
  }

  function render(matched, query) {
    if (!query.trim()) { results.innerHTML = ''; return; }
    if (!matched.length) {
      results.innerHTML = '<p class="search-empty">找不到符合「' + esc(query) + '」的文章</p>';
      return;
    }
    const cards = matched.map(p => {
      const thumb   = p.hero?.url ?? p.hero?.thumbUrl ?? '';
      const badge   = p.category ? `<span class="cat-badge">${esc(p.category)}</span>` : '';
      const excerpt = (p.excerpt ?? '').slice(0, 72) + (p.excerpt?.length > 72 ? '…' : '');
      return `
        <a class="sr-card" href="${esc(BASE + 'posts/' + p.slug + '/')}">
          ${thumb
            ? `<div class="sr-img"><img src="${esc(thumb)}" alt="" loading="lazy"></div>`
            : `<div class="sr-img sr-img--empty"></div>`}
          <div class="sr-body">
            <div class="sr-meta">${badge}</div>
            <p class="sr-title">${highlight(p.title, query)}</p>
            <p class="sr-excerpt">${esc(excerpt)}</p>
          </div>
        </a>`;
    }).join('');

    results.innerHTML =
      `<p class="search-count">找到 <strong>${matched.length}</strong> 篇文章</p>
       <div class="sr-list">${cards}</div>`;
  }

  /* ── 開關搜尋欄 ───────────────────────────────────────── */
  function openPanel() {
    panel.classList.add('open');
    toggle.classList.add('active');
    input.focus();
  }
  function closePanel() {
    panel.classList.remove('open');
    toggle.classList.remove('active');
    input.value = '';
    results.innerHTML = '';
  }

  toggle.addEventListener('click', async () => {
    if (panel.classList.contains('open')) { closePanel(); return; }
    await fetchPosts();
    openPanel();
  });

  closeBtn?.addEventListener('click', closePanel);

  input.addEventListener('input', () => render(runSearch(input.value), input.value));

  // ESC 關閉
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });

  // 點擊遮罩關閉
  document.getElementById('searchBackdrop')
    ?.addEventListener('click', closePanel);
})();
