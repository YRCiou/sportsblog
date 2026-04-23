# YR 運動研究室 — 專案說明

## 網站資訊
- **網址**：https://yrciou.github.io/sportsblog/
- **GitHub Repo**：https://github.com/YRCiou/sportsblog
- **本地路徑**：任意位置（`git clone https://github.com/YRCiou/sportsblog.git`）；路徑無硬性限制

## 技術架構
- 純靜態 HTML / CSS / JS，無後端框架
- 部署平台：**GitHub Pages**（push 到 main 即自動上線）
- `<base href="/sportsblog/">` — 所有相對路徑從此根目錄算起
- Node.js 腳本用於產生圖片、sitemap 等（需要 **Node.js v20+**，建議 v24）

## 追蹤代碼
- **GTM**：GTM-5FJGQZJ9（需同時放 `<head>` 的 `<script>` 與 `<body>` 開頭的 `<noscript>`）
- **GA4**：G-THQY15MPB8
- **Supabase**：`https://cpzdyivdciglbhznrlkl.supabase.co`
  - Anon Key：`sb_publishable_Z_xBTGqVA_YDMdq45Ks9Zg_uPrLF2a0`

## 目錄結構
```
UTMB/
├── index.html                          # 首頁
├── posts-data.json                     # 所有文章的元資料（唯一資料來源）
├── assets/
│   ├── style.css                       # 全站樣式
│   ├── blog.js                         # Supabase 瀏覽計數器
│   ├── related.js                      # 延伸閱讀（拓撲排序）
│   ├── search.js                       # 全站搜尋
│   ├── theme.js                        # 深/淺色切換
│   ├── favicon.svg / favicon-*.png     # favicon（PNG 為 Google 所需）
│   └── og-*.jpg                        # 文章 OG 圖（1200×630）
├── posts/
│   ├── utmb-lottery-odds/index.html
│   ├── utmb-world-events/index.html
│   ├── bjj-finishing-moves/index.html
│   └── bjj-toe-injuries/index.html
├── scripts/
│   └── sync-homepage.js               # 從 posts-data.json 同步首頁卡片
└── sitemap.xml
```

---

## ★ 文章版型規範（所有文章必須遵守）

> **原則：每次新增或修改文章格式，同步更新此 MD，確保所有文章版型風格一致。**

### 1. HTML 頁面骨架

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【文章標題】 | YR 運動研究室</title>
  <meta name="description" content="【150字以內摘要】">
  <meta name="author" content="YRCiou">
  <link rel="canonical" href="https://yrciou.github.io/sportsblog/posts/【slug】/">
  <base href="/sportsblog/">

  <!-- Favicon（同所有頁面） -->
  <link rel="icon" type="image/png" sizes="192x192" href="https://yrciou.github.io/sportsblog/assets/favicon-192.png">
  <link rel="icon" type="image/png" sizes="48x48"  href="https://yrciou.github.io/sportsblog/assets/favicon-48.png">
  <link rel="icon" type="image/png" sizes="32x32"  href="https://yrciou.github.io/sportsblog/assets/favicon-32.png">
  <link rel="icon" type="image/svg+xml"             href="https://yrciou.github.io/sportsblog/assets/favicon.svg">
  <link rel="apple-touch-icon"                      href="https://yrciou.github.io/sportsblog/assets/favicon-192.png">

  <!-- OG / Facebook / LINE / Twitter -->
  <meta property="og:type"             content="article">
  <meta property="og:site_name"        content="YR 運動研究室">
  <meta property="og:title"            content="【文章標題（40字以內）】">
  <meta property="og:description"      content="【OG 摘要（80字以內）】">
  <meta property="og:url"              content="https://yrciou.github.io/sportsblog/posts/【slug】/">
  <meta property="og:locale"           content="zh_TW">
  <meta property="og:image"            content="https://yrciou.github.io/sportsblog/assets/og-【slug】.jpg">
  <meta property="og:image:secure_url" content="https://yrciou.github.io/sportsblog/assets/og-【slug】.jpg">
  <meta property="og:image:width"      content="1200">
  <meta property="og:image:height"     content="630">
  <meta property="og:image:type"       content="image/jpeg">
  <meta property="og:image:alt"        content="【圖片說明】">
  <meta name="twitter:card"            content="summary_large_image">
  <meta name="twitter:title"           content="【文章標題】">
  <meta name="twitter:description"     content="【OG 摘要】">
  <meta name="twitter:image"           content="https://yrciou.github.io/sportsblog/assets/og-【slug】.jpg">

  <!-- JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "【文章標題】",
    "description": "【摘要】",
    "image": "https://yrciou.github.io/sportsblog/assets/og-【slug】.jpg",
    "url": "https://yrciou.github.io/sportsblog/posts/【slug】/",
    "datePublished": "【YYYY-MM-DD】",
    "dateModified": "【YYYY-MM-DD】",
    "author": { "@type": "Person", "name": "YRCiou" },
    "publisher": {
      "@type": "Organization",
      "name": "YR 運動研究室",
      "url": "https://yrciou.github.io/sportsblog",
      "logo": { "@type": "ImageObject", "url": "https://yrciou.github.io/sportsblog/assets/favicon-192.png" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": "https://yrciou.github.io/sportsblog/posts/【slug】/" }
  }
  </script>

  <!-- 防閃白（Anti-FOUC）：在 CSS 載入前即設定主題 -->
  <script>!function(){var t=localStorage.getItem('yr-theme')||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)}()</script>

  <link rel="stylesheet" href="assets/style.css">
  <style>
    /* 文章專屬 CSS（參見第 4 節「CSS 元件規範」） */
  </style>

  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-5FJGQZJ9');</script>
