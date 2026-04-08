import { readFileSync, writeFileSync } from 'fs';
import { generateIndexPage } from './templates.js';

const DATA_PATH   = new URL('../posts-data.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const INDEX_PATH  = new URL('../index.html',       import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

export function loadPosts() {
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf8')).posts ?? [];
  } catch {
    return [];
  }
}

export function savePosts(posts) {
  writeFileSync(DATA_PATH, JSON.stringify({ posts }, null, 2), 'utf8');
}

export function rebuildIndex(posts, config) {
  const html = generateIndexPage(posts, config);
  writeFileSync(INDEX_PATH, html, 'utf8');
  console.log(`[index] 已更新 index.html（${posts.length} 篇文章）`);
}
