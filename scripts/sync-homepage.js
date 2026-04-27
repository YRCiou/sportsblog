/**
 * sync-homepage.js
 *
 * 從 posts-data.json 讀取所有文章資料，更新：
 *   1. 首頁 index.html（全部文章）
 *   2. 三個分類頁 trail-running/ bjj/ weightlifting/（不含 hero／intro／sources）
 *
 * 使用方式：
 *   node scripts/sync-homepage.js
 *
 * 自動化：
 *   GitHub Actions 在每次 push 時執行此腳本，確保各頁面與 posts-data.json 保持同步。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const postsDataPath = path.join(ROOT, 'posts-data.json');
const indexPath     = path.join(ROOT, 'index.html');

/* ── 讀取資料 ─────────────────────────────────────────── */
const { posts } = JSON.parse(fs.readFileSync(postsDataPath, 'utf8'));

/* ── 工具函式 ─────────────────────────────────────────── */
function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

/* ── 圖片位置（與 related.js 規則一致）────────────────── */
function imgObjectPosition(url) {
  if (!url) return null;
  if (/\/assets\/og-[^/]+\.jpg/.test(url)) return 'left center';
  if (/upload\.wikimedia\.org/.test(url)) return 'center top';
  return null;
}

/* ── 產生卡片 HTML（首頁版 ./posts/...） ──────────────── */
function renderCard(post, hrefPrefix = './posts/') {
  const imgSrc  = escHtml(post.hero?.url ?? post.hero?.thumbUrl ?? '');
  const imgAlt  = escHtml(post.title);
  const href    = `${hrefPrefix}${escHtml(post.slug)}/`;
  const date    = formatDate(post.createdAt);
  const excerpt = escHtml(post.excerpt ?? '');
  const slug    = escHtml(post.slug);
  const title   = escHtml(post.title);
  const cat     = escHtml(post.category ?? '');
  const pos     = post.hero?.objectPosition
                ?? imgObjectPosition(post.hero?.url ?? post.hero?.thumbUrl ?? '');
  const posAttr = pos ? ` style="object-position: ${pos}"` : '';

  return `    <article class="post-card" data-slug="${slug}" data-category="${cat}">
      <a href="${href}" class="card-link">
        <div class="card-image"><img src="${imgSrc}" alt="${imgAlt}" loading="lazy"${posAttr}></div>
        <div class="card-body">
          <h2 class="card-title">${title}</h2>
          <div class="card-meta">
            <span class="card-author">✍ YRCiou</span>
            <span class="card-date">🗓 ${date}</span>
          </div>
          <p class="card-excerpt">${excerpt}</p>
          <div class="card-footer">
            <span class="card-views">👁 <span class="view-count-display" data-slug="${slug}">–</span></span>
          </div>
        </div>
      </a>
    </article>`;
}

/* ── 更新首頁 index.html ─────────────────────────────── */
const START_MARKER = '<!-- CARDS_START -->';
const END_MARKER   = '<!-- CARDS_END -->';

function injectCards(html, cardsHtml, count) {
  const startIdx = html.indexOf(START_MARKER);
  const endIdx   = html.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) return null;
  const newCards = '\n' + cardsHtml + '\n    ';
  return html.slice(0, startIdx + START_MARKER.length)
       + newCards
       + html.slice(endIdx);
}

let homeHtml = fs.readFileSync(indexPath, 'utf8');
const allCardsHtml = posts.map(p => renderCard(p, './posts/')).join('\n\n');
let updated = injectCards(homeHtml, allCardsHtml, posts.length);
if (!updated) {
  console.error('❌ index.html 找不到 CARDS markers');
  process.exit(1);
}
updated = updated.replace(/(<span class="post-count">)\d+( 篇<\/span>)/, `$1${posts.length}$2`);
fs.writeFileSync(indexPath, updated, 'utf8');
console.log(`✅ index.html 同步 ${posts.length} 篇文章卡片`);

/* ── 產生分類頁 ───────────────────────────────────────── */
const categories = [
  { slug: 'trail-running', label: '越野',  zhName: '越野跑',
    title: '越野跑賽道分析｜YR 運動研究室',
    desc: 'GPX 軌跡 × 海拔地形 × 氣象實況，深度拆解越野跑賽道：發發爾衛、淘金越野、找茶越野、UTMB 世界系列賽。' },
  { slug: 'bjj', label: '巴柔', zhName: '巴柔 BJJ',
    title: '巴柔 BJJ 運動科學｜YR 運動研究室',
    desc: '整合 PubMed 學術文獻與 IBJJF/ASJJF 賽事數據，分析致勝招式演進與傷害預防。' },
  { slug: 'weightlifting', label: '舉重', zhName: '舉重',
    title: '舉重訓練與分析｜YR 運動研究室',
    desc: '舉重訓練、技術分析與運動科學文章。' },
];