</head>
<body>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5FJGQZJ9"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>

  <!-- ① Header -->
  <header class="site-header">
    <div class="container">
      <a class="site-title" href="./">
        <img src="assets/favicon.svg" class="site-logo" alt="YR 運動研究室">
        YR 運動研究室
      </a>
      <div class="header-spacer"></div>
      <button class="theme-toggle" id="themeToggle" aria-label="切換深色/淺色模式">
        <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg class="icon-sun"  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      </button>
      <button class="search-toggle" id="searchToggle" aria-label="搜尋文章">
        <svg class="search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>
      <a class="back-link" href="./">← 所有文章</a>
    </div>
  </header>

  <!-- ② 搜尋面板（固定，所有文章頁共用） -->
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

  <!-- ③ Hero 圖片（寬同內容區，背景黑） -->
  <section class="hero-section">
    <div class="content-width">
      <img class="hero-image"
           src="assets/og-【slug】.jpg"
           alt="【圖片說明】"
           loading="eager">
    </div>
  </section>

  <!-- ④ 主內容 -->
  <main>
    <div class="content-wrapper">
      <article>

        <!-- 文章 Meta（分類 Badge、作者、日期、瀏覽） -->
        <header class="article-header">
          <div class="article-meta">
            <span class="meta-author"><span class="cat-badge">【分類】</span> 作者：YRCiou</span>
            <span class="meta-date">【YYYY/MM/DD】</span>
            <span class="meta-views">瀏覽：<span class="view-count-display">…</span></span>
          </div>
          <h1 class="article-title">【文章標題（可含 &lt;br&gt; 換行）】</h1>
        </header>

        <!-- Lead（第一段摘要引言） -->
        <p class="lead">【引言文字，帶 <strong> 強調重點】</p>

        <!-- 文章主體 -->
        <h2 class="section-title">【小節標題】</h2>
        <p>正文...</p>

        <!-- 延伸閱讀（固定放在 </article> 前） -->
        <div id="related-posts-section"></div>

      </article>
    </div>
  </main>

  <!-- ⑤ Footer -->
  <footer class="site-footer">
    <div class="container">
      <div class="image-credit">
        <strong>圖片來源：</strong>「<a href="【圖片原始網址】" target="_blank" rel="noopener">【圖片標題】</a>」
        by 【作者名】，
        授權：<a href="【授權網址】" target="_blank" rel="noopener">【CC BY-XX 4.0】</a>
        via <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a>
      </div>
      <!-- 若為自製圖片（CC BY 4.0 自授權）： -->
      <!-- <div class="image-credit">
        封面圖由 YRCiou 製作，授權：<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>
      </div> -->
      <p class="footer-copy">© 2026 YR 運動研究室</p>
    </div>
  </footer>

  <!-- ⑥ Scripts（順序固定） -->
  <script>
    window.SUPABASE_URL      = "https://cpzdyivdciglbhznrlkl.supabase.co";
    window.SUPABASE_ANON_KEY = "sb_publishable_Z_xBTGqVA_YDMdq45Ks9Zg_uPrLF2a0";
    window.PAGE_SLUG         = "【slug】";
    window.PAGE_TITLE        = "【文章標題】";
    window.IS_INDEX          = false;
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script src="assets/blog.js"></script>
  <script src="assets/related.js"></script>
  <script src="assets/search.js"></script>
  <!-- 若有圖表，加在 search.js 後 -->
  <!-- <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script> -->
  <!-- <script>/* 圖表程式碼 */</script> -->
  <script src="assets/theme.js"></script>
