#!/usr/bin/env node
/**
 * telegram-confirm.js — PreToolUse hook
 * 當 Claude 要執行寫入/修改/指令時，先傳 Telegram 詢問確認。
 * 回覆 y / 確認 → 繼續；回覆 n / 取消 → 阻擋。
 * 超時（60 秒）→ 自動確認。
 *
 * ── 自動模式（不等待，立即允許）──────────────────────────
 * 以下情況直接放行（仍傳送通知）：
 *   1. 夜間排程視窗：台灣時間 01:00–03:30（UTC 17:00–19:30）
 *   2. 代理人旗標：TEMP/yr-agent-auto.flag 檔案存在
 *   3. Telegram Bridge：TELEGRAM_BRIDGE=1 環境變數
 *   4. 旗標管理指令：包含 yr-agent-auto.flag 的 Bash 指令（雞生蛋問題解法）
 */

const https   = require('https');
const fs      = require('fs');
const os      = require('os');
const path    = require('path');

const BOT_TOKEN   = '8688563575:AAFru1BjEZWX8Sv9ONgjz7Mn0xzaUIr0LwQ';
const CHAT_ID     = '1008016537';
const TIMEOUT_SEC = 60;
const OFFSET_FILE = path.join(os.tmpdir(), 'claude-tg-confirm-offset.txt');
const AUTO_FLAG   = path.join(os.tmpdir(), 'yr-agent-auto.flag');

// 只有這些工具需要確認（Read/Glob/Grep 等不需要）
const CONFIRM_TOOLS = new Set(['Bash', 'Write', 'Edit', 'MultiEdit']);

// ── 自動模式判斷 ───────────────────────────────────────────

/** 台灣時間 01:00–03:30 = UTC 17:00–19:30（夜間排程視窗）*/
function isNightScheduleWindow() {
  const now    = new Date();
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  return utcMin >= 17 * 60 && utcMin <= 19 * 60 + 30;
}

/** 代理人旗標檔案是否存在 */
function isAgentFlagSet() {
  try { return fs.existsSync(AUTO_FLAG); } catch { return false; }
}

// ── Telegram API ───────────────────────────────────────────

function tgRequest(method, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try { resolve(JSON.parse(b)); }
        catch { resolve({}); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function sendMessage(text) {
  return tgRequest('sendMessage', { chat_id: CHAT_ID, text, parse_mode: 'HTML' });
}

// ── Offset 管理（避免讀到舊訊息）──────────────────────────

function getOffset() {
  try { return parseInt(fs.readFileSync(OFFSET_FILE, 'utf8')) || 0; }
  catch { return 0; }
}

function saveOffset(offset) {
  try { fs.writeFileSync(OFFSET_FILE, String(offset)); } catch {}
}

// ── 等待 Telegram 回覆 ─────────────────────────────────────

async function waitForReply(timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  let offset = getOffset();
  try {
    const flush = await tgRequest('getUpdates', { offset, limit: 100, timeout: 0 });
    if (flush.result && flush.result.length > 0) {
      offset = flush.result[flush.result.length - 1].update_id + 1;
      saveOffset(offset);
    }
  } catch {}

  while (Date.now() < deadline) {
    const remaining = Math.floor((deadline - Date.now()) / 1000);
    if (remaining <= 0) break;
    const pollSec = Math.min(30, remaining);

    try {
      const res = await tgRequest('getUpdates', {
        offset,
        limit: 1,
        timeout: pollSec,
        allowed_updates: ['message']
      });

      if (res.result && res.result.length > 0) {
        const update = res.result[0];
        offset = update.update_id + 1;
        saveOffset(offset);

        const msg = update.message;
        if (msg && String(msg.chat.id) === CHAT_ID && msg.text) {
          return msg.text.trim();
        }
      }
    } catch {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return null;
}

// ── 主程式 ─────────────────────────────────────────────────

async function main() {
  // ① Telegram Bridge → 直接允許
  if (process.env.TELEGRAM_BRIDGE === '1') {
    process.exit(0);
  }

  let raw = '';
  process.stdin.on('data', d => raw += d);
  await new Promise(resolve => process.stdin.on('end', resolve));

  let data;
  try { data = JSON.parse(raw); }
  catch { process.exit(0); }

  const toolName  = data.tool_name  || '';
  const toolInput = data.tool_input || {};

  // 不在確認清單 → 直接允許
  if (!CONFIRM_TOOLS.has(toolName)) {
    process.exit(0);
  }

  // ② 旗標管理指令本身永遠放行（雞生蛋問題解法）
  if (toolName === 'Bash' && (toolInput.command || '').includes('yr-agent-auto.flag')) {
    process.exit(0);
  }

  // 組通知訊息片段
  let snippet = '';
  if (toolName === 'Bash')                          snippet = (toolInput.command   || '').slice(0, 300);
  else if (toolName === 'Write')                    snippet = (toolInput.file_path || '').slice(0, 200);
  else if (toolName === 'Edit' || toolName === 'MultiEdit') snippet = (toolInput.file_path || '').slice(0, 200);

  // ③ 自動模式：夜間視窗 或 代理人旗標
  const nightMode = isNightScheduleWindow();
  const flagMode  = isAgentFlagSet();

  if (nightMode || flagMode) {
    const label = flagMode ? '🤖 代理人自動模式' : '🌙 夜間排程自動';
    const msg   = `${label}\n<b>${toolName}</b>\n<code>${snippet}</code>`;
    sendMessage(msg).catch(() => {}); // 非阻塞通知，不等待
    process.exit(0);                  // 立即允許
  }

  // ④ 一般互動模式：傳 Telegram 等確認
  let msg = `⚠️ <b>Claude 要執行：${toolName}</b>\n\n`;

  if (toolName === 'Bash')                           msg += `<code>${snippet}</code>\n\n`;
  else if (toolName === 'Write')                     msg += `📄 新建檔案：<code>${snippet}</code>\n\n`;
  else if (toolName === 'Edit' || toolName === 'MultiEdit') msg += `✏️ 修改檔案：<code>${snippet}</code>\n\n`;

  msg += `回覆 <b>y</b>：立即執行（跳過電腦 UI）\n`;
  msg += `回覆 <b>n</b>：取消此操作\n`;
  msg += `<i>無回覆 ${TIMEOUT_SEC} 秒 → 電腦上的 Claude 確認視窗自動出現</i>`;

  try { await sendMessage(msg); }
  catch { process.exit(0); }

  const reply = await waitForReply(TIMEOUT_SEC * 1000);

  if (reply && /^(n|no|取消|否|cancel)$/i.test(reply)) {
    try { await sendMessage('❌ 已取消此操作'); } catch {}
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: '使用者從 Telegram 取消此操作'
    }));
    process.exit(2);
  } else {
    try {
      if (reply) await sendMessage('✅ 已確認，繼續執行');
      else       await sendMessage('⏱️ 超時，自動確認繼續執行');
    } catch {}
    process.exit(0);
  }
}

main().catch(() => process.exit(0));
