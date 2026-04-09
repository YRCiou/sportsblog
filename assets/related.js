/**
 * related.js — 延伸閱讀：依關鍵字／內容相關性自動推薦最多 3 篇文章
 * 運作方式：從 posts-data.json 讀取所有文章，對當前文章做關鍵字比對後排序。
 */
(async () => {
  const section = document.getElementById('related-posts-section');
  if (!section) return;

  const currentSlug = window.PAGE_SLUG;
  if (!currentSlug || window.IS_INDEX) return;

  // 解析 base href，確保在各種部署路徑下都能正確取得檔案
  const BASE = document.querySelector('base')?.href ?? (location.origin + '/');

  let allPosts;
  try {
    const res = await fetch(new URL('posts-data.json', BASE));
    if (!res.ok) return;
    const data = await res.json();
    allPosts = data.posts ?? [];
  } catch { return; }

  const others = allPosts.filter(p => p.slug !== currentSlug);
  if (others.length === 0) return;

  const current = allPosts.find(p => p.slug === currentSlug);
  if (!current) return;

  /* ── 關鍵字萃取 ──────────────────────────────────────── */
  function tokenize(text) {
    if (!text) return [];
    // 切中文字元（每個字單獨算）+ 英文/數字詞
    const cjk   = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []);
    const latin = (text.match(/[a-zA-Z0-9]{2,}/g) ?? []).map(w => w.toLowerCase());
    return [...cjk, ...latin];
  }

  function buildBag(post) {
    // 各欄位給不同權重：topic(3x) > title(2x) > excerpt(1x) > category(3x)
    const tokens = [
      ...tokenize(post.topic).flatMap(t => [t, t, t]),
      ...tokenize(post.title).flatMap(t => [t, t]),
      ...tokenize(post.excerpt),
      ...(post.category ? [post.category, post.category, post.category] : [])
    ];
    const bag = {};
    tokens.forEach(t => { bag[t] = (bag[t] ?? 0) + 1; });
    return bag;
  }

  const currentBag = buildBag(current);

  /* ── 相關性評分（Cosine-like overlap） ───────────────── */
  function score(post) {
    const bag = buildBag(post);
    let dot = 0;
    for (const [token, cnt] of Object.entries(bag)) {
      if (currentBag[token]) dot += cnt * currentBag[token];
    }
    // 同分類額外加分
    if (post.category && post.category === current.category) dot += 20;
    return dot;
  }

  const ranked = others
    .map(p => ({ post: p, score: score(p) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (ranked.length === 0) return;

  /* ── 渲染 ─────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const cards = ranked.map(({ post }) => {
    const thumb = post.hero?.url ?? post.hero?.thumbUrl ?? '';
    const imgHtml = thumb
      ? `<div class="ri-img"><img src="${escHtml(thumb)}" alt="${escHtml(post.title)}" loading="lazy"></div>`
      : `<div class="ri-img ri-img--empty"></div>`;
    const badge = post.category
      ? `<span class="cat-badge">${escHtml(post.category)}</span>`
      : '';
    const excerpt = (post.excerpt ?? '').slice(0, 65) + (post.excerpt?.length > 65 ? '...' : '');

    return `
      <a class="ri-card" href="${escHtml(BASE + 'posts/' + post.slug + '/')}">
        ${imgHtml}
        <div class="ri-body">
          <div class="ri-meta">${badge}</div>
          <p class="ri-title">${escHtml(post.title)}</p>
          <p class="ri-excerpt">${escHtml(excerpt)}</p>
        </div>
      </a>`;
  }).join('');

  section.innerHTML = `
    <div class="related-posts">
      <h2 class="related-heading">延伸閱讀</h2>
      <div class="ri-grid">${cards}</div>
    </div>`;
})();
