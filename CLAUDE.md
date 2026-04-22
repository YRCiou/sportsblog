# YR 運動研究室 — 專案說明

## 網站資訊
- **網址**：https://yrciou.github.io/sportsblog/
- **GitHub Repo**：https://github.com/YRCiou/sportsblog
- **本地路徑**：`C:/claude/UTMB`（舊電腦）；新電腦請 `git clone https://github.com/YRCiou/sportsblog.git`

## 技術架構
- 純靜態 HTML / CSS / JS，無後端框架
- 部署平台：**GitHub Pages**（push 到 main 即自動上線）
- `<base href="/sportsblog/">` — 所有相對路徑從此根目錄算起
- Node.js 腳本用於產生圖片、sitemap 等（需要 **Node.js v20+**，建議 v24）

## 追蹤代碼
- **GTM**：GTM-5FJGQZJ9
- **GA4**：G-THQY15MPB8

## 目錄結構
```
UTMB/
├── index.html                          # 首頁
├── assets/
│   ├── style.css                       # 全站樣式
│   ├── favicon.svg / favicon-*.png     # favicon（PNG 為 Google 所需）
│   ├── og-utmb.jpg                     # UTMB 文章 OG 圖（1200×630）
│   └── og-bjj.jpg                      # BJJ 文章 OG 圖（1200×630）
├── posts/
│   ├── utmb-lottery-odds/index.html    # UTMB 抽籤深度分析
│   ├── utmb-world-events/index.html    # UTMB 世界系列賽行事曆
│   └── bjj-toe-injuries/index.html     # 巴柔腳趾傷害完全指南
└── sitemap.xml
```

## 已完成的 SEO 設定
- 每頁均有：canonical、og:title/description/image、twitter:card、JSON-LD (BlogPosting)
- OG 圖片比例：**1200×630**（1.91:1，Facebook/Messenger 標準）
- OG 圖片自架於 GitHub Pages（避免 Wikimedia 爬蟲封鎖）
- favicon 提供 SVG + PNG（32/48/192px），Google 需要 PNG
- sitemap.xml 已提交 Google Search Console

## 新文章標準流程
1. 在 `posts/` 新增資料夾，複製現有文章的 HTML 結構
2. 準備 OG 圖片：1200×630px JPEG，存於 `assets/`
3. **在 `posts-data.json` 新增文章物件**（首頁與延伸閱讀的唯一資料來源）：
   - `slug` — 資料夾名稱（與 URL 一致）
   - `title` / `author` / `excerpt` / `category` / `createdAt` / `updatedAt`
   - `topics[]` — **由最具體到最通用排列**，最多 7 個。例：
     ```
     ["utmb-lottery", "utmb", "trail-running", "ultra-marathon", "race-statistics", "endurance-sports", "sports"]
     ```
     延伸閱讀演算法以幾何平均計算主題相似度，越具體的共同主題得分越高。
   - `keywords[]` — 關鍵字陣列，中英文均可，用於補充主題評分。
   - `priority` — 整數（預設 1，特別重要可設 2–5），影響延伸閱讀排序。
   - `hero.url` / `hero.thumbUrl` — 首頁縮圖與 OG 圖同一張即可（1200×630）
4. 執行 `node scripts/sync-homepage.js` 同步首頁（或 push 後 GitHub Actions 自動執行）
5. 更新 `sitemap.xml`
6. `git add . && git commit -m "..." && git push origin main`

### 延伸閱讀評分說明（`assets/related.js`）
| 維度 | 計算方式 | 最高分 |
|------|----------|--------|
| 主題相似度 | Σ √(w[i]×w[j])，w = [200,100,50,25,12,5,2] | 無上限 |
| 關鍵字重疊 | 共同 keywords × 12 | 無上限 |
| 同分類加分 | +30 | 30 |
| 熱門度（Supabase views） | min(25, log₂(views+1)×3) | 25 |
| 時效加分 | 發布 90 天內 +5 | 5 |
| 優先級加分 | priority × 3 | — |

最多顯示 5 篇；score = 0 的文章（完全不相關）不顯示。

## 常用指令
```bash
# 新電腦初始化
git clone https://github.com/YRCiou/sportsblog.git
cd sportsblog
npm install

# 部署（push 即上線）
git add .
git commit -m "說明"
git push origin main

# 產生 PNG favicon（需要 @resvg/resvg-js）
node -e "const {Resvg}=require('@resvg/resvg-js'),fs=require('fs'),svg=fs.readFileSync('assets/favicon.svg','utf8');[192,48,32].forEach(s=>{const r=new Resvg(svg,{fitTo:{mode:'width',value:s}});fs.writeFileSync('assets/favicon-'+s+'.png',r.render().asPng())})"
```

## Telegram 橋接（舊電腦專用）
- 腳本：`C:/Users/Innovarad/.claude/telegram-bridge.js`
- 以 PM2 常駐：`pm2 list`、`pm2 restart claude-telegram`
- Bot Token / Chat ID 已寫在腳本中
- Claude CLI 需 Node.js v20+（舊電腦曾因 v18 導致 `Symbol.dispose` 錯誤）

## 注意事項
- 圖片比例務必 1200×630，否則 Messenger 不顯示預覽圖
- 修改 OG 圖後需至 [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) 按「Scrape Again」清除快取
- `fb:app_id` 警告可忽略（純內容網站不需要）
- Google favicon 需 PNG，不接受 SVG