function renderCategoryPage(cat) {
  const filtered = posts.filter(p => p.category === cat.label);
  const cardsHtml = filtered.length
    ? filtered.map(p => renderCard(p, '../posts/')).join('\n\n')
    : '    <p style="grid-column: 1 / -1; color: #94a3b8; font-size: 1rem; padding: 2rem 0; text-align: center;">尚無文章，敬請期待。</p>';

  // tab active state
  const tabHtml = `
        <a class="tab-btn${cat.label === '__all__' ? ' active' : ''}" href="../">全部</a>
        <a class="tab-btn${cat.slug === 'trail-running' ? ' active' : ''}" href="../trail-running/">越野</a>
        <a class="tab-btn${cat.slug === 'bjj' ? ' active' : ''}" href="../bjj/">巴柔</a>
        <a class="tab-btn${cat.slug === 'weightlifting' ? ' active' : ''}" href="../weightlifting/">舉重</a>`;

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(cat.title)}</title>
  <meta name="description" content="${escHtml(cat.desc)}">
  <link rel="canonical" href="https://yrciou.github.io/sportsblog/${cat.slug}/">
  <base href="/sportsblog/">
  <link rel="shortcut icon" type="image/x-icon"     href="https://yrciou.github.io/sportsblog/favicon.ico">
  <link rel="icon" type="image/png" sizes="192x192" href="https://yrciou.github.io/sportsblog/assets/favicon-192.png">
  <link rel="icon" type="image/png" sizes="48x48"  href="https://yrciou.github.io/sportsblog/assets/favicon-48.png">
  <link rel="icon" type="image/png" sizes="32x32"  href="https://yrciou.github.io/sportsblog/assets/favicon-32.png">
  <link rel="icon" type="image/svg+xml"             href="https://yrciou.github.io/sportsblog/assets/favicon.svg">
  <link rel="apple-touch-icon"                      href="https://yrciou.github.io/sportsblog/assets/favicon-192.png">
  <meta property="og:type"        content="website">
  <meta property="og:site_name"   content="YR 運動研究室">
  <meta property="og:title"       content="${escHtml(cat.title)}">
  <meta property="og:description" content="${escHtml(cat.desc)}">
  <meta property="og:url"         content="https://yrciou.github.io/sportsblog/${cat.slug}/">
  <meta property="og:locale"      content="zh_TW">
  <meta property="og:image"       content="https://yrciou.github.io/sportsblog/assets/og-homepage.jpg">
  <script>!function(){var t=localStorage.getItem('yr-theme')||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)}()</script>
  <link rel="stylesheet" href="assets/style.css">
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-5FJGQZJ9');</script>
  <!-- Microsoft Clarity -->
  <script type="text/javascript">(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","wi4b768wc3");</script>
</head>
<body>
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5FJGQZJ9"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <header class="site-header">
    <div class="container">
      <a class="site-title" href="../">
        <img src="assets/favicon.svg" class="site-logo" alt="YR 運動研究室">
        YR 運動研究室
      </a>
      <nav class="header-tabs" id="categoryTabs">${tabHtml}
      </nav>
      <div class="header-spacer"></div>
      <div class="site-stats">總瀏覽：<span class="view-count-display">…</span></div>
      <button class="theme-toggle" id="themeToggle" aria-label="切換深色/淺色模式">
        <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg class="icon-sun"  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      </button>
      <button class="search-toggle" id="searchToggle" aria-label="搜尋文章">
        <svg class="search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>
    </div>
  </header>
  <div class="search-panel" id="searchPanel">
    <div class="container">
      <div class="search-input-row">
        <svg class="search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="searchInput" class="search-input" placeholder="請輸入關鍵字" autocomplete="off">
        <button class="search-close-btn" id="searchClose" aria-label="關閉">✕</button>
      </div>
      <div class="search-results" id="searchResults"></div>
    </div>
  </div>

  <main>
    <div class="container index-main">
      <div class="index-header" style="margin-top:2rem;">
        <h2 class="section-title" style="margin:0;border-bottom:none;">${escHtml(cat.zhName)}文章</h2>
        <span class="post-count">${filtered.length} 篇</span>
      </div>
      <div class="cards-grid">
${cardsHtml}
      </div>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p class="footer-copy">© 2026 YR 運動研究室</p>
    </div>
  </footer>

  <script>
    window.SUPABASE_URL      = "https://cpzdyivdciglbhznrlkl.supabase.co";
    window.SUPABASE_ANON_KEY = "sb_publishable_Z_xBTGqVA_YDMdq45Ks9Zg_uPrLF2a0";
    window.PAGE_SLUG         = 'category-${cat.slug}';
    window.PAGE_TITLE        = "${escHtml(cat.title)}";
    window.IS_INDEX          = true;
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script src="assets/blog.js"></script>
  <script src="assets/search.js"></script>
  <script src="assets/theme.js"></script>
</body>
</html>
`;
}

for (const cat of categories) {
  const dir = path.join(ROOT, cat.slug);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, 'index.html');
  fs.writeFileSync(outPath, renderCategoryPage(cat), 'utf8');
  const filteredCount = posts.filter(p => p.category === cat.label).length;
  console.log(`✅ ${cat.slug}/index.html 同步 ${filteredCount} 篇 ${cat.zhName} 文章`);
}
