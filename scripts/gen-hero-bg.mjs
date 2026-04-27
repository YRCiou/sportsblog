// Generate a low-poly / wireframe SVG for the homepage hero background.
// Composition: Taiwan mountains (left, triangulated mesh) ×
//              BJJ ground fighting wireframe figures (center) ×
//              Weightlifter snatch wireframe (right)
// Palette: deep navy bg + cyan mountains + light-gray figures + orange accents
// Output: assets/hero-bg-dots.svg

import fs from 'fs';
import path from 'path';

const W = 1200, H = 630;
const OUT = path.join('assets', 'hero-bg-dots.svg');

let seed = 7;
function rng() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
function rand(min, max) { return min + rng() * (max - min); }

const layers = []; // raw SVG strings

/* ── Background grid ──────────────────────────────────── */
{
  let s = '';
  // Vertical lines
  for (let x = 0; x <= W; x += 60) {
    s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#1e293b" stroke-width="0.4" opacity="0.5"/>`;
  }
  for (let y = 0; y <= H; y += 60) {
    s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#1e293b" stroke-width="0.4" opacity="0.5"/>`;
  }
  layers.push(`<g class="grid">${s}</g>`);
}

/* ── 1. MOUNTAIN WIREFRAME (left, x = 0 ~ 540) ───────── */
// Generate a triangulated low-poly mountain by:
//  1. Defining ridge baseline points (jagged)
//  2. Adding internal "depth" points
//  3. Triangulating with a simple sweep algorithm

function buildMountain() {
  const pts = [];
  // Base ridge points (peaks and valleys)
  const ridgeBase = [
    [-20, 540], [40, 470], [85, 410], [120, 380],
    [155, 320], [195, 250], [225, 195], [255, 130],   // tall peak 1
    [285, 175], [310, 220], [340, 180], [370, 240],
    [400, 290], [430, 250], [465, 310], [500, 360],
    [530, 400], [550, 450], [560, 540]
  ];
  pts.push(...ridgeBase);
  // Internal points (mid-elevation, scattered)
  for (let i = 0; i < 80; i++) {
    const x = rand(20, 540);
    const yMin = Math.min(...ridgeBase.filter(p => Math.abs(p[0] - x) < 60).map(p => p[1])) || 350;
    const y = rand(yMin + 10, 540);
    pts.push([x, y]);
  }
  // Bottom row
  for (let x = 0; x <= 560; x += 30) pts.push([x, 540 + rand(-3, 3)]);

  // Simple triangulation: for each point, connect to its 3 nearest neighbors
  const tris = new Set();
  for (let i = 0; i < pts.length; i++) {
    const dists = pts.map((p, j) => [j, (p[0] - pts[i][0]) ** 2 + (p[1] - pts[i][1]) ** 2]);
    dists.sort((a, b) => a[1] - b[1]);
    const neighbors = dists.slice(1, 6).map(d => d[0]);
    for (let a = 0; a < neighbors.length; a++) {
      for (let b = a + 1; b < neighbors.length; b++) {
        const tri = [i, neighbors[a], neighbors[b]].sort((x, y) => x - y);
        // Validate triangle: not too elongated
        const p1 = pts[tri[0]], p2 = pts[tri[1]], p3 = pts[tri[2]];
        const d12 = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
        const d23 = Math.hypot(p2[0] - p3[0], p2[1] - p3[1]);
        const d31 = Math.hypot(p3[0] - p1[0], p3[1] - p1[1]);
        const maxD = Math.max(d12, d23, d31);
        if (maxD > 90) continue;
        tris.add(tri.join(','));
      }
    }
  }

  let svg = '';
  // Render triangles with stroke (no fill, slight gradient by y)
  for (const key of tris) {
    const [a, b, c] = key.split(',').map(Number);
    const p1 = pts[a], p2 = pts[b], p3 = pts[c];
    const yAvg = (p1[1] + p2[1] + p3[1]) / 3;
    // Higher elevation (smaller y) = brighter cyan; lower = darker
    const t = Math.max(0, Math.min(1, (540 - yAvg) / 410));
    const opacity = 0.35 + t * 0.55;
    const stroke = t > 0.6 ? '#67e8f9' : (t > 0.3 ? '#22d3ee' : '#0e7490');
    svg += `<polygon points="${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)} ${p3[0].toFixed(1)},${p3[1].toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="0.7" opacity="${opacity.toFixed(2)}"/>`;
  }

  // Highlight ridge top with brighter line
  const ridgeTop = ridgeBase.filter(p => p[1] < 350);
  let topPath = `M ${ridgeTop[0][0]},${ridgeTop[0][1]}`;
  for (let i = 1; i < ridgeTop.length; i++) topPath += ` L ${ridgeTop[i][0]},${ridgeTop[i][1]}`;
  svg += `<path d="${topPath}" fill="none" stroke="#a5f3fc" stroke-width="1.2" opacity="0.85"/>`;
  return svg;
}
layers.push(`<g class="mountain">${buildMountain()}</g>`);

