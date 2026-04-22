// Analyze 2026 找茶越野 12K GPX: elevation, distance, slope, runnability, segments.
// Outputs: data/zhaocha-12k-analysis.json
import fs from 'fs';
import path from 'path';
import https from 'https';

const GPX_PATH = 'C:\\Users\\yuren\\Desktop\\2026找茶越野採茶組(12K)航跡版.gpx';
const OUT = path.join(process.cwd(), 'data', 'zhaocha-12k-analysis.json');

function parseGpx(xml) {
  const pts = [];
  const re = /<trkpt\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"/g;
  let m;
  while ((m = re.exec(xml))) {
    pts.push({ lat: parseFloat(m[1]), lon: parseFloat(m[2]) });
  }
  return pts;
}

function haversine(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Simple downsample: keep ~1 pt per 20m to reduce API calls
function downsample(pts, minDistM = 20) {
  if (!pts.length) return [];
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = haversine(pts[i - 1], pts[i]);
    acc += d;
    if (acc >= minDistM) {
      out.push(pts[i]);
      acc = 0;
    }
  }
  if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
  return out;
}

function postJSON(hostname, pathUrl, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request(
      {
        hostname,
        path: pathUrl,
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
          } else reject(new Error('HTTP ' + res.statusCode + ': ' + body.slice(0, 200)));
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        } else reject(new Error('HTTP ' + res.statusCode));
      });
    }).on('error', reject);
  });
}

async function fetchElevations(pts) {
  // Use OpenTopoData (aster30m, SRTM) via GET, batches of 100
  const batchSize = 100;
  const result = new Array(pts.length);
  for (let i = 0; i < pts.length; i += batchSize) {
    const batch = pts.slice(i, i + batchSize);
    const locs = batch.map((p) => `${p.lat},${p.lon}`).join('|');
    const url = `https://api.opentopodata.org/v1/aster30m?locations=${locs}`;
    let data;
    try {
      data = await getJSON(url);
    } catch (e) {
      console.error('aster30m failed, try srtm90m', e.message);
      const url2 = `https://api.opentopodata.org/v1/srtm90m?locations=${locs}`;
      data = await getJSON(url2);
    }
    if (!data || !Array.isArray(data.results)) throw new Error('bad elevation response');
    for (let k = 0; k < batch.length; k++) {
      result[i + k] = data.results[k]?.elevation ?? null;
    }
    // polite delay 1s (public rate limit)
    await new Promise((r) => setTimeout(r, 1100));
    process.stderr.write(`  fetched ${Math.min(i + batchSize, pts.length)}/${pts.length}\n`);
  }
  return result;
}

// Smooth elevation with a moving average window
function smooth(arr, window = 5) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    let s = 0, n = 0;
    for (let k = -window; k <= window; k++) {
      const j = i + k;
      if (j >= 0 && j < arr.length && arr[j] != null) { s += arr[j]; n++; }
    }
    out.push(n ? s / n : arr[i]);
  }
  return out;
}

function classify(gradePct) {
  const g = Math.abs(gradePct);
  if (g < 5) return 'runnable';        // 全跑
  if (g < 10) return 'mixed';          // 走跑結合
  if (g < 20) return 'technical';      // 技術路段
  return 'boss';                        // 魔王陡坡
}

