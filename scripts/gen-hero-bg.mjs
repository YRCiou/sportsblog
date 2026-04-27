// Generate a dot-art SVG for the homepage hero background.
// Composition: Taiwan mountains (left) × BJJ ground fighting (center) × Barbell (right)
//
// Output: assets/hero-bg-dots.svg

import fs from 'fs';
import path from 'path';

const W = 1200, H = 630;
const OUT = path.join('assets', 'hero-bg-dots.svg');

// Seeded RNG for reproducibility
let seed = 42;
function rng() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

const dots = []; // {x, y, r, op}

function pushDot(x, y, r = 1.6, op = 0.7) {
  dots.push({ x, y, r, op });
}

/* ── Helpers ─────────────────────────────────────────────── */
function jitter(amp) { return (rng() - 0.5) * amp; }
function pointInPath(x, y, polygon) {
  // ray-casting
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function fillPolygon(polygon, density = 0.55, baseR = 1.4, jitterAmp = 2.5, opMin = 0.45, opMax = 0.85) {
  let xs = polygon.map(p => p[0]); let ys = polygon.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const step = 6;  // grid pitch
  for (let y = minY; y < maxY; y += step) {
    for (let x = minX; x < maxX; x += step) {
      if (rng() > density) continue;
      const px = x + jitter(jitterAmp);
      const py = y + jitter(jitterAmp);
      if (!pointInPath(px, py, polygon)) continue;
      const r = baseR + (rng() - 0.5) * 0.6;
      const op = opMin + rng() * (opMax - opMin);
      pushDot(px, py, Math.max(0.6, r), op);
    }
  }
}
function strokePath(points, density = 1.0, r = 1.7, op = 0.9, jitterAmp = 1.4) {
  // Sample dense dots along polyline
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i], [x2, y2] = points[i + 1];
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const n = Math.max(2, Math.floor(len / 4 * density));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const px = x1 + dx * t + jitter(jitterAmp);
      const py = y1 + dy * t + jitter(jitterAmp);
      pushDot(px, py, r + (rng() - 0.5) * 0.4, op);
    }
  }
}
function fillCircle(cx, cy, rad, density = 0.6, baseR = 1.4, opMin = 0.5, opMax = 0.85) {
  for (let y = cy - rad; y < cy + rad; y += 6) {
    for (let x = cx - rad; x < cx + rad; x += 6) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > rad * rad) continue;
      if (rng() > density) continue;
      pushDot(x + jitter(2), y + jitter(2), baseR + (rng() - 0.5) * 0.5, opMin + rng() * (opMax - opMin));
    }
  }
}
function strokeCircle(cx, cy, rad, count = 80, r = 1.6, op = 0.85) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    pushDot(cx + Math.cos(a) * rad + jitter(0.8), cy + Math.sin(a) * rad + jitter(0.8), r, op);
  }
}

/* ── 1. Ambient field (very sparse scatter across whole canvas) ── */
for (let i = 0; i < 320; i++) {
  pushDot(rng() * W, rng() * H, 0.7 + rng() * 0.6, 0.18 + rng() * 0.18);
}

/* ── 2. Taiwan central mountain range (left third) ─────── */
// Three overlapping ridges, x = 30 ~ 460
// Back ridge (highest, lightest)
const ridgeBack = [
  [30, 460], [80, 380], [120, 350], [165, 305], [210, 260], [255, 290],
  [300, 245], [350, 220], [395, 270], [440, 300], [460, 330], [460, 460]
];
fillPolygon(ridgeBack, 0.42, 1.3, 1.8, 0.30, 0.55);
strokePath(ridgeBack.slice(0, -1), 1.0, 1.7, 0.85, 1.0);

// Mid ridge
const ridgeMid = [
  [10, 500], [55, 425], [105, 395], [150, 360], [195, 380], [240, 340],
  [285, 360], [330, 320], [375, 340], [420, 380], [465, 410], [465, 500]
];
fillPolygon(ridgeMid, 0.50, 1.4, 2.0, 0.35, 0.65);
strokePath(ridgeMid.slice(0, -1), 1.0, 1.8, 0.90, 1.0);

// Front ridge (lowest, densest)
const ridgeFront = [
  [-10, 545], [40, 480], [85, 460], [130, 440], [175, 460], [220, 425],
  [265, 445], [310, 410], [355, 440], [400, 460], [450, 480], [500, 510],
  [500, 545]
];
fillPolygon(ridgeFront, 0.58, 1.5, 2.2, 0.40, 0.75);
strokePath(ridgeFront.slice(0, -1), 1.0, 1.9, 0.95, 0.9);

