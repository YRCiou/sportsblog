// Generic race-analysis pipeline for the 賽道分析 series.
// Reads a GPX (uses embedded <ele> if present, else queries OpenTopoData ASTER 30m),
// then computes distance, cumulative climb/descent, slope histogram, runnability buckets,
// fake-flats, slope-std choppy sections, and writes a compact data/{slug}-compact.json.
//
// Usage: node scripts/analyze-race.mjs <gpx-path> <slug>
//
// Output files under data/:
//   {slug}-analysis.json  full dataset (segments, track w/ ele, slope hist)
//   {slug}-compact.json   embedable { t, r, s, ff, p, b, m }  (m has 4-tuple w/o road yet)

import fs from 'fs';
import path from 'path';
import https from 'https';

const [, , GPX_PATH, SLUG] = process.argv;
if (!GPX_PATH || !SLUG) {
  console.error('usage: node scripts/analyze-race.mjs <gpx> <slug>');
  process.exit(2);
}

function parseGpx(xml) {
  const pts = [];
  const re = /<trkpt\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>|<trkpt\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"\s*\/>/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[1]) {
      const inner = m[3] || '';
      const e = inner.match(/<ele>([-\d.]+)<\/ele>/);
      pts.push({ lat: parseFloat(m[1]), lon: parseFloat(m[2]), ele: e ? parseFloat(e[1]) : null });
    } else {
      pts.push({ lat: parseFloat(m[4]), lon: parseFloat(m[5]), ele: null });
    }
  }
  return pts;
}

function haversine(a, b) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function downsample(pts, minDistM = 25) {
  if (!pts.length) return [];
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += haversine(pts[i - 1], pts[i]);
    if (acc >= minDistM) { out.push(pts[i]); acc = 0; }
  }
  if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
  return out;
}

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', c => (body += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        } else reject(new Error('HTTP ' + res.statusCode));
      });
    }).on('error', reject);
  });
}

async function fetchElevations(pts) {
  const batchSize = 100;
  const result = new Array(pts.length);
  for (let i = 0; i < pts.length; i += batchSize) {
    const batch = pts.slice(i, i + batchSize);
    const locs = batch.map(p => `${p.lat},${p.lon}`).join('|');
    const url = `https://api.opentopodata.org/v1/aster30m?locations=${locs}`;
    let data;
    try { data = await getJSON(url); }
    catch (e) {
      console.error('aster30m failed; fallback srtm90m', e.message);
      data = await getJSON(`https://api.opentopodata.org/v1/srtm90m?locations=${locs}`);
    }
    if (!data || !Array.isArray(data.results)) throw new Error('bad elevation response');
    for (let k = 0; k < batch.length; k++) result[i + k] = data.results[k]?.elevation ?? null;
    await new Promise(r => setTimeout(r, 1100));
    process.stderr.write(`  elev fetched ${Math.min(i + batchSize, pts.length)}/${pts.length}\n`);
  }
  return result;
}

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
  if (g < 5) return 'runnable';
  if (g < 10) return 'mixed';
  if (g < 20) return 'technical';
  return 'boss';
}

