#!/usr/bin/env node
/**
 * fetch-events.js
 * 每日自動更新 UTMB 世界賽事 + 從台灣出發的最便宜機票
 * 執行時間：每天台灣時間凌晨 3 點（UTC 19:00）
 *
 * 需要的環境變數（可選）：
 *   AMADEUS_API_KEY    - Amadeus for Developers API key
 *   AMADEUS_API_SECRET - Amadeus for Developers API secret
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const DATA_FILE  = path.join(__dirname, '..', 'data', 'events.json');
const ORIGIN     = 'TPE'; // 台灣桃園機場
const WINDOW_MONTHS = 10;  // 未來幾個月

// ─── 工具函式 ────────────────────────────────────────────────────────────────

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UTMBEventBot/1.0)',
        'Accept': 'text/html,application/json,*/*',
        ...options.headers
      },
      timeout: 20000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, options).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function postJson(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      },
      timeout: 20000
    };
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request(options, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: resBody }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatYYMMDD(dateStr) {
  return dateStr.replace(/-/g, '').slice(2); // YYMMDD
}

function isWithinWindow(dateStart) {
  const now   = new Date();
  const start = new Date(dateStart);
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() + WINDOW_MONTHS);
  return start >= now && start <= limit;
}

// ─── 建立 Skyscanner 深層連結 ────────────────────────────────────────────────

function buildSkyscannerUrl(dest, dateStart, dateEnd) {
  const outDate = formatYYMMDD(addDays(dateStart, -3)); // 賽前 3 天出發
  const retDate = formatYYMMDD(addDays(dateEnd,   2));  // 賽後 2 天回程
  return `https://www.skyscanner.com.tw/transport/flights/tpe/${dest.toLowerCase()}/${outDate}/${retDate}/?adults=1&cabinclass=economy`;
}

// ─── UTMB 賽事抓取 ───────────────────────────────────────────────────────────

async function fetchUtmbEvents() {
  console.log('[UTMB] 抓取官網賽事資料...');
  try {
    const { body } = await fetchUrl('https://utmb.world/utmb-world-series-events');

    // 嘗試從 Next.js __NEXT_DATA__ 提取 JSON
    const match = body.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) {
      console.warn('[UTMB] 找不到 __NEXT_DATA__，使用本地資料');
      return null;
    }

    const nextData = JSON.parse(match[1]);

    // 巡覽 pageProps 尋找賽事陣列（結構可能隨版本變動）
    const props = nextData?.props?.pageProps;
    const possibleKeys = ['events', 'races', 'data', 'items', 'worldSeriesEvents'];
    let rawEvents = null;

    for (const key of possibleKeys) {
      if (Array.isArray(props?.[key])) { rawEvents = props[key]; break; }
      if (Array.isArray(props?.data?.[key])) { rawEvents = props.data[key]; break; }
    }

    if (!rawEvents || rawEvents.length === 0) {
      console.warn('[UTMB] 無法解析賽事陣列，使用本地資料');
      return null;
    }

    console.log(`[UTMB] 取得 ${rawEvents.length} 筆賽事（篩選前）`);

    // 將官網資料映射回本地格式（維持 lat/lng/airport 等欄位不變）
    return rawEvents.map(e => ({
      name: e.name || e.title || e.eventName,
      dateStart: (e.startDate || e.date || '').slice(0, 10),
      dateEnd:   (e.endDate   || e.date || '').slice(0, 10),
      city:      e.city || e.location?.city,
      country:   e.country || e.location?.country,
    })).filter(e => e.dateStart && isWithinWindow(e.dateStart));
  } catch (err) {
    console.warn('[UTMB] 抓取失敗：', err.message);
    return null;
  }
}

// ─── Amadeus 機票搜尋 ────────────────────────────────────────────────────────

let amadeusToken    = null;
let amadeusTokenExp = 0;