// "Trail" line zigzagging over front ridge (subtle path)
const trail = [
  [60, 510], [110, 488], [165, 478], [220, 470], [275, 458], [330, 450],
  [385, 458], [440, 470], [490, 485]
];
strokePath(trail, 1.4, 1.5, 0.85, 0.6);
// Trail markers
[[110, 488], [275, 458], [440, 470]].forEach(([x, y]) => {
  pushDot(x, y - 4, 2.6, 0.95);
});

/* ── 3. BJJ ground fighting (center, x = 500 ~ 760) ─── */
// Stylized 上下位 (mount/guard) 兩人格鬥剪影
// - 下位（guard）：仰躺、膝蓋彎曲撐起（在畫面下方）
// - 上位（mount）：跨坐其上（在畫面上方）
const cx = 630, cy = 415;

// === 下位（guard，仰躺）===
// 軀幹（橫躺）
const bottomTorso = [
  [cx + 90,  cy + 50],   // 右肩（頭那側）
  [cx + 90,  cy + 80],
  [cx + 30,  cy + 85],   // 中段
  [cx - 20,  cy + 88],   // 髖
  [cx - 20,  cy + 60],
  [cx + 30,  cy + 58],
];
fillPolygon(bottomTorso, 0.55, 1.4, 1.6, 0.45, 0.75);
strokePath([...bottomTorso, bottomTorso[0]], 1.1, 1.7, 0.88, 0.7);

// 下位頭部（畫面右側）
strokeCircle(cx + 110, cy + 65, 16, 44, 1.7, 0.92);
fillCircle(cx + 110, cy + 65, 14, 0.55, 1.3, 0.50, 0.78);

// 下位左腿（彎曲撐起到畫面左側）
const leftLeg = [[cx - 20, cy + 88], [cx - 50, cy + 50], [cx - 80, cy + 30], [cx - 70, cy + 70]];
strokePath(leftLeg, 1.6, 1.7, 0.85, 0.8);
strokePath([[cx - 20, cy + 60], [cx - 50, cy + 50]], 1.6, 1.5, 0.7, 0.8);
// 左腳（圓）
fillCircle(cx - 80, cy + 30, 8, 0.65, 1.3, 0.55, 0.85);

// 下位右腿（從髖向上彎，膝蓋頂住上位）
const rightLeg = [[cx - 10, cy + 60], [cx - 5, cy + 25], [cx + 10, cy + 5], [cx + 30, cy + 15]];
strokePath(rightLeg, 1.6, 1.7, 0.85, 0.8);
fillCircle(cx + 5, cy + 8, 7, 0.6, 1.3, 0.55, 0.85);

// === 上位（mount，跨坐其上）===
// 軀幹（直立、稍微前傾）
const topTorso = [
  [cx - 30, cy - 90],
  [cx + 25, cy - 95],
  [cx + 35, cy - 50],
  [cx + 30, cy - 10],   // 髖（坐在下位身上）
  [cx - 25, cy - 5],
  [cx - 35, cy - 50],
];
fillPolygon(topTorso, 0.60, 1.5, 1.8, 0.55, 0.88);
strokePath([...topTorso, topTorso[0]], 1.2, 1.9, 0.95, 0.7);

// 上位頭部（畫面上方中間偏左）
strokeCircle(cx, cy - 120, 18, 50, 1.8, 0.95);
fillCircle(cx, cy - 120, 16, 0.62, 1.4, 0.60, 0.90);

// 上位手臂（一隻向前撐住對方頸部，一隻向側）
strokePath([[cx + 30, cy - 70], [cx + 65, cy - 50], [cx + 95, cy - 30]], 1.6, 1.6, 0.85, 0.6);
strokePath([[cx - 25, cy - 70], [cx - 55, cy - 45], [cx - 70, cy - 20]], 1.6, 1.6, 0.78, 0.6);
// 手腕點
fillCircle(cx + 95, cy - 30, 5, 0.65, 1.2, 0.55, 0.85);
fillCircle(cx - 70, cy - 20, 5, 0.65, 1.2, 0.55, 0.85);

// 上位的腿（跨在下位兩側，露出膝蓋）
strokePath([[cx + 30, cy - 10], [cx + 50, cy + 25], [cx + 35, cy + 50]], 1.4, 1.5, 0.75, 0.6);
strokePath([[cx - 25, cy - 5], [cx - 40, cy + 25], [cx - 30, cy + 50]], 1.4, 1.5, 0.75, 0.6);

