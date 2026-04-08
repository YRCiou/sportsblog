#!/usr/bin/env node
/**
 * 一鍵上線腳本（使用 Netlify CLI）
 * 用法：node deploy.js
 *
 * 首次執行會引導你完成：
 *   1. Netlify 登入（開啟瀏覽器授權）
 *   2. 建立或連結站台
 *   3. 部署到 production
 *
 * 後續每次執行只需一行：node deploy.js
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function run(cmd, opts = {}) {
  return spawnSync(cmd, { shell: true, stdio: 'inherit', cwd: __dirname, ...opts });
}

function runCapture(cmd) {
  try { return execSync(cmd, { cwd: __dirname, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }); }
  catch { return ''; }
}

console.log('\n🚀  UTMB 跑步研究室 — 一鍵上線\n');

// ── 先重新產生所有 HTML + sitemap ─────────────────────────────
console.log('📄  重新產生靜態檔案…');
run('node regenerate.js');
run('node generate-sitemap.js');

// ── 確認 Netlify CLI 已安裝 ───────────────────────────────────
const netlifyPath = runCapture('npx netlify --version');
if (!netlifyPath.includes('netlify-cli')) {
  console.log('📦  安裝 netlify-cli…');
  run('npm install -g netlify-cli');
}

// ── 確認登入狀態 ──────────────────────────────────────────────
const status = runCapture('npx netlify status');
if (!status.includes('Logged in')) {
  console.log('\n🔑  尚未登入 Netlify，即將開啟瀏覽器授權…');
  run('npx netlify login');
}

// ── 確認站台已初始化（.netlify/state.json）────────────────────
if (!existsSync(join(__dirname, '.netlify', 'state.json'))) {
  console.log('\n🌐  尚未連結站台，開始初始化…');
  console.log('    （選擇「Create & configure a new site」建立新站台）\n');
  run('npx netlify init');
}

// ── 部署到 production ─────────────────────────────────────────
console.log('\n🌍  部署中…');
const result = run('npx netlify deploy --prod --dir .');

if (result.status === 0) {
  console.log('\n✅  部署成功！網站已上線。');
  console.log('    執行 npx netlify open 可直接開啟瀏覽器查看。\n');
} else {
  console.error('\n❌  部署失敗，請查看上方錯誤訊息。\n');
  process.exit(1);
}