</body>
</html>
```

---

### 2. Header（功能列）

| 元素 | 規格 |
|------|------|
| 背景色 | `#111111`（`--c-header-bg`），sticky top，z-index 100 |
| 高度 | 58px（手機 wrap 後自適應）|
| 左側 | favicon.svg（30px）+ "YR 運動研究室"（1.15rem bold）|
| 中間 | `<div class="header-spacer">` 彈性空白 |
| 右側順序 | 深/淺切換鈕 → 搜尋鈕 → "← 所有文章" 返回連結 |
| 按鈕樣式 | 36×36px，透明底，hover：青綠色邊框 `rgba(34,211,238,.4)` |
| 主題切換圖示 | 淺色模式顯示 🌙（icon-moon），深色模式顯示 ☀️（icon-sun）|

---

### 3. Footer（頁尾）

- 背景：`#1a1a1a`，文字：`#94a3b8`，padding 2rem 0
- **圖片授權行**：`<div class="image-credit">` — 連結色 `#93c5fd`
  - Wikimedia 圖片：`「圖片名稱」by 作者, 授權：CC BY-X.X via Wikimedia Commons`
  - 自製圖片：`封面圖由 YRCiou 製作，授權：CC BY 4.0`
- **版權行**：`<p class="footer-copy">© 2026 YR 運動研究室</p>`

---

### 4. CSS 元件規範（inline `<style>` 統一寫在每篇文章的 `<head>`）

#### 4-1. 子標題 `.section-title`
```css
.section-title {
  font-size: 1.45rem;
  font-weight: 700;
  color: #0f172a;           /* 深色模式由 style.css 覆寫為 #e2e8f0 */
  margin: 2.8rem 0 1rem;
  padding-bottom: .45rem;
  border-bottom: 3px solid #2563eb;  /* 藍色底線 */
}
```

#### 4-2. 引言段落 `.lead`
```css
.lead {
  font-size: 1.1rem;
  color: #475569;
  line-height: 1.8;
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  background: #f0f9ff;          /* 淡藍背景 */
  border-left: 4px solid #38bdf8; /* 青藍左邊線 */
  border-radius: 0 8px 8px 0;
}
```

#### 4-3. 洞察框 `.insight-box`（深藍底，白字）
```css
.insight-box {
  background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
  color: white;
  border-radius: 12px;
  padding: 1.5rem 1.75rem;
  margin: 2rem 0;
}
.insight-box h3     { font-size: 1.1rem; margin-bottom: .6rem; color: #bfdbfe; }
.insight-box p      { font-size: .95rem; line-height: 1.7; margin: 0; }
.insight-box strong { color: #93c5fd; }
```

#### 4-4. 警示框 `.warn-box`（amber 色調）
```css
.warn-box {
  background: #fffbeb;
  border-left: 4px solid #f59e0b;
  border-radius: 0 8px 8px 0;
  padding: 1rem 1.25rem;
  color: #78350f;
  font-size: .95rem;
  line-height: 1.7;
  margin: 1.5rem 0;
}
```