/* ── 2. BJJ GROUND FIGHTING WIREFRAME (center, x = 540 ~ 800) ─── */
// Simplified low-poly silhouette of two figures:
//   Bottom figure on back with knees up, top figure mounted/leaning forward
function buildBJJ() {
  const ox = 660, oy = 470;  // anchor (lower hip area)
  let s = '';
  const stroke = '#cbd5e1', strokeBright = '#e2e8f0';

  // === Bottom figure (lying on back, head LEFT, knees up RIGHT) ===
  // Body silhouette (back lying flat)
  const bottomBody = [
    [ox - 130, oy - 5],   // back of head
    [ox - 100, oy - 20],  // top of head
    [ox - 75,  oy - 18],  // neck
    [ox - 60,  oy - 25],  // top shoulder
    [ox - 30,  oy - 22],
    [ox + 5,   oy - 18],  // hip top
    [ox + 30,  oy - 32],  // knee bend up
    [ox + 50,  oy - 55],  // knee
    [ox + 65,  oy - 25],  // back to thigh
    [ox + 35,  oy + 5],   // glute
    [ox - 5,   oy + 10],
    [ox - 35,  oy + 12],
    [ox - 70,  oy + 8],
    [ox - 100, oy + 3],
    [ox - 125, oy + 5]
  ];
  s += polygonWire(bottomBody, stroke, 0.7, 1.2);
  // Internal triangulation (low-poly fill effect)
  s += internalTriangulate(bottomBody, stroke, 0.45, 0.6);

  // Head circle (left)
  s += circleWire(ox - 110, oy - 8, 16, stroke, 0.8, 1.2);

  // Bent leg (right side of bottom figure: hip → knee → foot)
  s += linesGroup([
    [[ox + 50, oy - 55], [ox + 80, oy - 35]],  // shin to ankle
    [[ox + 80, oy - 35], [ox + 100, oy - 25]], // foot
  ], stroke, 0.85, 1.4);

  // === Top figure (mounted, leaning forward over bottom) ===
  // Body torso (vertical, slightly forward)
  const topBody = [
    [ox - 35, oy - 130],   // shoulder L
    [ox + 5,  oy - 145],   // shoulder R
    [ox + 35, oy - 130],   // shoulder R outer
    [ox + 50, oy - 95],    // back/lat R
    [ox + 45, oy - 60],    // hip R
    [ox + 20, oy - 50],    // hip mid
    [ox - 15, oy - 55],    // hip L
    [ox - 35, oy - 80],    // back L
    [ox - 50, oy - 105]    // shoulder back
  ];
  s += polygonWire(topBody, strokeBright, 0.85, 1.4);
  s += internalTriangulate(topBody, strokeBright, 0.55, 0.7);

  // Top figure head (above)
  s += circleWire(ox - 5, oy - 175, 22, strokeBright, 0.9, 1.4);
  // Internal head lines
  s += `<line x1="${ox - 27}" y1="${oy - 175}" x2="${ox + 17}" y2="${oy - 170}" stroke="${strokeBright}" stroke-width="0.5" opacity="0.5"/>`;
  s += `<line x1="${ox - 5}" y1="${oy - 197}" x2="${ox + 5}" y2="${oy - 153}" stroke="${strokeBright}" stroke-width="0.5" opacity="0.5"/>`;

  // Top figure arms (reaching forward toward bottom figure's neck/shoulder)
  s += linesGroup([
    [[ox + 35, oy - 130], [ox + 70, oy - 110], [ox + 90, oy - 70], [ox + 75, oy - 35]], // right arm forward
    [[ox - 35, oy - 130], [ox - 65, oy - 100], [ox - 80, oy - 65], [ox - 60, oy - 30]], // left arm down
  ], strokeBright, 0.9, 1.6);
  // Hands as small polygons
  s += circleWire(ox + 75, oy - 35, 6, strokeBright, 0.8, 1.0);
  s += circleWire(ox - 60, oy - 30, 6, strokeBright, 0.8, 1.0);

  // Top figure legs (knees on either side of bottom figure)
  s += linesGroup([
    [[ox + 30, oy - 60], [ox + 50, oy - 30], [ox + 30, oy + 0]], // right leg
    [[ox - 10, oy - 55], [ox - 25, oy - 25], [ox - 5, oy + 5]],  // left leg
  ], strokeBright, 0.85, 1.4);

  return s;
}

