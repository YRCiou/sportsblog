#!/usr/bin/env node
/**
 * 根據 posts-data.json 自動產生 sitemap.xml
 * 在 regenerate.js 與 create-post.js / update-post.js 執行時自動呼叫
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadPosts } from './lib/index-manager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function generateSitemap(config) {
  const { site } = config;
  const base = site.baseUrl.replace(/\/$/, '');
  const posts = loadPosts();
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    `  <url>\n    <loc>${base}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    ...posts.map(p => {
      const date = (p.updatedAt || p.createdAt || today).slice(0, 10);
      return `  <url>\n    <loc>${base}/posts/${p.slug}/</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    })
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  writeFileSync(join(__dirname, 'sitemap.xml'), xml, 'utf8');
  console.log(`[sitemap] 已產生 sitemap.xml（${posts.length + 1} 個 URL）`);
}

// 直接執行時
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let config;
  try { config = (await import('./config.js')).default; }
  catch { console.error('找不到 config.js'); process.exit(1); }
  await generateSitemap(config);
}
