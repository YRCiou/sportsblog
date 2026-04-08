/**
 * 從 Wikimedia Commons 搜尋 CC BY 授權圖片
 * 優先選擇 CC BY、CC BY-SA；接受 CC BY-ND、CC BY-NC 次選
 */

const API = 'https://commons.wikimedia.org/w/api.php';
const PREFERRED_LICENSES = ['CC BY 4.0', 'CC BY 3.0', 'CC BY 2.0', 'CC BY-SA 4.0', 'CC BY-SA 3.0'];

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').trim();
}

/**
 * @param {string} topic - 搜尋關鍵字
 * @param {number} limit - 候選數量（預設 20，從中選最佳）
 * @returns {{ url, thumbUrl, title, author, sourceUrl, license, licenseUrl, description } | null}
 */
export async function searchImage(topic, limit = 20) {
  // Step 1: 搜尋檔案
  const searchUrl = `${API}?action=query&list=search&srsearch=${encodeURIComponent('filetype:bitmap ' + topic)}&srnamespace=6&format=json&srlimit=${limit}&origin=*`;
  const searchData = await fetchJson(searchUrl);
  const results = searchData?.query?.search ?? [];

  if (results.length === 0) {
    console.warn(`[wikimedia] 找不到與「${topic}」相關的圖片`);
    return null;
  }

  // Step 2: 批次取得圖片詳細資訊
  const titles = results.map(r => r.title).join('|');
  const infoUrl = `${API}?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url|user|extmetadata|size&iiurlwidth=1200&format=json&origin=*`;
  const infoData = await fetchJson(infoUrl);
  const pages = Object.values(infoData?.query?.pages ?? {});

  // Step 3: 過濾並排序（優先選 CC BY）
  const candidates = [];
  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    if (!info) continue;
    const meta = info.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? '');
    const licenseUrl = stripHtml(meta.LicenseUrl?.value ?? '');
    const artist = stripHtml(meta.Artist?.value ?? info.user ?? '不明');
    const imgUrl = info.url;
    const thumbUrl = info.thumburl ?? imgUrl;

    if (!imgUrl || !license) continue;

    const preferenceIndex = PREFERRED_LICENSES.findIndex(l =>
      license.toUpperCase().startsWith(l.toUpperCase())
    );
    if (preferenceIndex === -1 && !license.toUpperCase().startsWith('CC BY')) continue;

    candidates.push({
      preference: preferenceIndex === -1 ? 99 : preferenceIndex,
      url: imgUrl,
      thumbUrl,
      title: (page.title ?? '').replace(/^File:/, '').replace(/_/g, ' '),
      author: artist,
      sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title ?? '')}`,
      license,
      licenseUrl: licenseUrl || `https://creativecommons.org/licenses/${license.toLowerCase().replace('cc ', '').replace(' ', '/')}/`,
      description: stripHtml(meta.ImageDescription?.value ?? ''),
      width: info.width ?? 0
    });
  }

  if (candidates.length === 0) {
    console.warn(`[wikimedia] 搜尋結果中無 CC BY 授權圖片，主題：${topic}`);
    return null;
  }

  // 優先授權 > 較大尺寸
  candidates.sort((a, b) => a.preference - b.preference || b.width - a.width);
  const best = candidates[0];
  console.log(`[wikimedia] 選定圖片：${best.title} (${best.license})`);
  return best;
}
