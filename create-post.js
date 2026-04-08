#!/usr/bin/env node
/**
 * 建立新文章
 *
 * 用法：
 *   node create-post.js --title "文章標題" --author "作者" --topic "ocean" --content content.md
 *   node create-post.js --title "My Post"  --author "Jane" --topic "mountain" --content content.md --slug "my-post"
 *
 * content.md 為 Markdown 格式的文章內容。
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import slugifyLib from 'slugify';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { searchImage } from './lib/wikimedia.js';
import { generateArticlePage } from './lib/templates.js';
import { loadPosts, savePosts, rebuildIndex } from './lib/index-manager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── 載入設定 ─────────────────────────────────────────────────────────────────
let config;
try {
  config = (await import('./config.js')).default;
} catch {
  console.error('[錯誤] 找不到 config.js，請複製 config.example.js 為 config.js 並填入設定。');
  process.exit(1);
}

// ─── 解析參數 ─────────────────────────────────────────────────────────────────
const argv = yargs(hideBin(process.argv))
  .option('title',   { type: 'string', demandOption: true,  describe: '文章標題' })
  .option('author',  { type: 'string',                      describe: '作者名稱' })
  .option('topic',   { type: 'string', demandOption: true,  describe: '圖片搜尋主題（英文效果較佳）' })
  .option('content', { type: 'string', demandOption: true,  describe: 'Markdown 內容檔案路徑' })
  .option('slug',    { type: 'string',                      describe: '自訂 URL slug（選填，預設從標題產生）' })
  .option('excerpt', { type: 'string',                      describe: '文章摘要（選填，預設取內容前段）' })
  .help().argv;

// ─── 產生 slug ────────────────────────────────────────────────────────────────
function makeSlug(title, override) {
  if (override) return override.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const s = slugifyLib(title, { lower: true, strict: true });
  return s || `post-${Date.now()}`;
}

// ─── 取得摘要 ─────────────────────────────────────────────────────────────────
function makeExcerpt(html, override) {
  if (override) return override;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 160) + (text.length > 160 ? '…' : '');
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────
const slug     = makeSlug(argv.title, argv.slug);
const author   = argv.author || config.site.defaultAuthor;
const now      = new Date().toISOString();

// 檢查 slug 是否已存在
const posts = loadPosts();
if (posts.find(p => p.slug === slug)) {
  console.error(`[錯誤] slug「${slug}」已存在，請用 --slug 指定不同名稱，或改用 update-post.js。`);
  process.exit(1);
}

// 讀取內容
const contentPath = argv.content.startsWith('/') ? argv.content : join(process.cwd(), argv.content);
if (!existsSync(contentPath)) {
  console.error(`[錯誤] 找不到內容檔案：${contentPath}`);
  process.exit(1);
}
const markdown = readFileSync(contentPath, 'utf8');
const contentHtml = marked.parse(markdown);
const excerpt = makeExcerpt(contentHtml, argv.excerpt);

// 搜尋圖片
console.log(`[圖片] 正在搜尋主題「${argv.topic}」的 CC BY 圖片…`);
let hero = null;
try {
  hero = await searchImage(argv.topic);
} catch (e) {
  console.warn(`[圖片] 搜尋失敗（${e.message}），將略過圖片。`);
}

// 建立文章資料
const post = {
  slug,
  title: argv.title,
  author,
  topic: argv.topic,
  excerpt,
  content: contentHtml,
  createdAt: now,
  updatedAt: now,
  hero
};

// 寫出文章 HTML
const postDir = join(__dirname, 'posts', slug);
mkdirSync(postDir, { recursive: true });

const articleHtml = generateArticlePage(post, config);
writeFileSync(join(postDir, 'index.html'), articleHtml, 'utf8');

// 複製 content.md 到文章目錄（方便日後編輯）
writeFileSync(join(postDir, 'content.md'), markdown, 'utf8');

// 更新 posts-data.json（不含完整 HTML content，避免 JSON 過大）
const metaPost = { ...post };
delete metaPost.content; // 從 JSON 移除 HTML 內容，保留 MD 路徑
metaPost.contentMdPath = `posts/${slug}/content.md`;

posts.push(metaPost);
savePosts(posts);

// 重建首頁
rebuildIndex(posts, config);

console.log(`
✅ 文章建立完成！
   Slug:    ${slug}
   路徑:    posts/${slug}/index.html
   圖片:    ${hero ? `${hero.title} (${hero.license})` : '（無）'}
`);
