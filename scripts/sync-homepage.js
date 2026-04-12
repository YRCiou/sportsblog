/**
 * sync-homepage.js
 *
 * 從 posts-data.json 讀取所有文章資料，
 * 自動更新 index.html 內 <!-- CARDS_START --> 與 <!-- CARDS_END --> 之間的卡片 HTML。
 *
 * 使用方式：
 *   node scripts/sync-homepage.js
 *
 * 自動化：
 *   GitHub Actions 在每次 push 時執行此腳本，確保首頁圖片與 posts-data.json 保持同步。
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

/* ── 產生卡片 HTML ────────────────────────────────────── */
function renderCard(post) {
  const imgSrc  = escHtml(post.hero?.url ?? post.hero?.thumbUrl ?? '');
  const imgAlt  = escHtml(post.title);
  const href    = `./posts/${escHtml(post.slug)}/`;
  const date    = formatDate(post.createdAt);
  const excerpt = escHtml(post.excerpt ?? '');
  const slug    = escHtml(post.slug);
  const title   = escHtml(post.title);
  const cat     = escHtml(post.category ?? '');

  return `    <article class="post-card" data-slug="${slug}" data-category="${cat}">
      <a href="${href}" class="card-link">
        <div class="card-image"><img src="${imgSrc}" alt="${imgAlt}" loading="lazy"></div>
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

/* ── 更新 index.html ─────────────────────────────────── */
const START_MARKER = '<!-- CARDS_START -->';
const END_MARKER   = '<!-- CARDS_END -->';

let html = fs.readFileSync(indexPath, 'utf8');

const startIdx = html.indexOf(START_MARKER);
const endIdx   = html.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
  console.error('❌ index.html 中找不到 <!-- CARDS_START --> 或 <!-- CARDS_END --> 標記');
  process.exit(1);
}

const newCards = '\n' + posts.map(renderCard).join('\n\n') + '\n    ';
const newHtml  = html.slice(0, startIdx + START_MARKER.length)
               + newCards
               + html.slice(endIdx);

/* ── 同步文章數量 ────────────────────────────────────── */
const updatedHtml = newHtml.replace(
  /(<span class="post-count">)\d+( 篇<\/span>)/,
  `$1${posts.length}$2`
);

fs.writeFileSync(indexPath, updatedHtml, 'utf8');
console.log(`✅ index.html 已同步 ${posts.length} 篇文章卡片`);
