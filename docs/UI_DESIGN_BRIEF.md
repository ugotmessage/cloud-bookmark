# Cloud Bookmark v2 — UI/UX Design Brief

## 1. 專案目標

重新設計現有的個人雲端書籤管理器。現版功能可用，但資訊層級與操作直覺仍可改善。

新版本優先目標：

1. 快速找到並開啟書籤
2. **Mobile-first 手機優先**
3. 簡單整理，不做過度複雜的 SaaS
4. 降低畫面雜訊
5. 桌面版提供更好的管理效率
6. 保留既有 JSON 資料匯入能力
7. 適合部署至 Cloudflare Pages + Worker + D1

產品定位：**快速的個人 Bookmark Launcher + Organizer**，不是企業 Knowledge Management SaaS。

---

## 2. 最重要的設計原則

### Mobile 不是 Desktop 的縮小版

原本使用「資料夾垂直排列 + Accordion 展開」是因為手機操作方便，這個核心概念要保留。

- **Mobile = 使用書籤 / 快速瀏覽 / 快速開啟**
- **Desktop = 整理書籤 / 拖曳 / 大量管理**

同一份資料，但桌機與手機可以採用不同資訊架構。

當設計衝突時，優先順序：

1. 手機使用性
2. 開啟書籤速度
3. 找到書籤速度
4. 資訊層級清楚
5. 新增書籤容易
6. 資料夾整理容易
7. Desktop power features
8. 裝飾與動畫

---

## 3. Mobile UI — 最高優先

### 主結構

保留垂直 Scroll + Folder Accordion：

```text
┌────────────────────────────┐
│ 🔖 Cloud Bookmark    🔍  ＋ │
├────────────────────────────┤
│ 🔍 搜尋所有書籤...          │
├────────────────────────────┤
│ ⭐ 常用                     │
│ ChatGPT  GitHub  XQ  NAS   │
├────────────────────────────┤
│ 📁 股票                12 › │
├────────────────────────────┤
│ 📁 AI                  18 ▼ │
│                            │
│  🟣 ChatGPT             ⋯  │
│     chatgpt.com             │
│                            │
│  ⚫ GitHub               ⋯  │
│     github.com              │
│                            │
│  🟠 Claude               ⋯  │
│     claude.ai               │
├────────────────────────────┤
│ 📁 工作                25 › │
├────────────────────────────┤
│ 📁 Server              14 › │
└────────────────────────────┘
```

### Folder

- 資料夾垂直排列。
- 點 Folder Header 展開 / 收合。
- 顯示書籤數量。
- 記住展開 / 收合狀態。
- **不要**強迫使用者進 Folder page 後再一直按 Back。
- 仍然允許一路往下 Scroll 看不同 Folder。

### Bookmark Row

每筆顯示：

- favicon
- 書籤名稱
- domain
- favorite/star 狀態（可選）
- `⋯` 操作選單

不要常駐顯示「編輯 / 移動 / 刪除」三顆按鈕。

```text
🟣 ChatGPT                         ⋯
   chatgpt.com
```

`⋯` 可包含：

```text
開啟
新分頁開啟
────────────
加入常用
移動到...
編輯
複製網址
────────────
刪除
```

### 快速操作

- Global Search
- Add Bookmark
- Favorites 快捷區
- Add 要方便單手觸碰
- Mobile 編輯 / 新增建議使用 Bottom Sheet / Modal

---

## 4. Desktop UI

Desktop 要利用橫向空間，不需要照搬 Mobile Accordion。

建議：Sidebar + Main Content。

```text
┌───────────────────────────────────────────────────────────────┐
│ 🔖 Cloud Bookmark      🔍 Search...              ＋ Add       │
├───────────────┬───────────────────────────────────────────────┤
│ ⌂ Home        │ AI                                            │
│ ⭐ Favorites  │                                               │
│ 🕘 Recent     │ [ ChatGPT ] [ GitHub ] [ Claude ]             │
│ 📥 Unsorted   │                                               │
│               │ [ Gemini  ] [ OpenAI ] [ Groq   ]             │
│ Folders       │                                               │
│ 📁 Work   28  │                                               │
│ 📁 Stocks 42  │                                               │
│ 📁 AI     31  │                                               │
│ 📁 Server 17  │                                               │
│ ＋ Folder     │                                  ▦  /  ☰      │
└───────────────┴───────────────────────────────────────────────┘
```

Desktop 建議能力：

- Persistent sidebar
- 一次顯示單一 Folder 內容
- Drag & Drop
- Card / Compact List 切換
- 右鍵 context menu（可選）
- 更適合大量整理與移動

---

## 5. Home

Home 可以是一個非常輕量的 Dashboard：

### Favorites
常用 / Star 書籤。

### Recent
最近開啟 10–20 筆。

### Folder Overview
可選擇顯示各資料夾名稱與數量。

不要做成 Analytics Dashboard，不需要圖表。

---

## 6. Search

Search 是核心功能之一。

Global Search 搜尋所有 Folder，至少搜尋：

- title
- URL
- domain
- folder name

Desktop 支援：

```text
Cmd + K
Ctrl + K
```

例如：

