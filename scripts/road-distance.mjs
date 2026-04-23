// Fetch drivable roads in a bounding box from OSM Overpass API,
// then for each GPS track point compute the minimum haversine distance to the nearest road node.
// Output: updates trackMap to [lat, lon, km, nearestRoadM] and attaches roads for debug.
//
// Usage: node scripts/road-distance.mjs <track-json-in> <track-json-out>
import fs from 'fs';
import https from 'https';

const [,, IN_PATH, OUT_PATH] = process.argv;
if (!IN_PATH || !OUT_PATH) {
  console.error('usage: node scripts/road-distance.mjs <in.json> <out.json>');
  process.exit(2);
}

function haversine(aLat, aLon, bLat, bLon) {
  const R = 6371000, toR = d => d * Math.PI / 180;
  const dLat = toR(bLat - aLat), dLon = toR(bLon - aLon);
  const x = Math.sin(dLat/2)**2 + Math.cos(toR(aLat))*Math.cos(toR(bLat))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function postOverpass(query) {
  return new Promise((res, rej) => {
    const data = 'data=' + encodeURIComponent(query);
    const req = https.request({
      hostname: 'overpass-api.de',
      path: '/api/interpreter',
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': Buffer.byteLength(data) }
    }, r => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        if (r.statusCode >= 200 && r.statusCode < 300) {
          try { res(JSON.parse(b)); } catch (e) { rej(e); }
        } else rej(new Error('HTTP ' + r.statusCode + ': ' + b.slice(0, 400)));
      });
    });
    req.on('error', rej);
    req.write(data);
    req.end();
  });
}

const track = JSON.parse(fs.readFileSync(IN_PATH, 'utf8'));
const b = track.bounds;
// Add some padding so roads just outside the track are still considered
const padLat = (b.maxLat - b.minLat) * 0.3 + 0.003;
const padLon = (b.maxLon - b.minLon) * 0.3 + 0.003;
const bbox = `${(b.minLat-padLat).toFixed(5)},${(b.minLon-padLon).toFixed(5)},${(b.maxLat+padLat).toFixed(5)},${(b.maxLon+padLon).toFixed(5)}`;

// Include drivable roads + 產業道路. Exclude pure footpaths.
const query = `[out:json][timeout:60];
(
  way[highway~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|track)$"](${bbox});
);
out geom;`;

console.error('querying Overpass for roads in bbox:', bbox);
const data = await postOverpass(query);
const ways = data.elements.filter(e => e.type === 'way' && Array.isArray(e.geometry));
console.error(`got ${ways.length} road ways`);

// Flatten to node array
const nodes = [];
const wayMeta = [];
for (const w of ways) {
  const tag = w.tags || {};
  const kind = tag.highway || '';
  for (const pt of w.geometry) nodes.push([pt.lat, pt.lon, kind]);
  wayMeta.push({ id: w.id, kind, name: tag.name || tag.ref || '', pts: w.geometry.length });
}
console.error(`total road nodes: ${nodes.length}`);

// For each track point, compute min haversine distance to any road node.
// O(N*M) but we only have ~200 track pts × ~thousands road nodes — fine.
const newTrack = track.trackMap.map(pt => {
  const [lat, lon, km] = pt;
  let minD = Infinity;
  for (const n of nodes) {
    const d = haversine(lat, lon, n[0], n[1]);
    if (d < minD) minD = d;
  }
  return [lat, lon, km, Math.round(minD)];
});

const summary = { lt500: 0, lt1000: 0, gte1000: 0 };
for (const t of newTrack) {
  if (t[3] < 500) summary.lt500++;
  else if (t[3] < 1000) summary.lt1000++;
  else summary.gte1000++;
}
console.error('distance buckets:', summary);

const out = { ...track, trackMap: newTrack, roadCount: ways.length };
fs.writeFileSync(OUT_PATH, JSON.stringify(out));
console.error('wrote', OUT_PATH, fs.statSync(OUT_PATH).size, 'bytes');