async function main() {
  console.error('parsing GPX...');
  const xml = fs.readFileSync(GPX_PATH, 'utf8');
  const rawPts = parseGpx(xml);
  console.error(`  raw points: ${rawPts.length}`);

  // Full distance using raw points (accurate)
  let cumFull = 0;
  for (let i = 1; i < rawPts.length; i++) cumFull += haversine(rawPts[i - 1], rawPts[i]);
  console.error(`  raw distance: ${(cumFull / 1000).toFixed(2)} km`);

  // Downsample for elevation lookups
  const sparse = downsample(rawPts, 25);
  console.error(`  sampled points: ${sparse.length}`);

  console.error('fetching elevations (OpenTopoData)...');
  const eles = await fetchElevations(sparse);
  const eleSm = smooth(eles, 4);

  // Build timeline: cumulative distance per sparse point
  const cum = [0];
  for (let i = 1; i < sparse.length; i++) cum.push(cum[i - 1] + haversine(sparse[i - 1], sparse[i]));
  const totalDist = cum[cum.length - 1];

  // Elevation stats
  const maxEle = Math.max(...eleSm);
  const minEle = Math.min(...eleSm);
  let gain = 0, loss = 0;
  for (let i = 1; i < eleSm.length; i++) {
    const d = eleSm[i] - eleSm[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }

  // Segment-level gradients (per ~100m chunks)
  const segLenTarget = 100; // meters
  const segs = [];
  let segStart = 0;
  for (let i = 1; i < sparse.length; i++) {
    if (cum[i] - cum[segStart] >= segLenTarget || i === sparse.length - 1) {
      const dist = cum[i] - cum[segStart];
      const dele = eleSm[i] - eleSm[segStart];
      const grade = (dele / Math.max(dist, 1)) * 100;
      segs.push({
        startKm: +(cum[segStart] / 1000).toFixed(3),
        endKm: +(cum[i] / 1000).toFixed(3),
        distM: +dist.toFixed(1),
        startEle: +eleSm[segStart].toFixed(1),
        endEle: +eleSm[i].toFixed(1),
        dEle: +dele.toFixed(1),
        gradePct: +grade.toFixed(2),
        class: classify(grade),
        lat: sparse[Math.floor((segStart + i) / 2)].lat,
        lon: sparse[Math.floor((segStart + i) / 2)].lon,
      });
      segStart = i;
    }
  }

  // Runnability totals
  const buckets = { runnable: 0, mixed: 0, technical: 0, boss: 0 };
  for (const s of segs) buckets[s.class] += s.distM;

  // Slope histogram
  const histEdges = [-30, -20, -15, -10, -5, -2, 0, 2, 5, 10, 15, 20, 30];
  const hist = new Array(histEdges.length - 1).fill(0);
  for (const s of segs) {
    const g = s.gradePct;
    for (let i = 0; i < histEdges.length - 1; i++) {
      if (g >= histEdges[i] && g < histEdges[i + 1]) { hist[i] += s.distM; break; }
    }
  }

  // Fake-flat: slope 1-4% sustained >300m
  const fakeFlats = [];
  let runAcc = 0, runStartKm = null;
  for (const s of segs) {
    if (s.gradePct >= 1 && s.gradePct < 4) {
      if (runStartKm == null) runStartKm = s.startKm;
      runAcc += s.distM;
    } else {
      if (runAcc >= 300) fakeFlats.push({ startKm: runStartKm, endKm: s.startKm, lengthM: +runAcc.toFixed(0) });
      runAcc = 0; runStartKm = null;
    }
  }

  // Slope variance (std of segment grades) — overall & rolling 1km windows
  const allGrades = segs.map((s) => s.gradePct);
  const meanG = allGrades.reduce((a, b) => a + b, 0) / allGrades.length;
  const varG = allGrades.reduce((a, b) => a + (b - meanG) ** 2, 0) / allGrades.length;
  const stdG = Math.sqrt(varG);

  // Rolling 1km slope-std to find the choppiest section
  const winMeters = 1000;
  let choppiest = { startKm: 0, endKm: 0, std: 0 };
  for (let i = 0; i < segs.length; i++) {
    const startKm = segs[i].startKm;
    let j = i;
    while (j < segs.length && segs[j].endKm - startKm < winMeters / 1000) j++;
    if (j >= segs.length) break;
    const winGrades = segs.slice(i, j).map((x) => x.gradePct);
    const m = winGrades.reduce((a, b) => a + b, 0) / winGrades.length;
    const v = winGrades.reduce((a, b) => a + (b - m) ** 2, 0) / winGrades.length;
    const s = Math.sqrt(v);
    if (s > choppiest.std) choppiest = { startKm, endKm: segs[j].endKm, std: +s.toFixed(2) };
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: 'C:/Users/yuren/Desktop/2026找茶越野採茶組(12K)航跡版.gpx',
    elevationSource: 'OpenTopoData aster30m',
    bounds: {
      minLat: Math.min(...sparse.map((p) => p.lat)),
      maxLat: Math.max(...sparse.map((p) => p.lat)),
      minLon: Math.min(...sparse.map((p) => p.lon)),
      maxLon: Math.max(...sparse.map((p) => p.lon)),
    },
    totals: {
      distanceM: +cumFull.toFixed(1),
      distanceKm: +(cumFull / 1000).toFixed(2),
      gainM: +gain.toFixed(0),
      lossM: +loss.toFixed(0),
      maxEleM: +maxEle.toFixed(1),
      minEleM: +minEle.toFixed(1),
      vertRatio: +((gain / cumFull) * 1000).toFixed(1), // m per km
    },
    runnability: {
      runnableM: +buckets.runnable.toFixed(0),
      mixedM: +buckets.mixed.toFixed(0),
      technicalM: +buckets.technical.toFixed(0),
      bossM: +buckets.boss.toFixed(0),
      totalM: +Object.values(buckets).reduce((a, b) => a + b, 0).toFixed(0),
      runnablePct: +((buckets.runnable / cumFull) * 100).toFixed(1),
    },
    slope: {
      mean: +meanG.toFixed(2),
      std: +stdG.toFixed(2),
      histEdges,
      hist: hist.map((x) => +x.toFixed(0)),
      choppiestKm: choppiest,
    },
    fakeFlats,
    elevationProfile: segs.map((s) => ({ km: s.startKm, ele: s.startEle })).concat({ km: +(cum[cum.length - 1] / 1000).toFixed(3), ele: +eleSm[eleSm.length - 1].toFixed(1) }),
    segments: segs,
    track: sparse.map((p, i) => ({ lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), km: +(cum[i] / 1000).toFixed(3), ele: +eleSm[i].toFixed(1) })),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.error('wrote', OUT);
  console.error(JSON.stringify(out.totals, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