#### 4-5. 表格 `.data-table`（**無直線，淺色系**）
```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2rem 0 1.8rem;
  font-size: .9rem;
}
.data-table th {
  background: #0f172a;          /* 深色表頭 */
  color: #f1f5f9;
  padding: .65rem .9rem;
  text-align: left;
  font-weight: 600;
  border-left: none;            /* 無直線 */
  border-right: none;
}
.data-table td {
  padding: .6rem .9rem;
  border-bottom: 1px solid #e2e8f0;  /* 只有橫線 */
  border-left: none;
  border-right: none;
}
.data-table tr:nth-child(even) td { background: #f8fafc; }
.data-table tr:last-child td      { border-bottom: none; }
```
> **配色規則**：整篇文章中相同的資料項目（同一賽事、同一招式）必須使用相同顏色，
> 顏色一覽：utmb 藍系、ccc 綠系、occ 琥珀系、gray 灰系（比較基準用）。

#### 4-6. 圖表包裝 `.chart-wrap`
```css
.chart-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  box-shadow: 0 2px 12px rgba(0,0,0,.06);
}
.chart-title {
  font-size: .92rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 1rem;
}
.chart-canvas-wrap { position: relative; height: 280px; }
```

#### 4-7. Chart.js 全域設定（每篇有圖表的文章必加）
```javascript
Chart.defaults.font.family = "system-ui, -apple-system, sans-serif";
Chart.defaults.color = '#64748b';

// 柔和色盤（降飽和度），全站統一
const C = {
  utmb: { bg:'rgba(100,130,200,.6)',  bd:'#8099c8' },
  ccc:  { bg:'rgba(72,158,128,.6)',   bd:'#5aaa8c' },
  occ:  { bg:'rgba(205,138,75,.6)',   bd:'#c8905a' },
  gray: { bg:'rgba(160,172,185,.45)', bd:'#a0acb9' }
};

// 所有圖表無格線（共用設定）
const noGrid = {
  x: { grid:{ display:false }, border:{ display:false } },
  y: { grid:{ display:false }, border:{ display:false } }
};
```

---

### 5. 文字大小與顏色規範

| 元素 | 字體 | 大小 | 顏色（淺色/深色）|
|------|------|------|------|
| 文章標題 H1 | serif（Georgia） | clamp(1.6rem, 4vw, 2.4rem) | `#1e293b` / `#e2e8f0` |
| 子標題 `.section-title` | sans | 1.45rem bold | `#0f172a` / `#e2e8f0` |
| 正文 `<p>` | sans | 1rem, line-height 1.7 | `#1e293b` / `#e2e8f0` |
| Lead 引言 | sans | 1.1rem, line-height 1.8 | `#475569` / `#cbd5e1` |
| 表格正文 | sans | .9rem | `#1e293b` / `#cbd5e1` |
| 小字備注 | sans | .78–.85rem | `#94a3b8` |
| Meta（作者/日期/瀏覽）| sans | .84rem | `#64748b`（`--c-muted`）|
| 連結 | — | 繼承 | `#2563eb` / `#38bdf8` |

---

### 6. 縮圖與圖片規範

#### OG / 首頁縮圖（必讀）
- 規格：**1200 × 630 px**，JPEG，存於 `assets/og-【slug】.jpg`
- 自架於 GitHub Pages（不能用 Wikimedia，爬蟲會封鎖）
- **FB / Messenger / LINE 分享預覽必須能看到完整清晰的文字內容**
  - 圖中文字需大於 30pt、高對比背景

#### 尋圖決策流程
1. **有合適照片**：使用 Wikimedia Commons CC 授權圖片（絕對 URL，例：`https://upload.wikimedia.org/…/1280px-xxx.jpg`）。在 `posts-data.json` 填 `hero.url`（大圖）與 `hero.thumbUrl`（640px 縮圖）。**但 OG 圖仍需自製 1200×630 JPEG**。
2. **找不到合適照片**：自製 SVG 向量插圖（可放在 `assets/` 或文章資料夾內），並以此做 OG 圖（轉 1200×630 JPEG 或直接以 SVG 繪製含文字的圖）。