```text
┌─────────────────────────────────────────────┐
│ 🔍 cloudflare                              │
├─────────────────────────────────────────────┤
│ Cloudflare Dashboard                Server │
│ dash.cloudflare.com                        │
│                                             │
│ Cloudflare Workers                  Work   │
│ developers.cloudflare.com                  │
└─────────────────────────────────────────────┘
```

搜尋優先考慮速度，不需要花俏動畫。

AI / Semantic Search 可作未來版本，不是 v2 必要功能。

---

## 7. Add Bookmark Flow

現版一直顯示完整新增表單，v2 不要繼續佔用主畫面。

入口：

- Desktop：右上 `＋ Add`
- Mobile：Top button 或 Floating Action Button

推薦流程：

```text
＋
↓
貼 URL
↓
自動填 title + favicon（如果可行）
↓
選 Folder
↓
Save
```

v2 欄位只需要：

- URL
- title/name
- folder

Favorite / note / tags 可之後再加，不要過載。

---

## 8. Views

Desktop 至少提供：

### Card

```text
┌──────────────┐ ┌──────────────┐
│ 🟣 ChatGPT  ⋯│ │ ⚫ GitHub    ⋯│
│ chatgpt.com  │ │ github.com   │
└──────────────┘ └──────────────┘
```

### Compact List

```text
🟣 ChatGPT       chatgpt.com                    ⋯
⚫ GitHub         github.com                     ⋯
🟠 Cloudflare    cloudflare.com                 ⋯
```

記住使用者選擇。

Mobile 以 List 為主。

---

## 9. Folder Requirements

必須支援：

- Create
- Rename
- Delete
- Reorder
- Move bookmark
- Bookmark count
- 未分類 / Unsorted

Desktop 可用 Drag & Drop。

Mobile 建議用 menu/select 移動，Drag & Drop 不是必要條件。

**不能把 Drag & Drop 當唯一操作方式。**

---

## 10. Favorites / Recent

### Favorites

- Star / Unstar
- Favorites view
- Mobile 頂部可有小型 Favorites 快捷區

### Recent

- 記錄最近開啟的 20–50 筆
- 新的在前
- 同一網址避免大量重複
- 只是方便使用，不是分析功能

---

## 11. Import / Export / Migration

目前系統使用 JSON 保存資料。

v2 必須：

- Import JSON
- Export JSON
- 相容舊 bookmarks JSON，或提供 Migration Layer
- 不要求使用者手動整理舊資料

```text
Existing bookmarks.json
        ↓
Import / Migration
        ↓
Cloudflare storage
```

正式 bookmarks JSON 不應 Commit 進 Git。

---

## 12. Deployment Context

目標架構：

```text
Cloudflare Pages
      +
Cloudflare Worker
      +
Cloudflare D1
```

前端不應依賴 PHP，透過 API 存取資料。

Backend API 的最終 schema 不屬於純 UI 設計階段，可以先 mock data。

---

## 13. Visual Direction

參考感覺：

- Raindrop.io
- Linkwarden
- Linear
- Notion
- Fabric

不是直接 Clone。

希望：

- clean
- modern
- low distraction
- 資訊密度適中
- hierarchy 清楚
- subtle border
- subtle shadow
- accent color 克制

目前產品使用紫色，可以保留為 Accent Color，但不要整頁大量紫色。

建議：

- Neutral background
- Light / Dark mode
- 8–10px radius 為主
- 避免到處 16–20px 大圓角
- 避免每個區塊都有大型 shadow
- Red 只用於 destructive action
- Transition 約 150–200ms

---

## 14. Responsive Strategy

### Mobile `< 768px`

- Accordion folders
- Bookmark list
- Bottom Sheet / Modal
- Mobile-first touch targets

### Tablet `768–1024px`

可由設計者提出 Compact Sidebar 或 Hybrid Navigation。

### Desktop `> 1024px`

- Persistent sidebar
- Main content panel
- Card/List switch
- Drag & Drop management

---

## 15. v2 Must Have

- Responsive UI
- Mobile accordion folder browsing
- Desktop sidebar navigation
- Global search
- Folder search/filter
- Add/Edit/Delete bookmark
- Move bookmark
- Create/Rename/Delete/Reorder folder
- Favorites
- Recent
- Favicon
- Desktop Card/List mode
- JSON import/export
- Light/Dark mode
- Cloudflare-compatible frontend

---

## 16. Not Required in v2

不要為以下功能過度設計：

- Team collaboration
- Roles / permissions
- Comments
- Social sharing
- AI classification
- Embeddings
- Semantic search
- Web archive
- Screenshots
- Complex tags
- Analytics dashboard
- Notifications

---

## 17. Designer / AI Deliverables

請先閱讀目前 repository 程式，再提供：

1. Desktop wireframe
2. Mobile wireframe
3. Home screen
4. Folder screen
5. Global search state
6. Add bookmark state
7. Bookmark context menu
8. Light / Dark visual direction
9. Component hierarchy
10. 主要 UX 決策理由

可選：

- HTML/CSS prototype
- React prototype
- Interactive mockup

**第一階段先做 UI prototype + mock data，不要急著接 Cloudflare D1。**

設計評估以實際使用效率為主，而不是追求視覺新奇。
