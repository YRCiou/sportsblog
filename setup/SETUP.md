# 新電腦初始化指南

## 1. 複製程式碼

```bash
git clone https://github.com/YRCiou/sportsblog.git
cd sportsblog
npm install
```

本地路徑可任意選擇，所有設定均使用相對路徑，不再有硬性路徑限制。

---

## 2. 安裝 Claude Code

```bash
npm install -g @anthropic/claude-code
```

需要 **Node.js v20+**（建議 v24）。

---

## 3. 設定 Claude Hooks（Telegram 確認 + 通知）

### 3-1. 複製 hook 腳本
```bash
# Windows PowerShell
mkdir "$env:USERPROFILE\.claude" -Force
copy .\setup\telegram-confirm.js "$env:USERPROFILE\.claude\telegram-confirm.js"
```

### 3-2. 複製 Claude 設定
```bash
copy .\setup\claude-settings.json "$env:USERPROFILE\.claude\settings.json"
```

> ⚠️ 若已有 `settings.json`，手動合併 hooks 區塊，不要直接覆蓋。

---

## 4. 設定 Git 憑證（推送到 GitHub）

```bash
git config --global credential.helper manager
```

第一次 push 時，Windows 憑證管理員會彈窗要求登入 **YRCiou** 帳號（非 yrciouinnovarad）。

---

## 5. 重建夜間排程任務

排程任務不在 GitHub repo 裡，需手動重建：

在 Claude Code 對話中貼上：

```
以小隊模式：重建夜間 SEO 稽核排程任務（nightly-seo-audit），
設定為台灣時間每天 02:00 執行，
任務內容參照 ./agents/README.md 及 CLAUDE.md。
```

---

## 6. 驗證設定

```bash
# 確認 git remote 正確
git remote -v
# 應顯示：origin https://github.com/YRCiou/sportsblog.git

# 確認 Node 版本
node --version
# 應 >= v20

# 確認 hook 存在
ls ~/.claude/telegram-confirm.js
```

---

## 進度快速掌握（不需要舊電腦的對話記錄）

| 檔案 | 內容 |
|------|------|
| `CLAUDE.md` | 完整版型規範、新文章流程、評分說明 |
| `agents/README.md` | 小隊架構、自動模式說明、排程任務清單 |
| `agents/pm.md` | 小隊長角色定義 |
| `agents/engineer.md` | 工程師角色定義 |
| `agents/inspector.md` | 稽查員稽查清單 |
| `posts-data.json` | 所有文章元資料 |
| `assets/related.js` | 延伸閱讀演算法 |
| `git log --oneline -20` | 最近 20 個 commit 歷程 |
