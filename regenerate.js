#!/usr/bin/env node
/**
 * 重新產生所有文章頁面及首頁（不更改任何日期）
 * 用法：node regenerate.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { generateArticlePage } from './lib/templates.js';
import { loadPosts, rebuildIndex } from './lib/index-manager.js';
import { generateSitemap } from './generate-sitemap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let config;
try {
  config = (await import('./config.js')).default;
} catch {
  console.error('[錯誤] 找不到 config.js');
  process.exit(1);
}

const posts = loadPosts();
console.log(`[regen] 共 ${posts.length} 篇文章`);

for (const meta of posts) {
  // customHtml: true → 手工製作的 HTML（含圖表/計算機），跳過自動產生
  if (meta.customHtml) {
    console.log(`[regen] ⊘ 跳過 ${meta.slug}（customHtml，保留手工版）`);
    continue;
  }
  const mdPath = join(__dirname, meta.contentMdPath ?? `posts/${meta.slug}/content.md`);
  if (!existsSync(mdPath)) {
    console.warn(`[regen] 跳過 ${meta.slug}（找不到 content.md）`);
    continue;
  }
  const contentHtml = marked.parse(readFileSync(mdPath, 'utf8'));
  const fullPost = { ...meta, content: contentHtml };
  const html = generateArticlePage(fullPost, config);
  writeFileSync(join(__dirname, 'posts', meta.slug, 'index.html'), html, 'utf8');
  console.log(`[regen] ✓ posts/${meta.slug}/index.html`);
}

rebuildIndex(posts, config);
await generateSitemap(config);
console.log('[regen] 完成！');
