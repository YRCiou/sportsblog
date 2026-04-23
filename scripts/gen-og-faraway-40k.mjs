// Generate OG 1200x630 JPEG for 2025 發發爾衛 40K Far Away.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Resvg } = require('D:/claude/sportsblog/node_modules/@resvg/resvg-js');
const sharp = require('D:/claude/sportsblog/node_modules/sharp');

const analysis = JSON.parse(fs.readFileSync('data/faraway-40k-analysis.json', 'utf8'));
const compact = JSON.parse(fs.readFileSync('data/faraway-40k-compact.json', 'utf8'));
const OUT = path.join('assets', 'og-faraway-40k.jpg');

const W = 1200, H = 630;
const pad = { l: 620, r: 80, t: 340, b: 70 };
const chartW = W - pad.l - pad.r;
const chartH = H - pad.t - pad.b;

const profile = analysis.elevationProfile;
const totalKm = profile[profile.length - 1].km;
const maxEle = Math.max(...profile.map(p => p.ele));
const minEle = Math.min(...profile.map(p => p.ele));
const eleRange = maxEle - minEle || 1;

const pts = profile.map(p => {
  const x = pad.l + (p.km / totalKm) * chartW;
  const y = pad.t + chartH - ((p.ele - minEle) / eleRange) * chartH;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}).join(' ');

