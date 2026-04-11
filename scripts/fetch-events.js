#!/usr/bin/env node
/**
 * fetch-events.js
 * 每日自動更新 UTMB 世界賽事 + 從台灣出發的最便宜機票
 * 執行時間：每天台灣時間凌晨 3 點（UTC 19:00）
 *
 * 需要的環境變數：
 *   TRAVELPAYOUTS_TOKEN  - Travelpayouts Data API token（免費，聯盟帳號取得）
 */

import https from 'https';
import fs    from 'fs';
import path  from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_FILE     = path.join(__dirname, '..', 'data', 'events.json');
const ORIGIN        = 'TPE';
const WINDOW_MONTHS = 10;

// ─── 工具函式 ────────────────────────────────────────────────────────────────

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UTMBEventBot/1.0)',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout: 20000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, options).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// YYMMDD format for Skyscanner deep link
function toYYMMDD(dateStr) {
  return dateStr.replace(/-/g, '').slice(2);
}

// YYYY-MM format for Travelpayouts monthly query
function toYYYYMM(dateStr) {
  return dateStr.slice(0, 7);
}

function isWithinWindow(dateStart) {
  const now   = new Date();
  const start = new Date(dateStart);
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() + WINDOW_MONTHS);
  return start >= now && start <= limit;
}

// ─── Skyscanner 深層連結 ─────────────────────────────────────────────────────

function buildSkyscannerUrl(dest, dateStart, dateEnd) {
  const outDate = toYYMMDD(addDays(dateStart, -3));
  const retDate = toYYMMDD(addDays(dateEnd || dateStart, 2));
  return `https://www.skyscanner.com.tw/transport/flights/tpe/${dest.toLowerCase()}/${outDate}/${retDate}/?adults=1&cabinclass=economy`;
}

// ─── UTMB 官網賽事抓取 ───────────────────────────────────────────────────────

async function fetchUtmbEvents() {
  console.log('[UTMB] 抓取官網賽事資料...');
  try {
    const { body } = await fetchUrl('https://utmb.world/utmb-world-series-events');
    const match = body.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) { console.warn('[UTMB] 找不到 __NEXT_DATA__'); return null; }

    const props = JSON.parse(match[1])?.props?.pageProps;
    let rawEvents = null;
    for (const key of ['events', 'races', 'data', 'items', 'worldSeriesEvents']) {
      if (Array.isArray(props?.[key]))        { rawEvents = props[key]; break; }
      if (Array.isArray(props?.data?.[key]))  { rawEvents = props.data[key]; break; }
    }
    if (!rawEvents?.length) { console.warn('[UTMB] 無法解析賽事陣列'); return null; }

    console.log(`[UTMB] 取得 ${rawEvents.length} 筆賽事（篩選前）`);
    return rawEvents.map(e => ({
      name:      e.name || e.title || e.eventName,
      dateStart: (e.startDate || e.date || '').slice(0, 10),
      dateEnd:   (e.endDate   || e.date || '').slice(0, 10),
    })).filter(e => e.dateStart && isWithinWindow(e.dateStart));
  } catch (err) {
    console.warn('[UTMB] 抓取失敗：', err.message);
    return null;
  }
}

// ─── Travelpayouts 機票查詢 ──────────────────────────────────────────────────
// API 文件：https://support.travelpayouts.com/hc/en-us/articles/203956163
// 回傳：指定月份 TPE→目的地 最低來回票價（快取資料，非即時）

async function getFlightPrice(dest, dateStart, dateEnd, token) {
  try {
    const departMonth = toYYYYMM(addDays(dateStart, -3));
    const returnMonth = toYYYYMM(addDays(dateEnd || dateStart, 2));

    const url = `https://api.travelpayouts.com/v1/prices/cheap` +
      `?origin=${ORIGIN}` +
      `&destination=${dest}` +
      `&depart_date=${departMonth}` +
      `&return_date=${returnMonth}` +
      `&currency=twd` +
      `&token=${token}`;

    const { statusCode, body } = await fetchUrl(url);

    if (statusCode !== 200) {
      console.warn(`  [TP] ${dest} HTTP ${statusCode}`);
      return null;
    }

    const json = JSON.parse(body);
    if (!json.success || !json.data) return null;

    // 資料結構：{ data: { "DEST": { "0": { price, ... }, "1": {...} } } }
    const destData = json.data[dest] || json.data[dest.toUpperCase()];
    if (!destData) return null;

    // 取所有轉機數中的最低價
    const prices = Object.values(destData)
      .map(entry => Number(entry.price))
      .filter(p => p > 0);

    return prices.length ? Math.min(...prices) : null;
  } catch (err) {
    console.warn(`  [TP] ${dest} 查詢失敗：`, err.message);
    return null;
  }
}

// ─── 主程式 ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== UTMB Event Fetcher 開始執行 ===');
  console.log('更新時間：', new Date().toISOString());

  // 讀入現有資料
  const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  // 嘗試從 UTMB 官網更新賽事日期
  const liveEvents = await fetchUtmbEvents();
  if (liveEvents) {
    for (const live of liveEvents) {
      const match = existing.events.find(e =>
        e.name.toLowerCase().includes((live.name || '').toLowerCase().slice(0, 20))
      );
      if (match) {
        if (live.dateStart) match.dateStart = live.dateStart;
        if (live.dateEnd)   match.dateEnd   = live.dateEnd;
        console.log(`[UTMB] 已更新日期：${match.name}`);
      }
    }
  }

  // 篩選未來 10 個月的賽事
  const upcoming = existing.events.filter(e => isWithinWindow(e.dateStart));
  console.log(`[Filter] 未來 ${WINDOW_MONTHS} 個月共 ${upcoming.length} 場賽事\n`);

  // Travelpayouts token
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    console.log('[TP] 未設定 TRAVELPAYOUTS_TOKEN，跳過機票查詢（使用 Skyscanner 連結）');
  } else {
    console.log('[TP] 開始查詢 Travelpayouts 機票快取...');
  }

  for (const ev of upcoming) {
    // 每場賽事都要有 Skyscanner 連結（備援）
    ev.flightUrl = buildSkyscannerUrl(ev.nearestAirport, ev.dateStart, ev.dateEnd);

    if (token) {
      const price = await getFlightPrice(
        ev.nearestAirport,
        ev.dateStart,
        ev.dateEnd,
        token
      );

      if (price !== null) {
        ev.flightPrice   = Math.round(price);
        ev.flightUpdated = new Date().toISOString();
        console.log(`  ✓ ${ev.name.slice(0, 38).padEnd(38)} [${ev.nearestAirport}] → NT$${ev.flightPrice.toLocaleString()}`);
      } else {
        // 查不到時清除舊資料（超過 7 天的票價不可靠）
        const age = ev.flightUpdated
          ? (Date.now() - new Date(ev.flightUpdated)) / 86400000
          : 999;
        if (age > 7) ev.flightPrice = null;
        console.log(`  – ${ev.name.slice(0, 38).padEnd(38)} [${ev.nearestAirport}] → 無快取資料`);
      }

      // 每次查詢間隔 300ms，避免打太快
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // 寫回 JSON（保留 7 天緩衝，讓剛結束的賽事還顯示幾天）
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const finalEvents = existing.events.filter(e => new Date(e.dateStart) >= cutoff);

  const output = {
    updated: new Date().toISOString(),
    source:  'utmb.world + travelpayouts.com',
    events:  finalEvents
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n=== 完成！共 ${finalEvents.length} 場賽事已寫入 data/events.json ===`);
}

main().catch(err => {
  console.error('執行失敗：', err);
  process.exit(1);
});
