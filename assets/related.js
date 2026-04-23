/**
 * related.js — 延伸閱讀：拓撲主題層級排序 + 熱門度加分
 *
 * 評分公式（每篇候選文章）：
 *   topicScore    = Σ √(w[i] × w[j])   共同主題的幾何平均位置權重
 *                   （topics[] 索引 0 = 最具體，越後越通用）
 *   keywordScore  = 共同 keywords 數 × 12
 *   categoryBonus = 同分類 +30
 *   popularityBonus = min(25, log2(views+1) × 3)  來自 Supabase page_views
 *   recencyBonus  = 發布 90 天內 +5
 *   priorityBonus = post.priority × 3
 *
 * 最多顯示 5 篇；totalScore ≤ 0 的文章不顯示。
 *
 * posts-data.json 每篇文章必須包含：
 *   topics[]   — 主題陣列，由最具體到最通用排列
 *   keywords[] — 關鍵字陣列（中英文均可）
 *   priority   — 數字，預設 1；特別推薦可設為 2–5
 */
(async () => {
  'use strict';

  const section = document.getElementById('related-posts-section');
  if (!section) return;

  const currentSlug = window.PAGE_SLUG;
  if (!currentSlug || window.IS_INDEX) return;

  // 解析 base href，確保在各種部署路徑下都能正確取得檔案
  const BASE = document.querySelector('base')?.href ?? (location.origin + '/');

  // ── 讀取文章資料 ────────────────────────────────────────────────
  let allPosts;
  try {
    const res = await fetch(new URL('posts-data.json', BASE));
    if (!res.ok) return;
    const data = await res.json();
    allPosts = data.posts ?? [];
  } catch { return; }

  const current = allPosts.find(p => p.slug === currentSlug);
  if (!current) return;
  const others = allPosts.filter(p => p.slug !== currentSlug);
  if (others.length === 0) return;

  // ── 拓撲主題權重 ────────────────────────────────────────────────
  // 索引 0 = 最具體（權重最高），越後面越通用（權重遞減）
  // 例：["bjj-finishing", "bjj-statistics", "bjj", "grappling", ..., "sports"]
  //      200              100                50     25           ...   2
  const TOPIC_W = [200, 100, 50, 25, 12, 5, 2];

  function topicWeight(idx) {
    return TOPIC_W[Math.min(idx, TOPIC_W.length - 1)];
  }

  /**
   * 計算兩篇文章的主題相關性分數。
   * 對每個共同主題取兩篇文章中各自位置權重的幾何平均值，
   * 使得「雙方都視為核心主題」的共同點得分遠高於「一方把它當通用標籤」的情況。
   */
  function calcTopicScore(postA, postB) {
    const tA = postA.topics ?? [];
    const tB = postB.topics ?? [];
    if (tA.length === 0 || tB.length === 0) return 0;
    let score = 0;
    tA.forEach((topic, i) => {
      const j = tB.indexOf(topic);
      if (j !== -1) {
        score += Math.sqrt(topicWeight(i) * topicWeight(j));
      }
    });
    return score;
  }

  /**
   * 計算兩篇文章共同關鍵字數，每個共同字詞加 12 分。
   */
  function calcKeywordScore(postA, postB) {
    const setA = new Set(postA.keywords ?? []);
    const shared = (postB.keywords ?? []).filter(k => setA.has(k)).length;
    return shared * 12;
  }

  /**
   * 時效加分：發布 90 天內 +5（鼓勵新文章被發現）
   */
  function calcRecencyBonus(post) {
    try {
      const ageMs = Date.now() - new Date(post.createdAt).getTime();
      return ageMs <= 90 * 86400000 ? 5 : 0;
    } catch { return 0; }
  }

  // ── 熱門度：從 Supabase 讀取 view_count ─────────────────────────
  // 失敗時靜默降級，不影響其他評分維度
  let viewCounts = {};
  try {
    const SURL = window.SUPABASE_URL;
    const SKEY = window.SUPABASE_ANON_KEY;
    if (
      SURL && SKEY &&
      !SURL.includes('YOUR_PROJECT') &&
      typeof supabase !== 'undefined'
    ) {
      const client = supabase.createClient(SURL, SKEY);
      const slugs  = others.map(p => p.slug);
      const { data } = await client
        .from('page_views')
        .select('slug, view_count')
        .in('slug', slugs);
      if (data) {
        viewCounts = Object.fromEntries(
          data.map(r => [r.slug, r.view_count ?? 0])
        );
      }
    }
  } catch { /* 靜默降級 */ }

  /**
   * 熱門度加分：log₂(views+1) × 3，上限 25。
   * 約 views=10  → +10, views=100 → +20, views=1000 → +30 (capped at 25)
   */
  function calcPopularityBonus(slug) {
    const v = viewCounts[slug] ?? 0;
    return Math.min(25, Math.log2(v + 1) * 3);
  }

  // ── 綜合評分 ─────────────────────────────────────────────────────
  function totalScore(post) {
    const ts  = calcTopicScore(current, post);
    const ks  = calcKeywordScore(current, post);
    const cb  = (post.category && post.category === current.category) ? 30 : 0;
    const pb  = calcPopularityBonus(post.slug);
    const rb  = calcRecencyBonus(post);
    const pri = (post.priority ?? 0) * 3;
    return ts + ks + cb + pb + rb + pri;
  }

  const ranked = others
    .map(p => ({ post: p, score: totalScore(p) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (ranked.length === 0) return;

  // ── 渲染 ────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function imgObjectPosition(url) {
    if (!url) return 'center center';
    if (/\/assets\/og-[^/]+\.jpg/.test(url)) return 'left center';
    if (/upload\.wikimedia\.org/.test(url)) return 'center top';
    return 'center center';
  }

  const cards = ranked.map(({ post }) => {
    const thumb = post.hero?.thumbUrl ?? post.hero?.url ?? '';
    const pos = post.hero?.objectPosition ?? imgObjectPosition(thumb);
    const imgHtml = thumb
      ? `<div class="ri-img"><img src="${escHtml(thumb)}" alt="${escHtml(post.title)}" loading="lazy" style="object-position:${pos}"></div>`
      : `<div class="ri-img ri-img--empty"></div>`;
    const badge = post.category
      ? `<span class="cat-badge">${escHtml(post.category)}</span>`
      : '';
    const excerpt = (post.excerpt ?? '').slice(0, 65) +
      ((post.excerpt?.length ?? 0) > 65 ? '...' : '');

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
