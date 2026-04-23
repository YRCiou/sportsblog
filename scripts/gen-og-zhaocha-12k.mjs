// Generate OG 1200x630 JPEG from GPX track + stats.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Resvg } = require('D:/claude/sportsblog/node_modules/@resvg/resvg-js');
const sharp = require('D:/claude/sportsblog/node_modules/sharp');

const data = JSON.parse(fs.readFileSync('data/zhaocha-12k-analysis.json', 'utf8'));
const OUT_JPG = path.join('assets', 'og-zhaocha-12k.jpg');

// Build elevation profile polyline within a box
const W = 1200, H = 630;
const pad = { l: 620, r: 80, t: 340, b: 70 };
const chartW = W - pad.l - pad.r; // 500
const chartH = H - pad.t - pad.b; // 220

const profile = data.elevationProfile;
const totalKm = profile[profile.length - 1].km;
const maxEle = Math.max(...profile.map(p => p.ele));
const minEle = Math.min(...profile.map(p => p.ele));
const eleRange = maxEle - minEle || 1;

const pts = profile.map(p => {
  const x = pad.l + (p.km / totalKm) * chartW;
  const y = pad.t + chartH - ((p.ele - minEle) / eleRange) * chartH;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}).join(' ');

// Build track polyline (top right inset) — the route itself
const trackPad = { l: 700, r: 60, t: 70, b: 280 };
const tW = W - trackPad.l - trackPad.r; // 440
const tH = H - trackPad.t - trackPad.b; // 280
const b = data.bounds;
const lonR = b.maxLon - b.minLon;
const latR = b.maxLat - b.minLat;
const trackPtsStr = data.track.map(p => {
  const x = trackPad.l + ((p.lon - b.minLon) / lonR) * tW;
  const y = trackPad.t + tH - ((p.lat - b.minLat) / latR) * tH; // flip y
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}).join(' ');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1e2d"/>
      <stop offset="100%" stop-color="#1e4835"/>
    </linearGradient>
    <linearGradient id="eleFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5ccf8b" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#5ccf8b" stop-opacity="0.05"/>
    </linearGradient>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Subtle topo lines -->
  <g opacity="0.10" stroke="#5ccf8b" stroke-width="1" fill="none">
    <path d="M0,200 Q300,160 600,220 T1200,180"/>
    <path d="M0,280 Q300,240 600,300 T1200,260"/>
    <path d="M0,360 Q300,320 600,380 T1200,340"/>
    <path d="M0,440 Q300,400 600,460 T1200,420"/>
    <path d="M0,520 Q300,480 600,540 T1200,500"/>
  </g>

  <!-- Brand pill -->
  <rect x="60" y="60" width="330" height="44" rx="22" fill="#5ccf8b" opacity="0.92"/>
  <text x="225" y="90" text-anchor="middle" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="22" font-weight="700" fill="#0b1e2d">YR 運動研究室 · 賽道分析</text>

  <!-- Title -->
  <text x="60" y="170" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="60" font-weight="800" fill="#f8fafc">2026 找茶越野</text>
  <text x="60" y="240" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="46" font-weight="700" fill="#5ccf8b">採茶組 12K · 賽道深度拆解</text>

  <!-- Subtitle -->
  <text x="60" y="290" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="22" font-weight="500" fill="#cbd5e1">GPS 軌跡 × 坡度分佈 × 可跑性戰術地圖</text>

  <!-- Stat cards (four side-by-side, bottom-left) -->
  <g font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" fill="#f8fafc">
    <g>
      <rect x="60" y="340" width="130" height="110" rx="14" fill="#ffffff" fill-opacity="0.08" stroke="#5ccf8b" stroke-opacity="0.4"/>
      <text x="125" y="380" text-anchor="middle" font-size="15" fill="#94a3b8">總里程</text>
      <text x="125" y="418" text-anchor="middle" font-size="32" font-weight="800">${data.totals.distanceKm}</text>
      <text x="125" y="440" text-anchor="middle" font-size="14" fill="#94a3b8">km</text>
    </g>
    <g>
      <rect x="205" y="340" width="130" height="110" rx="14" fill="#ffffff" fill-opacity="0.08" stroke="#5ccf8b" stroke-opacity="0.4"/>
      <text x="270" y="380" text-anchor="middle" font-size="15" fill="#94a3b8">總爬升</text>
      <text x="270" y="418" text-anchor="middle" font-size="32" font-weight="800">+${data.totals.gainM}</text>
      <text x="270" y="440" text-anchor="middle" font-size="14" fill="#94a3b8">m</text>
    </g>
    <g>
      <rect x="350" y="340" width="130" height="110" rx="14" fill="#ffffff" fill-opacity="0.08" stroke="#5ccf8b" stroke-opacity="0.4"/>
      <text x="415" y="380" text-anchor="middle" font-size="15" fill="#94a3b8">最高海拔</text>
      <text x="415" y="418" text-anchor="middle" font-size="32" font-weight="800">${Math.round(data.totals.maxEleM)}</text>
      <text x="415" y="440" text-anchor="middle" font-size="14" fill="#94a3b8">m</text>
    </g>
    <g>
      <rect x="60" y="470" width="420" height="100" rx="14" fill="#ffffff" fill-opacity="0.08" stroke="#5ccf8b" stroke-opacity="0.4"/>
      <text x="85" y="502" font-size="15" fill="#94a3b8">可跑路段 &lt;5% 坡度</text>
      <text x="85" y="546" font-size="38" font-weight="800" fill="#5ccf8b">${data.runnability.runnablePct}%</text>
      <text x="270" y="502" font-size="15" fill="#94a3b8">垂直爬升比例 m/km</text>
      <text x="270" y="546" font-size="38" font-weight="800" fill="#fbbf24">${data.totals.vertRatio}</text>
    </g>
  </g>

  <!-- Elevation profile (bottom right) -->
  <g>
    <rect x="${pad.l - 20}" y="${pad.t - 30}" width="${chartW + 80}" height="${chartH + 90}" rx="14" fill="#ffffff" fill-opacity="0.06" stroke="#5ccf8b" stroke-opacity="0.4"/>
    <text x="${pad.l}" y="${pad.t - 10}" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="14" fill="#94a3b8">海拔剖面 (m)</text>
    <polygon points="${pad.l},${pad.t + chartH} ${pts} ${pad.l + chartW},${pad.t + chartH}" fill="url(#eleFill)"/>
    <polyline points="${pts}" fill="none" stroke="#5ccf8b" stroke-width="3"/>
    <text x="${pad.l}" y="${pad.t + chartH + 30}" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#94a3b8">0 km</text>
    <text x="${pad.l + chartW}" y="${pad.t + chartH + 30}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#94a3b8">${totalKm.toFixed(1)} km</text>
    <text x="${pad.l - 5}" y="${pad.t + 5}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8">${Math.round(maxEle)}m</text>
    <text x="${pad.l - 5}" y="${pad.t + chartH}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8">${Math.round(minEle)}m</text>
  </g>

  <!-- Track map (top right small inset) -->
  <g>
    <rect x="${trackPad.l - 20}" y="${trackPad.t - 30}" width="${tW + 60}" height="${tH + 50}" rx="14" fill="#ffffff" fill-opacity="0.06" stroke="#5ccf8b" stroke-opacity="0.4"/>
    <text x="${trackPad.l}" y="${trackPad.t - 10}" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="14" fill="#94a3b8">GPS 軌跡 · 坪林</text>
    <polyline points="${trackPtsStr}" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linejoin="round"/>
  </g>

  <!-- URL footer -->
  <text x="60" y="605" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#94a3b8">yrciou.github.io/sportsblog</text>
</svg>`;

fs.writeFileSync('assets/og-zhaocha-12k.svg', svg);

const resvg = new Resvg(svg, { background: '#0b1e2d', fitTo: { mode: 'width', value: 1200 } });
const png = resvg.render().asPng();

await sharp(png).jpeg({ quality: 88 }).toFile(OUT_JPG);
console.log('wrote', OUT_JPG, fs.statSync(OUT_JPG).size, 'bytes');
