#!/usr/bin/env node
/**
 * 更新現有文章（自動更新「更新日期」並重建首頁）
 *
 * 用法：
 *   node update-post.js <slug>                          # 僅刷新更新時間
 *   node update-post.js <slug> --content content.md    # 更新內容
 *   node update-post.js <slug> --title "新標題"        # 更新標題
 *   node update-post.js <slug> --author "新作者"       # 更新作者
 *   node update-post.js <slug> --excerpt "新摘要"      # 更新摘要
 *   node update-post.js <slug> --refresh-image         # 重新搜尋圖片
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
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
  .usage('用法：node update-post.js <slug> [選項]')
  .option('title',          { type: 'string',  describe: '新標題' })
  .option('author',         { type: 'string',  describe: '新作者' })
  .option('content',        { type: 'string',  describe: '新內容 Markdown 檔案' })
  .option('excerpt',        { type: 'string',  describe: '新摘要' })
  .option('refresh-image',  { type: 'boolean', describe: '重新搜尋 CC BY 圖片', default: false })
  .help().argv;

const slug = argv._[0];
if (!slug) {
  console.error('[錯誤] 請提供文章 slug，例如：node update-post.js my-post');
  process.exit(1);
}

// ─── 載入現有文章 ─────────────────────────────────────────────────────────────
const posts = loadPosts();
const idx   = posts.findIndex(p => p.slug === slug);
if (idx === -1) {
  console.error(`[錯誤] 找不到 slug「${slug}」，請確認 posts-data.json 中存在此文章。`);
  process.exit(1);
}

const meta = posts[idx];

// ─── 讀取現有 content.md ─────────────────────────────────────────────────────
const contentMdPath = join(__dirname, meta.contentMdPath ?? `posts/${slug}/content.md`);
let contentHtml;
if (argv.content) {
  const newPath = argv.content.startsWith('/') ? argv.content : join(process.cwd(), argv.content);
  if (!existsSync(newPath)) {
    console.error(`[錯誤] 找不到：${newPath}`);
    process.exit(1);
  }
  const md = readFileSync(newPath, 'utf8');
  // 覆寫儲存的 content.md
  writeFileSync(contentMdPath, md, 'utf8');
  contentHtml = marked.parse(md);
  console.log('[內容] 已更新內容。');
} else if (existsSync(contentMdPath)) {
  contentHtml = marked.parse(readFileSync(contentMdPath, 'utf8'));
} else {
  console.error(`[錯誤] 找不到內容檔案 ${contentMdPath}，請用 --content 提供新內容。`);
  process.exit(1);
}

// ─── 套用更新 ─────────────────────────────────────────────────────────────────
if (argv.title)   meta.title   = argv.title;
if (argv.author)  meta.author  = argv.author;
if (argv.excerpt) meta.excerpt = argv.excerpt;
meta.updatedAt = new Date().toISOString();

// 重新搜尋圖片
if (argv['refresh-image']) {
  console.log(`[圖片] 重新搜尋主題「${meta.topic}」…`);
  try {
    const img = await searchImage(meta.topic);
    if (img) { meta.hero = img; console.log(`[圖片] 更新為：${img.title} (${img.license})`); }
  } catch (e) {
    console.warn(`[圖片] 搜尋失敗：${e.message}`);
  }
}

// ─── 重新產生文章頁面 ─────────────────────────────────────────────────────────
const fullPost = { ...meta, content: contentHtml };
const articleHtml = generateArticlePage(fullPost, config);
const outPath = join(__dirname, 'posts', slug, 'index.html');
writeFileSync(outPath, articleHtml, 'utf8');
console.log(`[文章] 已重新產生 posts/${slug}/index.html`);

// ─── 儲存 meta & 重建首頁 ─────────────────────────────────────────────────────
posts[idx] = meta;
savePosts(posts);
rebuildIndex(posts, config);

console.log(`
✅ 文章更新完成！
   Slug:    ${slug}
   更新時間: ${meta.updatedAt}
`);
