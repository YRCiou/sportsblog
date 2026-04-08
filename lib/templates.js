import { readFileSync } from 'fs';

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
}

function currentYear() {
  return new Date().getFullYear();
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── 單篇文章頁面 ────────────────────────────────────────────────────────────

export function generateArticlePage(post, config) {
  const { slug, title, author, content, createdAt, updatedAt, hero } = post;
  const { site, supabase } = config;
  const hasHero = hero && hero.url;

  const heroSection = hasHero ? `
  <section class="hero-section">
    <div class="content-width">
      <img class="hero-image"
           src="${escHtml(hero.url)}"
           alt="${escHtml(hero.title)}"
           loading="lazy">
    </div>
  </section>` : '';

  const imageCredit = hasHero ? `
      <div class="image-credit">
        <strong>圖片來源：</strong>「<a href="${escHtml(hero.sourceUrl)}" target="_blank" rel="noopener">${escHtml(hero.title)}</a>」
        by ${escHtml(hero.author)}，
        授權：<a href="${escHtml(hero.licenseUrl)}" target="_blank" rel="noopener">${escHtml(hero.license)}</a>
        via <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a>
      </div>` : '';

  const ogImage = hasHero
    ? `https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/UTMB_2015_Starting_Line.jpg/1280px-UTMB_2015_Starting_Line.jpg`
    : '';
  const canonicalUrl = `${site.baseUrl}/posts/${slug}/`;

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)} | ${escHtml(site.title)}</title>
  <meta name="description" content="${escHtml(post.excerpt)}">
  <meta name="author" content="${escHtml(author)}">
  <link rel="canonical" href="${escHtml(canonicalUrl)}">
  <link rel="icon" type="image/svg+xml" href="../../assets/favicon.svg">
  <!-- Open Graph / Facebook / LINE -->
  <meta property="og:type"        content="article">
  <meta property="og:site_name"   content="${escHtml(site.title)}">
  <meta property="og:title"       content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(post.excerpt)}">
  <meta property="og:url"         content="${escHtml(canonicalUrl)}">
  <meta property="og:locale"      content="zh_TW">
  ${ogImage ? `<meta property="og:image" content="${escHtml(hero.url)}">
  <meta property="og:image:width"  content="1280">
  <meta property="og:image:height" content="854">` : ''}
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(post.excerpt)}">
  ${ogImage ? `<meta name="twitter:image" content="${escHtml(hero.url)}">` : ''}
  <!-- JSON-LD 結構化資料 -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${escHtml(title)}",
    "description": "${escHtml(post.excerpt)}",
    "image": "${escHtml(hasHero ? hero.url : '')}",
    "url": "${escHtml(canonicalUrl)}",
    "datePublished": "${post.createdAt}",
    "dateModified": "${post.updatedAt}",
    "author": { "@type": "Person", "name": "${escHtml(author)}" },
    "publisher": { "@type": "Organization", "name": "${escHtml(site.title)}", "url": "${escHtml(site.baseUrl)}" }
  }
  <\/script>
  <link rel="stylesheet" href="../../assets/style.css">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="site-title" href="../../">${escHtml(site.title)}</a>
      <a class="back-link" href="../../">← 所有文章</a>
    </div>
  </header>