function polygonWire(pts, color, opacity, sw = 1.0) {
  const points = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return `<polygon points="${points}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}" stroke-linejoin="round"/>`;
}
function internalTriangulate(pts, color, opacity, sw = 0.5) {
  // Connect each non-adjacent pair with a faint line for low-poly look
  let s = '';
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (rng() > 0.55) continue;
      s += `<line x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${pts[j][0]}" y2="${pts[j][1]}" stroke="${color}" stroke-width="${sw}" opacity="${opacity * 0.7}"/>`;
    }
  }
  return s;
}
function circleWire(cx, cy, r, color, opacity, sw = 1.0, segments = 12) {
  let path = '';
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    path += (i === 0 ? 'M' : 'L') + `${x.toFixed(1)},${y.toFixed(1)} `;
  }
  path += 'Z';
  return `<path d="${path}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}" stroke-linejoin="round"/>`;
}
function linesGroup(segs, color, opacity, sw = 1.0) {
  let s = '';
  for (const seg of segs) {
    let path = `M${seg[0][0]},${seg[0][1]}`;
    for (let i = 1; i < seg.length; i++) path += ` L${seg[i][0]},${seg[i][1]}`;
    s += `<path d="${path}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return s;
}

layers.push(`<g class="bjj">${buildBJJ()}</g>`);

/* ── 3. WEIGHTLIFTER SNATCH WIREFRAME (right, x = 780 ~ 1180) ─── */
// Pose: deep squat with arms straight overhead holding barbell (snatch end position)
function buildLifter() {
  const ox = 970, oy = 530;  // feet anchor
  let s = '';
  const stroke = '#cbd5e1', strokeBright = '#e2e8f0';

  // Body silhouette (squatting, knees out, torso slightly forward, arms straight up)
  // Simplified low-poly polygon
  const body = [
    [ox - 30, oy - 5],     // left foot
    [ox - 50, oy - 50],    // outer thigh L
    [ox - 30, oy - 90],    // hip L
    [ox - 25, oy - 130],   // waist L
    [ox - 35, oy - 165],   // shoulder L
    [ox - 38, oy - 195],   // top shoulder (raised arm)
    [ox - 5,  oy - 215],   // arm pit / extended
    [ox - 5,  oy - 155],   // chest L
    [ox + 5,  oy - 155],   // chest R
    [ox + 5,  oy - 215],
    [ox + 38, oy - 195],
    [ox + 35, oy - 165],
    [ox + 25, oy - 130],
    [ox + 30, oy - 90],
    [ox + 50, oy - 50],
    [ox + 30, oy - 5],
  ];
  s += polygonWire(body, stroke, 0.85, 1.3);
  s += internalTriangulate(body, stroke, 0.5, 0.6);

  // Head
  s += circleWire(ox, oy - 245, 18, strokeBright, 0.9, 1.3);
  // Neck
  s += `<line x1="${ox - 8}" y1="${oy - 230}" x2="${ox - 8}" y2="${oy - 215}" stroke="${strokeBright}" stroke-width="1" opacity="0.85"/>`;
  s += `<line x1="${ox + 8}" y1="${oy - 230}" x2="${ox + 8}" y2="${oy - 215}" stroke="${strokeBright}" stroke-width="1" opacity="0.85"/>`;

  // Arms straight up (vertical from shoulder to hands)
  s += linesGroup([
    [[ox - 35, oy - 215], [ox - 38, oy - 270], [ox - 38, oy - 320]], // L arm up
    [[ox + 35, oy - 215], [ox + 38, oy - 270], [ox + 38, oy - 320]], // R arm up
  ], strokeBright, 0.95, 1.6);

  // Knees (highlights)
  s += circleWire(ox - 45, oy - 70, 9, stroke, 0.7, 1.0);
  s += circleWire(ox + 45, oy - 70, 9, stroke, 0.7, 1.0);

  // === Barbell horizontal across (above head) ===
  const barY = oy - 320;
  const barLeftX = ox - 200, barRightX = ox + 200;
  s += `<line x1="${barLeftX + 50}" y1="${barY}" x2="${barRightX - 50}" y2="${barY}" stroke="${strokeBright}" stroke-width="3" opacity="0.95"/>`;
  // Hands gripping bar
  s += `<line x1="${ox - 38}" y1="${barY - 5}" x2="${ox - 38}" y2="${barY + 5}" stroke="${strokeBright}" stroke-width="3" opacity="1"/>`;
  s += `<line x1="${ox + 38}" y1="${barY - 5}" x2="${ox + 38}" y2="${barY + 5}" stroke="${strokeBright}" stroke-width="3" opacity="1"/>`;

  // Plates (left & right) with low-poly hexagonal/circular look
  function lowPolyPlate(cx, cy, rOuter, rInner, color, opacity) {
    let r = '';
    // Outer ring as octagon
    const sides = 16;
    let pts = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rOuter, cy + Math.sin(a) * rOuter]);
    }
    r += polygonWire(pts, color, opacity, 1.4);
    // Inner ring
    let inner = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      inner.push([cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner]);
    }
    r += polygonWire(inner, color, opacity * 0.85, 1.0);
    // Spokes
    for (let i = 0; i < sides; i += 2) {
      r += `<line x1="${pts[i][0].toFixed(1)}" y1="${pts[i][1].toFixed(1)}" x2="${inner[i][0].toFixed(1)}" y2="${inner[i][1].toFixed(1)}" stroke="${color}" stroke-width="0.6" opacity="${opacity * 0.5}"/>`;
    }
    // Center hub
    r += circleWire(cx, cy, 8, color, opacity, 1.0);
    return r;
  }
  s += lowPolyPlate(barLeftX + 35, barY, 50, 35, strokeBright, 0.85);
  s += lowPolyPlate(barRightX - 35, barY, 50, 35, strokeBright, 0.85);

  return s;
}
layers.push(`<g class="lifter">${buildLifter()}</g>`);

/* ── 4. Tech overlay accents ─────────────────────────── */

// Force vector arrows (orange)
function arrow(x1, y1, x2, y2, color, label) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const ah = 8; // arrowhead size
  const ax = x2 - ux * ah, ay = y2 - uy * ah;
  const px = -uy * 4, py = ux * 4; // perpendicular
  let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.4" opacity="0.85"/>`;
  s += `<polygon points="${x2},${y2} ${(ax + px).toFixed(1)},${(ay + py).toFixed(1)} ${(ax - px).toFixed(1)},${(ay - py).toFixed(1)}" fill="${color}" opacity="0.9"/>`;
  if (label) s += `<text x="${x2 + ux * 6}" y="${y2 + uy * 6}" font-family="system-ui, sans-serif" font-size="11" fill="${color}" opacity="0.85" font-style="italic">${label}</text>`;
  return s;
}
layers.push(`<g class="vectors">
  ${arrow(610, 530, 660, 510, '#fb923c', 'F')}
  ${arrow(620, 540, 580, 555, '#22d3ee', 'v')}
  ${arrow(630, 535, 690, 525, '#f97316', 'F\u2080')}
  ${arrow(900, 380, 870, 350, '#fb923c', 'F')}
  ${arrow(905, 390, 945, 380, '#22d3ee', 'v')}
</g>`);

// Heart-rate line (bottom-left corner)
{
  let p = 'M 30 565 ';
  let x = 30;
  for (let i = 0; i < 30; i++) {
    x += 4;
    let y = 565;
    if (i % 7 === 3) y = 545;
    if (i % 7 === 4) y = 580;
    if (i % 7 === 5) y = 565;
    p += `L ${x} ${y} `;
  }
  layers.push(`<g class="hr"><path d="${p}" fill="none" stroke="#fb923c" stroke-width="1.2" opacity="0.7"/></g>`);
}

// Small chart (bottom-left): elevation profile mock
{
  let p = 'M 30 600 ';
  for (let i = 0; i < 30; i++) {
    const x = 30 + i * 5;
    const y = 600 - (Math.sin(i * 0.4) * 8 + Math.sin(i * 0.13) * 6 + 12);
    p += `L ${x} ${y.toFixed(1)} `;
  }
  layers.push(`<g class="chart-bl"><path d="${p}" fill="none" stroke="#22d3ee" stroke-width="1" opacity="0.6"/>
    <line x1="30" y1="615" x2="180" y2="615" stroke="#22d3ee" stroke-width="0.5" opacity="0.4"/>
    <text x="30" y="623" font-family="system-ui, sans-serif" font-size="8" fill="#22d3ee" opacity="0.6">elevation profile</text>
  </g>`);
}

// Small chart (bottom-right): training load
{
  let p = 'M 1020 615 ';
  for (let i = 0; i < 30; i++) {
    const x = 1020 + i * 5;
    const y = 615 - (Math.sin(i * 0.3) * 6 + i * 0.4 + 5);
    p += `L ${x} ${y.toFixed(1)} `;
  }
  layers.push(`<g class="chart-br"><path d="${p}" fill="none" stroke="#fb923c" stroke-width="1" opacity="0.6"/>
    <text x="1020" y="625" font-family="system-ui, sans-serif" font-size="8" fill="#fb923c" opacity="0.6">training load</text>
  </g>`);
}

// Top-right wireframe polyhedron (geometric data construct)
{
  const cx = 870, cy = 90;
  const verts = [
    [cx - 30, cy + 0],   // 0
    [cx + 5,  cy - 22],  // 1
    [cx + 35, cy + 8],   // 2
    [cx + 10, cy + 35],  // 3
    [cx - 22, cy + 28],  // 4
    [cx + 0,  cy + 5]    // center 5
  ];
  let s = '';
  const edges = [[0,1],[1,2],[2,3],[3,4],[4,0],[0,5],[1,5],[2,5],[3,5],[4,5],[0,2],[1,3]];
  edges.forEach(([a,b])=>{
    s += `<line x1="${verts[a][0]}" y1="${verts[a][1]}" x2="${verts[b][0]}" y2="${verts[b][1]}" stroke="#cbd5e1" stroke-width="0.5" opacity="0.5"/>`;
  });
  layers.push(`<g class="poly">${s}</g>`);
}

// Connecting "data flow" curves linking three motifs (very subtle)
{
  let s = '';
  // Mountain peak → BJJ figure
  s += `<path d="M 250 130 Q 480 250 660 295" fill="none" stroke="#22d3ee" stroke-width="0.6" opacity="0.25" stroke-dasharray="3 4"/>`;
  // BJJ → Lifter
  s += `<path d="M 760 415 Q 870 380 970 285" fill="none" stroke="#fb923c" stroke-width="0.6" opacity="0.25" stroke-dasharray="3 4"/>`;
  layers.push(`<g class="flow">${s}</g>`);
}

/* ── Build SVG ──────────────────────────────────────────── */
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="55%" r="70%">
      <stop offset="0%"  stop-color="#0f2040" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0a1628" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="transparent"/>
  <rect width="${W}" height="${H}" fill="url(#bgGlow)"/>
${layers.join('\n')}
</svg>
`;

fs.writeFileSync(OUT, svg);
console.log(`wrote ${OUT}: ${(svg.length / 1024).toFixed(1)} KB`);