// 互動連接（輕微擺動感）
strokePath([[cx + 25, cy - 80], [cx + 60, cy - 30]], 0.8, 1.0, 0.3, 1.0);

/* ── 4. Barbell with weight plates (right third, x=780~1170) ─── */
// Bar centerline at y = 360
const barY = 360;
const barLeftX = 800, barRightX = 1170;

// Bar (long thin rectangle)
const bar = [
  [barLeftX, barY - 4], [barRightX, barY - 4],
  [barRightX, barY + 4], [barLeftX, barY + 4]
];
fillPolygon(bar, 0.65, 1.3, 1.0, 0.55, 0.85);
strokePath([[barLeftX, barY], [barRightX, barY]], 1.5, 1.6, 0.90, 0.5);

// Left plates (3 plates of decreasing size)
const platesLeft = [
  { cx: 845, r: 70, op: [0.45, 0.80] },  // big plate
  { cx: 870, r: 55, op: [0.50, 0.85] },  // medium
  { cx: 887, r: 42, op: [0.55, 0.90] },  // small
];
platesLeft.forEach(p => {
  strokeCircle(p.cx, barY, p.r, Math.floor(p.r * 1.2), 1.7, 0.92);
  fillCircle(p.cx, barY, p.r - 2, 0.42, 1.3, p.op[0], p.op[1]);
});

// Right plates (mirror)
const platesRight = [
  { cx: 1125, r: 70, op: [0.45, 0.80] },
  { cx: 1100, r: 55, op: [0.50, 0.85] },
  { cx: 1083, r: 42, op: [0.55, 0.90] },
];
platesRight.forEach(p => {
  strokeCircle(p.cx, barY, p.r, Math.floor(p.r * 1.2), 1.7, 0.92);
  fillCircle(p.cx, barY, p.r - 2, 0.42, 1.3, p.op[0], p.op[1]);
});

// Knurled grip (center of bar)
const gripStartX = 945, gripEndX = 1025;
for (let x = gripStartX; x < gripEndX; x += 3) {
  for (let y = barY - 6; y < barY + 6; y += 2) {
    if (rng() > 0.5) continue;
    pushDot(x + jitter(0.5), y + jitter(0.5), 1.0, 0.65);
  }
}

// Plate holes / hub circles (visual interest)
strokeCircle(845, barY, 14, 24, 1.4, 0.85);
strokeCircle(1125, barY, 14, 24, 1.4, 0.85);

/* ── 5. Tech-feel accent: subtle horizontal grid lines (very faint) ── */
for (let y = 80; y <= 580; y += 80) {
  for (let x = 20; x <= W - 20; x += 30) {
    if (rng() > 0.18) continue;
    pushDot(x + jitter(2), y + jitter(2), 0.6, 0.10 + rng() * 0.10);
  }
}

/* ── 6. Connecting "data flow" curves between motifs (very subtle) ─ */
// Mountain summit → BJJ shoulder
const flow1 = [];
for (let t = 0; t <= 1; t += 0.02) {
  const x = 350 + (cx - 30 - 350) * t;
  const y = 220 + Math.sin(t * Math.PI) * 30 + (cy - 110 - 220) * t;
  flow1.push([x, y]);
}
strokePath(flow1, 0.6, 0.7, 0.18, 0.5);

// BJJ → barbell
const flow2 = [];
for (let t = 0; t <= 1; t += 0.02) {
  const x = (cx + 100) + (845 - (cx + 100)) * t;
  const y = cy + Math.sin(t * Math.PI) * 20 + (barY - cy) * t;
  flow2.push([x, y]);
}
strokePath(flow2, 0.6, 0.7, 0.18, 0.5);

/* ── Build SVG ──────────────────────────────────────────── */
const dotElements = dots.map(d =>
  `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(2)}" opacity="${d.op.toFixed(2)}"/>`
).join('');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="centerGlow" cx="50%" cy="55%" r="60%">
      <stop offset="0%"  stop-color="#22d3ee" stop-opacity="0.08"/>
      <stop offset="60%" stop-color="#22d3ee" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="transparent"/>
  <rect width="${W}" height="${H}" fill="url(#centerGlow)"/>
  <g fill="#67e8f9">${dotElements}</g>
</svg>
`;

fs.writeFileSync(OUT, svg);
console.log(`wrote ${OUT}: ${(svg.length / 1024).toFixed(1)} KB, ${dots.length} dots`);