async function getAmadeusToken(apiKey, apiSecret) {
  if (amadeusToken && Date.now() < amadeusTokenExp) return amadeusToken;

  const body   = `grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`;
  const parsed = new URL('https://test.api.amadeus.com/v1/security/oauth2/token');

  const res = await new Promise((resolve, reject) => {
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ statusCode: r.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  const data = JSON.parse(res.body);
  if (!data.access_token) throw new Error('Amadeus token error: ' + res.body);
  amadeusToken    = data.access_token;
  amadeusTokenExp = Date.now() + (data.expires_in - 60) * 1000;
  return amadeusToken;
}

async function getFlightPrice(dest, dateStart, dateEnd, apiKey, apiSecret) {
  try {
    const token = await getAmadeusToken(apiKey, apiSecret);
    const outDate = addDays(dateStart, -3);
    const retDate = addDays(dateEnd,    2);

    const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${ORIGIN}&destinationLocationCode=${dest}&departureDate=${outDate}&returnDate=${retDate}&adults=1&max=5&currencyCode=TWD`;
    const { statusCode, body } = await fetchUrl(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (statusCode !== 200) {
      console.warn(`[Amadeus] ${dest} HTTP ${statusCode}`);
      return null;
    }

    const data = JSON.parse(body);
    const offers = data?.data || [];
    if (offers.length === 0) return null;

    const prices = offers.map(o => parseFloat(o.price?.grandTotal)).filter(p => !isNaN(p));
    return prices.length ? Math.min(...prices) : null;
  } catch (err) {
    console.warn(`[Amadeus] ${dest} 查詢失敗：`, err.message);
    return null;
  }
}

// ─── 主程式 ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== UTMB Event Fetcher 開始執行 ===');
  console.log('更新時間：', new Date().toISOString());

  // 讀入現有資料
  const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const eventMap  = {};
  for (const e of existing.events) eventMap[e.id] = e;

  // 嘗試抓取最新官網資料，更新 name/date 等欄位（保留 lat/lng/airport）
  const liveEvents = await fetchUtmbEvents();
  if (liveEvents) {
    for (const live of liveEvents) {
      const match = existing.events.find(e =>
        e.name.toLowerCase().includes((live.name || '').toLowerCase().slice(0, 20))
      );
      if (match) {
        if (live.dateStart) match.dateStart = live.dateStart;
        if (live.dateEnd)   match.dateEnd   = live.dateEnd;
        console.log(`[UTMB] 已更新：${match.name}`);
      }
    }
  }

  // 篩選出「未來 10 個月」的賽事
  const upcoming = existing.events.filter(e => isWithinWindow(e.dateStart));
  console.log(`[Filter] 未來 ${WINDOW_MONTHS} 個月共 ${upcoming.length} 場賽事`);

  // 機票查詢
  const apiKey    = process.env.AMADEUS_API_KEY;
  const apiSecret = process.env.AMADEUS_API_SECRET;
  const hasAmadeus = !!(apiKey && apiSecret);

  if (hasAmadeus) {
    console.log('[Amadeus] API 已設定，開始查詢機票...');
  } else {
    console.log('[Amadeus] 未設定 API key，跳過機票查詢（使用 Skyscanner 連結）');
  }

  for (const ev of upcoming) {
    // 建立 Skyscanner 連結（無論有沒有 Amadeus 都要有）
    ev.flightUrl = buildSkyscannerUrl(ev.nearestAirport, ev.dateStart, ev.dateEnd);

    if (hasAmadeus) {
      const price = await getFlightPrice(
        ev.nearestAirport,
        ev.dateStart,
        ev.dateEnd,
        apiKey,
        apiSecret
      );
      if (price !== null) {
        ev.flightPrice   = Math.round(price);
        ev.flightUpdated = new Date().toISOString();
        console.log(`  ✓ ${ev.name.slice(0, 40).padEnd(40)} → NT$${ev.flightPrice.toLocaleString()}`);
      } else {
        console.log(`  ✗ ${ev.name.slice(0, 40).padEnd(40)} → 無法取得`);
      }
      // 避免過快打 API
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // 寫回 data/events.json（只保留未來 10 個月 + 已過期事件保留 7 天緩衝）
  const buffer7d = new Date();
  buffer7d.setDate(buffer7d.getDate() - 7);

  const finalEvents = existing.events.filter(e => new Date(e.dateStart) >= buffer7d);

  const output = {
    updated: new Date().toISOString(),
    source:  'utmb.world',
    events:  finalEvents
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n=== 完成！共 ${finalEvents.length} 場賽事已寫入 data/events.json ===`);
}

main().catch(err => {
  console.error('執行失敗：', err);
  process.exit(1);
});
