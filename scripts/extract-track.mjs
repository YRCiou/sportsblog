// Extract lat/lon/cumulative km from a GPX file, output compact trackMap + bounds.
// Usage: node scripts/extract-track.mjs <gpx-path> <output-json>
import fs from 'fs';

const [,, GPX_PATH, OUT_PATH] = process.argv;
if (!GPX_PATH || !OUT_PATH) {
  console.error('usage: node scripts/extract-track.mjs <gpx> <out.json>');
  process.exit(2);
}

function parseGpx(xml) {
  const pts = [];
  const re = /<trkpt\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"/g;
  let m;
  while ((m = re.exec(xml))) pts.push({ lat: parseFloat(m[1]), lon: parseFloat(m[2]) });
  return pts;
}

function haversine(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const xml = fs.readFileSync(GPX_PATH, 'utf8');
const raw = parseGpx(xml);
console.error(`raw points: ${raw.length}`);

// Cumulative distance (m) per raw point
const cum = [0];
for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + haversine(raw[i - 1], raw[i]));
const totalKm = cum[cum.length - 1] / 1000;
console.error(`total distance: ${totalKm.toFixed(2)} km`);

// Downsample to ~220 points for map
const target = 220;
const step = Math.max(1, Math.floor(raw.length / target));
const out = [];
for (let i = 0; i < raw.length; i += step) {
  out.push([+raw[i].lat.toFixed(5), +raw[i].lon.toFixed(5), +(cum[i] / 1000).toFixed(2)]);
}
// ensure last point
const last = raw.length - 1;
if (out.length === 0 || out[out.length - 1][2] !== +(cum[last] / 1000).toFixed(2)) {
  out.push([+raw[last].lat.toFixed(5), +raw[last].lon.toFixed(5), +(cum[last] / 1000).toFixed(2)]);
}

const bounds = {
  minLat: Math.min(...raw.map(p => p.lat)),
  maxLat: Math.max(...raw.map(p => p.lat)),
  minLon: Math.min(...raw.map(p => p.lon)),
  maxLon: Math.max(...raw.map(p => p.lon)),
};

const payload = { totalKm: +totalKm.toFixed(2), bounds, trackMap: out };
fs.writeFileSync(OUT_PATH, JSON.stringify(payload));
console.error(`wrote ${OUT_PATH}: ${out.length} points`);
console.error('bounds:', JSON.stringify(bounds));