${heroSection}
  <main>
    <div class="content-wrapper">
      <article>
        <header class="article-header">
          <div class="article-meta">
            <span class="meta-author">✍ 作者：${escHtml(author)}</span>
            <span class="meta-sep">·</span>
            <span class="meta-date">發布：${fmtDate(createdAt)}</span>
            <span class="meta-sep">·</span>
            <span class="meta-updated">更新：${fmtDate(updatedAt)}</span>
            <span class="meta-sep">·</span>
            <span class="meta-views">👁 瀏覽：<span class="view-count-display">…</span></span>
          </div>
          <h1 class="article-title">${escHtml(title)}</h1>
        </header>

        <div class="article-content">
          ${content}
        </div>
      </article>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      ${imageCredit}
      <p class="footer-copy">© ${currentYear()} ${escHtml(site.title)}</p>
    </div>
  </footer>

  <script>
    window.SUPABASE_URL      = ${JSON.stringify(supabase.url)};
    window.SUPABASE_ANON_KEY = ${JSON.stringify(supabase.anonKey)};
    window.PAGE_SLUG         = ${JSON.stringify(slug)};
    window.PAGE_TITLE        = ${JSON.stringify(title)};
    window.IS_INDEX          = false;
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script src="../../assets/blog.js"></script>
</body>
</html>`;
}

// ─── 卡片 ────────────────────────────────────────────────────────────────────

export function generateCard(post) {
  const { slug, title, author, excerpt, updatedAt, hero } = post;
  // 優先用 url（避免縮圖 404），thumbUrl 為備用
  const thumb = hero?.url ?? hero?.thumbUrl ?? '';
  const imgTag = thumb
    ? `<img src="${escHtml(thumb)}" alt="${escHtml(title)}" loading="lazy">`
    : `<div class="card-image-placeholder"></div>`;

  return `
    <article class="post-card" data-slug="${escHtml(slug)}">
      <a href="./posts/${escHtml(slug)}/" class="card-link">
        <div class="card-image">${imgTag}</div>
        <div class="card-body">
          <h2 class="card-title">${escHtml(title)}</h2>
          <div class="card-meta">
            <span class="card-author">✍ ${escHtml(author)}</span>
            <span class="card-date">🗓 ${fmtDate(updatedAt)}</span>
          </div>
          <p class="card-excerpt">${escHtml(excerpt)}</p>
          <div class="card-footer">
            <span class="card-views">👁 <span class="view-count-display" data-slug="${escHtml(slug)}">–</span></span>
          </div>
        </div>
      </a>
    </article>`;
}

// ─── 首頁 ────────────────────────────────────────────────────────────────────

export function generateIndexPage(posts, config) {
  const { site, supabase } = config;
  // 最新更新在前
  const sorted = [...posts].sort((a, b) =>
    new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  const cards = sorted.map(generateCard).join('\n');
  const emptyMsg = posts.length === 0
    ? '<p class="no-posts">還沒有任何文章，快用 <code>node create-post.js</code> 建立第一篇！</p>'
    : '';

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(site.title)}</title>
  <meta name="description" content="${escHtml(site.title)} — 越野跑研究、賽事分析與訓練筆記">
  <link rel="canonical" href="${escHtml(site.baseUrl)}/">
  <link rel="icon" type="image/svg+xml" href="./assets/favicon.svg">
  <meta property="og:type"        content="website">
  <meta property="og:site_name"   content="${escHtml(site.title)}">
  <meta property="og:title"       content="${escHtml(site.title)}">
  <meta property="og:description" content="${escHtml(site.title)} — 越野跑研究、賽事分析與訓練筆記">
  <meta property="og:url"         content="${escHtml(site.baseUrl)}/">
  <meta property="og:locale"      content="zh_TW">
  <meta name="twitter:card"       content="summary">
  <link rel="stylesheet" href="./assets/style.css">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <span class="site-title">${escHtml(site.title)}</span>
      <div class="site-stats">
        網站總瀏覽：<span class="view-count-display">…</span>
      </div>
    </div>
  </header>

  <main>
    <div class="container index-main">
      <div class="index-header">
        <h1>所有文章</h1>
        <span class="post-count">${sorted.length} 篇</span>
      </div>
      ${emptyMsg}
      <div class="cards-grid">
        ${cards}
      </div>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p class="footer-copy">© ${currentYear()} ${escHtml(site.title)}</p>
    </div>
  </footer>

  <script>
    window.SUPABASE_URL      = ${JSON.stringify(supabase.url)};
    window.SUPABASE_ANON_KEY = ${JSON.stringify(supabase.anonKey)};
    window.PAGE_SLUG         = 'index';
    window.PAGE_TITLE        = ${JSON.stringify(site.title)};
    window.IS_INDEX          = true;
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script src="./assets/blog.js"></script>
</body>
</html>`;
}
