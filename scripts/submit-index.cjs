#!/usr/bin/env node
/**
 * submit-index.cjs
 * 每次 push 後執行：IndexNow → 提交所有 URL 給 Bing / Yandex
 * （Google /ping 已於 2023/06 關閉，改以 IndexNow 涵蓋）
 */

const https = require('https');

const BASE = 'https://yrciou.github.io/sportsblog';
const KEY  = 'fc0e57279ffa418d95e4f9618d4f6d44';

const URLS = [
  `${BASE}/`,
  `${BASE}/posts/faraway-40k/`,
  `${BASE}/posts/taojin-trail-30k/`,
  `${BASE}/posts/taojin-trail-20k/`,
  `${BASE}/posts/zhaocha-trail-12k/`,
  `${BASE}/posts/bjj-finishing-moves/`,
  `${BASE}/posts/bjj-toe-injuries/`,
  `${BASE}/posts/utmb-world-events/`,
  `${BASE}/posts/utmb-lottery-odds/`,
];

function post(hostname, path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const ts = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  console.log(`\n🚀 IndexNow 提交（${ts}）`);
  console.log(`   ${URLS.length} 個 URL → api.indexnow.org`);

  const res = await post('api.indexnow.org', '/indexnow', {
    host:        'yrciou.github.io',
    key:         KEY,
    keyLocation: `${BASE}/${KEY}.txt`,
    urlList:     URLS,
  });

  if (res.status === 200 || res.status === 202) {
    console.log(`✅ 成功（HTTP ${res.status}）\n`);
  } else {
    console.log(`⚠️  HTTP ${res.status}: ${res.body}\n`);
    process.exit(1);
  }
})();