#### 首頁縮圖呈現
- 高度 190px，`object-fit: cover`
- 若主體在圖片左側，加 `style="object-position: left center"` 避免被裁切
- 首頁縮圖由 `posts-data.json` 的 `hero.thumbUrl` 驅動，修改此欄位即自動同步

---

### 7. CC 授權標示（頁尾）

**Wikimedia 圖片**（最常見）：
```html
<div class="image-credit">
  <strong>圖片來源：</strong>「<a href="https://commons.wikimedia.org/wiki/File:XXX" target="_blank" rel="noopener">圖片原標題</a>」
  by 作者名，
  授權：<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>
  via <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a>
</div>
```

**自製圖片**：
```html
<div class="image-credit">
  封面圖由 YRCiou 製作，授權：<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>
</div>
```

---

### 8. 標籤、作者、日期、瀏覽

```html
<header class="article-header">
  <div class="article-meta">
    <span class="meta-author"><span class="cat-badge">越野</span> 作者：YRCiou</span>
    <span class="meta-date">2026/04/08</span>
    <span class="meta-views">瀏覽：<span class="view-count-display">…</span></span>
  </div>
  <h1 class="article-title">文章標題</h1>
</header>
```
- `.cat-badge`：小方框徽章（outline 樣式），顯示分類（如「越野」「巴柔」）
- 日期格式：`YYYY/MM/DD`
- 瀏覽數：由 `blog.js` 從 Supabase 填入，載入前顯示 shimmer 動畫

---

### 9. 延伸閱讀

**HTML（固定放在 `</article>` 標籤前）：**
```html
<div id="related-posts-section"></div>
```

**運作方式**（`assets/related.js` 自動處理）：
- 從 `posts-data.json` 讀取所有文章
- 依拓撲主題層級評分排序，最多顯示 **5 篇**
- 評分 = 主題相似度 + 關鍵字重疊×12 + 同分類+30 + 熱門度（Supabase）+ 時效+5 + 優先級×3
- 卡片樣式：橫列（縮圖 110×74px + 分類徽章 + 標題 + 摘要前 65 字）

---

### 10. 表格規範（補充）

- **無直線**：`td` 不設 `border-left` / `border-right`，只保留 `border-bottom`
- **配色淺色系**：表頭用深色（`#0f172a`），奇偶行交替（白 / `#f8fafc`）
- **全文一致**：同一篇文章中相同資料（同一賽事/招式）必須用相同顏色，不可在不同表格或圖表中換色
- **強調行**：最佳行加 `.highlight-best`（`#ecfdf5` 綠）、最差行加 `.highlight-worst`（`#fff1f2` 紅）

---

## 新文章標準流程

1. 在 `posts/` 新增資料夾（名稱 = slug），複製最近一篇文章的 HTML 結構
2. 依「HTML 頁面骨架」章節填入所有 meta 資訊
3. 準備 OG 圖片：**1200×630 JPEG**，存於 `assets/og-【slug】.jpg`
4. **在 `posts-data.json` 新增文章物件**（必填欄位）：
   ```json
   {
     "slug": "article-slug",
     "title": "文章標題",
     "author": "YRCiou",
     "topic": "英文關鍵字串（舊欄位相容性保留）",
     "topics": ["most-specific", "specific", "category", "broad", "broader", "sports"],
     "keywords": ["關鍵字1", "關鍵字2", "中英文均可"],
     "priority": 1,
     "excerpt": "文章摘要（150字以內）",
     "createdAt": "2026-04-XX T10:00:00.000Z",
     "updatedAt": "2026-04-XX T10:00:00.000Z",
     "category": "分類名稱",
     "customHtml": true,
     "hero": {
       "url": "https://yrciou.github.io/sportsblog/assets/og-【slug】.jpg",
       "thumbUrl": "https://yrciou.github.io/sportsblog/assets/og-【slug】.jpg",
       "title": "圖片標題",
       "author": "作者",
       "sourceUrl": "圖片原始網址",
       "license": "CC BY 4.0",
       "licenseUrl": "https://creativecommons.org/licenses/by/4.0/"
     }
   }
   ```
