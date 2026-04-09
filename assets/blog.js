/**
 * blog.js — 瀏覽計數器（使用 Supabase）
 *
 * 依賴：頁面需先載入 Supabase CDN，並設定：
 *   window.SUPABASE_URL      = '...'
 *   window.SUPABASE_ANON_KEY = '...'
 *   window.PAGE_SLUG         = '...'  // 文章 slug 或 'index'
 *   window.PAGE_TITLE        = '...'
 *   window.IS_INDEX          = true/false
 */
(async function () {
  'use strict';

  // ── 設定驗證 ──────────────────────────────────────────────
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_KEY = window.SUPABASE_ANON_KEY;
  const PAGE_SLUG    = window.PAGE_SLUG;
  const PAGE_TITLE   = window.PAGE_TITLE || PAGE_SLUG;
  const IS_INDEX     = window.IS_INDEX === true;

  if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_PROJECT') ||
      !SUPABASE_KEY || SUPABASE_KEY.includes('YOUR_SUPABASE') ||
      !PAGE_SLUG) {
    console.warn('[blog.js] Supabase 尚未設定，跳過計數器。');
    setAllDisplays('–');
    return;
  }

  if (typeof supabase === 'undefined') {
    console.warn('[blog.js] Supabase SDK 未載入。');
    setAllDisplays('–');
    return;
  }

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── 工具函式 ──────────────────────────────────────────────
  function fmt(n) {
    return typeof n === 'number' ? n.toLocaleString('zh-TW') : '–';
  }

  function setDisplay(el, value) {
    el.textContent = fmt(value);
    el.setAttribute('data-loaded', '1');
  }

  function setAllDisplays(val) {
    document.querySelectorAll('.view-count-display').forEach(el => {
      el.textContent = val;
      el.setAttribute('data-loaded', '1');
    });
  }

  // ── 累加並取得本頁計數 ────────────────────────────────────
  async function incrementAndGet(slug, title) {
    try {
      const { data, error } = await client.rpc('increment_view_count', {
        page_slug:  slug,
        page_title: title
      });
      if (error) { console.warn('[blog.js] RPC 錯誤:', error.message); return null; }
      return data?.[0]?.view_count ?? null;
    } catch (e) {
      console.warn('[blog.js] 無法連線 Supabase:', e.message);
      return null;
    }
  }

  // ── 批次讀取多頁計數（首頁卡片用）────────────────────────
  async function fetchCounts(slugs) {
    if (!slugs.length) return {};
    try {
      const { data, error } = await client
        .from('page_views')
        .select('slug, view_count')
        .in('slug', slugs);
      if (error) { console.warn('[blog.js] 查詢錯誤:', error.message); return {}; }
      return Object.fromEntries((data ?? []).map(r => [r.slug, r.view_count]));
    } catch (e) {
      console.warn('[blog.js] 無法讀取計數:', e.message);
      return {};
    }
  }

  // ── 主邏輯 ────────────────────────────────────────────────
  // 1. 累加本頁瀏覽
  const thisCount = await incrementAndGet(PAGE_SLUG, PAGE_TITLE);

  // 2. 文章頁：直接顯示本頁計數
  if (!IS_INDEX) {
    document.querySelectorAll('.view-count-display:not([data-slug])').forEach(el => {
      setDisplay(el, thisCount);
    });
    document.querySelectorAll(`.view-count-display[data-slug="${CSS.escape(PAGE_SLUG)}"]`).forEach(el => {
      setDisplay(el, thisCount);
    });
  }

  // 3. 首頁：批次載入所有卡片計數，並加總顯示網站總瀏覽
  if (IS_INDEX) {
    const cards     = Array.from(document.querySelectorAll('.post-card[data-slug]'));
    const cardSlugs = cards.map(c => c.dataset.slug).filter(Boolean);
    const counts    = await fetchCounts(cardSlugs);

    // 各卡片個別計數
    cards.forEach(card => {
      const slug  = card.dataset.slug;
      const count = counts[slug] ?? null;
      card.querySelectorAll('.view-count-display').forEach(el => {
        setDisplay(el, count);
      });
    });

    // 網站總瀏覽 = 首頁瀏覽 + 所有文章瀏覽加總
    const articlesTotal = Object.values(counts).reduce((sum, v) => sum + (v || 0), 0);
    const siteTotal     = (thisCount || 0) + articlesTotal;
    document.querySelectorAll('.view-count-display:not([data-slug])').forEach(el => {
      setDisplay(el, siteTotal);
    });
  }
})();