async function main() {
  console.error('parsing GPX:', GPX_PATH);
  const xml = fs.readFileSync(GPX_PATH, 'utf8');
  const raw = parseGpx(xml);
  console.error(`  raw points: ${raw.length}`);
  const hasEle = raw.some(p => p.ele != null);
  console.error(`  GPX embedded elevation: ${hasEle ? 'yes' : 'no'}`);

  let cumFull = 0;
  for (let i = 1; i < raw.length; i++) cumFull += haversine(raw[i - 1], raw[i]);
  console.error(`  raw distance: ${(cumFull / 1000).toFixed(2)} km`);

  const sparse = downsample(raw, 25);
  console.error(`  sampled: ${sparse.length}`);

  let eles;
  if (hasEle) {
    eles = sparse.map(p => p.ele);
    const missing = eles.filter(e => e == null).length;
    if (missing > 0) {
      console.error(`  ${missing} missing ele, filling from neighbors`);
      for (let i = 0; i < eles.length; i++) if (eles[i] == null) eles[i] = eles[i - 1] ?? eles[i + 1] ?? 0;
    }
  } else {
    console.error('fetching ASTER 30m elevations...');
    eles = await fetchElevations(sparse);
  }
  const eleSm = smooth(eles, 4);

  const cum = [0];
  for (let i = 1; i < sparse.length; i++) cum.push(cum[i - 1] + haversine(sparse[i - 1], sparse[i]));

  const maxEle = Math.max(...eleSm);
  const minEle = Math.min(...eleSm);
  let gain = 0, loss = 0;
  for (let i = 1; i < eleSm.length; i++) {
    const d = eleSm[i] - eleSm[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }

  const segLen = 100;
  const segs = [];
  let sStart = 0;
  for (let i = 1; i < sparse.length; i++) {
    if (cum[i] - cum[sStart] >= segLen || i === sparse.length - 1) {
      const dist = cum[i] - cum[sStart];
      const dele = eleSm[i] - eleSm[sStart];
      const grade = (dele / Math.max(dist, 1)) * 100;
      segs.push({
        startKm: +(cum[sStart] / 1000).toFixed(3),
        endKm: +(cum[i] / 1000).toFixed(3),
        distM: +dist.toFixed(1),
        startEle: +eleSm[sStart].toFixed(1),
        endEle: +eleSm[i].toFixed(1),
        dEle: +dele.toFixed(1),
        gradePct: +grade.toFixed(2),
        class: classify(grade),
      });
      sStart = i;
    }
  }

  const buckets = { runnable: 0, mixed: 0, technical: 0, boss: 0 };
  for (const s of segs) buckets[s.class] += s.distM;

  const histEdges = [-30, -20, -15, -10, -5, -2, 0, 2, 5, 10, 15, 20, 30];
  const hist = new Array(histEdges.length - 1).fill(0);
  for (const s of segs) {
    const g = s.gradePct;
    for (let i = 0; i < histEdges.length - 1; i++) {
      if (g >= histEdges[i] && g < histEdges[i + 1]) { hist[i] += s.distM; break; }
    }
  }

  const fakeFlats = [];
  let rAcc = 0, rStart = null;
  for (const s of segs) {
    if (s.gradePct >= 1 && s.gradePct < 4) { if (rStart == null) rStart = s.startKm; rAcc += s.distM; }
    else { if (rAcc >= 300) fakeFlats.push({ startKm: rStart, endKm: s.startKm, lengthM: +rAcc.toFixed(0) }); rAcc = 0; rStart = null; }
  }

  const gs = segs.map(s => s.gradePct);
  const meanG = gs.reduce((a, b) => a + b, 0) / gs.length;
  const stdG = Math.sqrt(gs.reduce((a, b) => a + (b - meanG) ** 2, 0) / gs.length);

  const winM = 1000;
  let choppy = { startKm: 0, endKm: 0, std: 0 };
  for (let i = 0; i < segs.length; i++) {
    let j = i;
    while (j < segs.length && segs[j].endKm - segs[i].startKm < winM / 1000) j++;
    if (j >= segs.length) break;
    const wg = segs.slice(i, j).map(x => x.gradePct);
    const m = wg.reduce((a, b) => a + b, 0) / wg.length;
    const s = Math.sqrt(wg.reduce((a, b) => a + (b - m) ** 2, 0) / wg.length);
    if (s > choppy.std) choppy = { startKm: segs[i].startKm, endKm: segs[j].endKm, std: +s.toFixed(2) };
  }

  const bounds = {
    minLat: Math.min(...sparse.map(p => p.lat)),
    maxLat: Math.max(...sparse.map(p => p.lat)),
    minLon: Math.min(...sparse.map(p => p.lon)),
    maxLon: Math.max(...sparse.map(p => p.lon)),
  };

  const track = sparse.map((p, i) => ({
    lat: +p.lat.toFixed(6),
    lon: +p.lon.toFixed(6),
    km: +(cum[i] / 1000).toFixed(3),
    ele: +eleSm[i].toFixed(1),
  }));

  const full = {
    generatedAt: new Date().toISOString(),
    source: GPX_PATH,
    eleSource: hasEle ? 'GPX embedded' : 'OpenTopoData ASTER 30m',
    bounds,
    totals: {
      distanceM: +cumFull.toFixed(1),
      distanceKm: +(cumFull / 1000).toFixed(2),
      gainM: +gain.toFixed(0),
      lossM: +loss.toFixed(0),
      maxEleM: +maxEle.toFixed(1),
      minEleM: +minEle.toFixed(1),
      vertRatio: +((gain / cumFull) * 1000).toFixed(1),
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
      hist: hist.map(x => +x.toFixed(0)),
      choppiestKm: choppy,
    },
    fakeFlats,
    elevationProfile: track.map(t => ({ km: t.km, ele: t.ele })),
    segments: segs,
    track,
  };

  // Compact embed (profile ~120 pts, track ~200 pts; road distance filled later)
  const pStep = Math.max(1, Math.floor(track.length / 120));
  const p = [];
  for (let i = 0; i < track.length; i += pStep) p.push([track[i].km, Math.round(track[i].ele)]);
  p.push([track[track.length - 1].km, Math.round(track[track.length - 1].ele)]);
  const mStep = Math.max(1, Math.floor(track.length / 200));
  const m = [];
  for (let i = 0; i < track.length; i += mStep) m.push([+track[i].lat.toFixed(5), +track[i].lon.toFixed(5), +track[i].km.toFixed(2)]);
  const compact = { t: full.totals, r: full.runnability, s: full.slope, ff: full.fakeFlats, p, b: full.bounds, m };

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(`data/${SLUG}-analysis.json`, JSON.stringify(full, null, 2));
  fs.writeFileSync(`data/${SLUG}-compact.json`, JSON.stringify(compact));

  console.error(`wrote data/${SLUG}-analysis.json & data/${SLUG}-compact.json`);
  console.error(JSON.stringify(full.totals, null, 2));
  console.error('runnability:', JSON.stringify(full.runnability));
  console.error('choppiest:', JSON.stringify(full.slope.choppiestKm));
}

main().catch(e => { console.error(e); process.exit(1); });