5. 執行 `node scripts/sync-homepage.js`（或 push 後 GitHub Actions 自動執行）
6. 更新 `sitemap.xml`
7. `git add . && git commit -m "feat: 新增文章《標題》" && git push origin main`

### topics[] 設計原則
由最具體到最通用排列，最多 7 個。延伸閱讀演算法對越前面（越具體）的共同主題給予越高分：

| 位置 | 權重 | 範例 |
|------|------|------|
| 0（最具體）| 200 | `"utmb-lottery"` / `"bjj-finishing"` |
| 1 | 100 | `"utmb"` / `"bjj"` |
| 2 | 50 | `"trail-running"` / `"grappling"` |
| 3 | 25 | `"ultra-marathon"` / `"martial-arts"` |
| 4 | 12 | `"endurance-sports"` / `"sports-injury"` |
| 5 | 5 | `"travel-sports"` / `"sports-medicine"` |
| 6（最通用）| 2 | `"sports"` |

### 延伸閱讀評分說明（`assets/related.js`）
| 維度 | 計算方式 | 最高分 |
|------|----------|--------|
| 主題相似度 | Σ √(w[i]×w[j])，w = [200,100,50,25,12,5,2] | 無上限 |
| 關鍵字重疊 | 共同 keywords × 12 | 無上限 |
| 同分類加分 | +30 | 30 |
| 熱門度（Supabase views） | min(25, log₂(views+1)×3) | 25 |
| 時效加分 | 發布 90 天內 +5 | 5 |
| 優先級加分 | priority × 3 | — |

最多顯示 5 篇；score = 0 的文章（完全不相關）不顯示。

---

## 已完成的 SEO 設定
- 每頁均有：canonical、og:title/description/image、twitter:card、JSON-LD (BlogPosting)
- OG 圖片比例：**1200×630**（1.91:1，Facebook/Messenger 標準）
- OG 圖片自架於 GitHub Pages（避免 Wikimedia 爬蟲封鎖）
- favicon 提供 SVG + PNG（32/48/192px），Google 需要 PNG
- sitemap.xml 已提交 Google Search Console

---

## 常用指令
```bash
# 新電腦初始化
git clone https://github.com/YRCiou/sportsblog.git
cd sportsblog
npm install

# 部署（push 即上線）
git add .
git commit -m "說明"
git push origin main

# 同步首頁卡片（修改 posts-data.json 後執行）
node scripts/sync-homepage.js

# 產生 PNG favicon（需要 @resvg/resvg-js）
node -e "const {Resvg}=require('@resvg/resvg-js'),fs=require('fs'),svg=fs.readFileSync('assets/favicon.svg','utf8');[192,48,32].forEach(s=>{const r=new Resvg(svg,{fitTo:{mode:'width',value:s}});fs.writeFileSync('assets/favicon-'+s+'.png',r.render().asPng())})"
```

---

## Telegram 橋接（舊電腦專用）
- 腳本：`C:/Users/Innovarad/.claude/telegram-bridge.js`
- 以 PM2 常駐：`pm2 list`、`pm2 restart claude-telegram`
- Hook timeout：70 秒（PreToolUse 等待 Telegram 回覆 60 秒後自動允許）
- Claude CLI 需 Node.js v20+（舊電腦曾因 v18 導致 `Symbol.dispose` 錯誤）

---

## 注意事項
- 圖片比例務必 1200×630，否則 Messenger 不顯示預覽圖
- 修改 OG 圖後需至 [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) 按「Scrape Again」清除快取
- `fb:app_id` 警告可忽略（純內容網站不需要）
- Google favicon 需 PNG，不接受 SVG
- 深色模式若新增了硬碼顏色元件（如 `.race-card` 等），記得在 `style.css` 末尾加對應的 `[data-theme="dark"]` 覆寫規則