const trackPad = { l: 700, r: 60, t: 70, b: 280 };
const tW = W - trackPad.l - trackPad.r;
const tH = H - trackPad.t - trackPad.b;
const b = analysis.bounds;
const lonR = b.maxLon - b.minLon, latR = b.maxLat - b.minLat;
const trackPtsStr = compact.m.map(p => {
  const x = trackPad.l + ((p[1] - b.minLon) / lonR) * tW;
  const y = trackPad.t + tH - ((p[0] - b.minLat) / latR) * tH;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}).join(' ');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a0b2e"/>
      <stop offset="100%" stop-color="#3d1b5c"/>
    </linearGradient>
    <linearGradient id="eleFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#c084fc" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <g opacity="0.10" stroke="#c084fc" stroke-width="1" fill="none">
    <path d="M0,200 Q300,140 600,220 T1200,160"/>
    <path d="M0,280 Q300,220 600,300 T1200,240"/>
    <path d="M0,360 Q300,300 600,380 T1200,320"/>
    <path d="M0,440 Q300,380 600,460 T1200,400"/>
    <path d="M0,520 Q300,460 600,540 T1200,480"/>
  </g>

  <rect x="60" y="60" width="360" height="44" rx="22" fill="#c084fc" opacity="0.92"/>
  <text x="240" y="90" text-anchor="middle" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="22" font-weight="700" fill="#1a0b2e">YR 運動研究室 · 賽道分析</text>

  <text x="60" y="170" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="56" font-weight="800" fill="#f8fafc">2025 發發爾衛</text>
  <text x="60" y="240" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="44" font-weight="700" fill="#c084fc">Far Away 40K · 重山系</text>
  <text x="60" y="290" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="22" font-weight="500" fill="#cbd5e1">屋我尾山 × 大雪山 × 15 小時關門 × 2,793 m D+</text>

  <g font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" fill="#f8fafc">
    <g>
      <rect x="60" y="340" width="130" height="110" rx="14" fill="#ffffff" fill-opacity="0.10" stroke="#c084fc" stroke-opacity="0.5"/>
      <text x="125" y="380" text-anchor="middle" font-size="15" fill="#94a3b8">總里程</text>
      <text x="125" y="418" text-anchor="middle" font-size="32" font-weight="800">${analysis.totals.distanceKm}</text>
      <text x="125" y="440" text-anchor="middle" font-size="14" fill="#94a3b8">km</text>
    </g>
    <g>
      <rect x="205" y="340" width="130" height="110" rx="14" fill="#ffffff" fill-opacity="0.10" stroke="#c084fc" stroke-opacity="0.5"/>
      <text x="270" y="380" text-anchor="middle" font-size="15" fill="#94a3b8">總爬升</text>
      <text x="270" y="418" text-anchor="middle" font-size="32" font-weight="800">+${analysis.totals.gainM}</text>
      <text x="270" y="440" text-anchor="middle" font-size="14" fill="#94a3b8">m</text>
    </g>
    <g>
      <rect x="350" y="340" width="130" height="110" rx="14" fill="#ffffff" fill-opacity="0.10" stroke="#c084fc" stroke-opacity="0.5"/>
      <text x="415" y="380" text-anchor="middle" font-size="15" fill="#94a3b8">最高海拔</text>
      <text x="415" y="418" text-anchor="middle" font-size="32" font-weight="800">${Math.round(analysis.totals.maxEleM)}</text>
      <text x="415" y="440" text-anchor="middle" font-size="14" fill="#94a3b8">m</text>
    </g>
    <g>
      <rect x="60" y="470" width="420" height="100" rx="14" fill="#ffffff" fill-opacity="0.10" stroke="#c084fc" stroke-opacity="0.5"/>
      <text x="85" y="502" font-size="15" fill="#94a3b8">可跑路段 &lt;5% 坡度</text>
      <text x="85" y="546" font-size="38" font-weight="800" fill="#a7f3d0">${analysis.runnability.runnablePct}%</text>
      <text x="270" y="502" font-size="15" fill="#94a3b8">垂直爬升比 m/km</text>
      <text x="270" y="546" font-size="38" font-weight="800" fill="#fbbf24">${analysis.totals.vertRatio}</text>
    </g>
  </g>

  <g>
    <rect x="${pad.l - 20}" y="${pad.t - 30}" width="${chartW + 80}" height="${chartH + 90}" rx="14" fill="#ffffff" fill-opacity="0.08" stroke="#c084fc" stroke-opacity="0.4"/>
    <text x="${pad.l}" y="${pad.t - 10}" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="14" fill="#94a3b8">海拔剖面 (m)</text>
    <polygon points="${pad.l},${pad.t + chartH} ${pts} ${pad.l + chartW},${pad.t + chartH}" fill="url(#eleFill)"/>
    <polyline points="${pts}" fill="none" stroke="#c084fc" stroke-width="3"/>
    <text x="${pad.l}" y="${pad.t + chartH + 30}" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#94a3b8">0 km</text>
    <text x="${pad.l + chartW}" y="${pad.t + chartH + 30}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#94a3b8">${totalKm.toFixed(1)} km</text>
    <text x="${pad.l - 5}" y="${pad.t + 5}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8">${Math.round(maxEle)}m</text>
    <text x="${pad.l - 5}" y="${pad.t + chartH}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#94a3b8">${Math.round(minEle)}m</text>
  </g>

  <g>
    <rect x="${trackPad.l - 20}" y="${trackPad.t - 30}" width="${tW + 60}" height="${tH + 50}" rx="14" fill="#ffffff" fill-opacity="0.08" stroke="#c084fc" stroke-opacity="0.4"/>
    <text x="${trackPad.l}" y="${trackPad.t - 10}" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif" font-size="14" fill="#94a3b8">GPS 軌跡 · 台中和平</text>
    <polyline points="${trackPtsStr}" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linejoin="round"/>
  </g>

  <text x="60" y="605" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#94a3b8">yrciou.github.io/sportsblog</text>
</svg>`;

fs.writeFileSync('assets/og-faraway-40k.svg', svg);
const resvg = new Resvg(svg, { background: '#1a0b2e', fitTo: { mode: 'width', value: 1200 } });
const png = resvg.render().asPng();
await sharp(png).jpeg({ quality: 88 }).toFile(OUT);
console.log('wrote', OUT, fs.statSync(OUT).size, 'bytes');
