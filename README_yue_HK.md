# EB Auto Score

[English](./README.md) | [中文（香港）](./README_zh_HK.md) | [粵語（香港）](./README_yue_HK.md)

一個用戶腳本，可自動幫 English Builder 上面嘅課節完成/修改分數。
佢會喺課節列表頁面加一個浮動控制面板，你可以設定目標分數（固定或者隨機範圍）、
可選嘅課節之間延遲，同埋要處理邊啲課節（未完成課節，或者同時重做低過分數門檻嘅課節），
然後針對當前課節或者批次自動處理晒所有符合條件嘅課節。

## 安裝

1. 喺瀏覽器度安裝用戶腳本管理器：
   - [Tampermonkey](https://www.tampermonkey.net/)（Chrome、Firefox、Edge、Safari）
   - [Violentmonkey](https://violentmonkey.github.io/)（Chrome、Firefox、Edge）
2. 撳[呢度](https://github.com/Si-Jiu/auto_eb_score/releases/latest/download/eb_auto_score.user.js)然後安裝腳本。
3. 登錄 English Builder — 控制面板會自動喺右上角出現。

### 更新

用戶腳本管理器會自動檢查更新。
如果新版本冇出現，請喺管理器度打開腳本頁面然後撳 **檢查更新**。

## 手動構建

需求：[Node.js](https://nodejs.org/) 同 [pnpm](https://pnpm.io/)。

```bash
pnpm install
pnpm build      # 構建一次
pnpm dev        # 構建並監聽變更
```

輸出係 `eb_auto_score.user.js`。

## 項目架構

```
├── build.js                 esbuild 構建腳本
├── src/
│   ├── index.js             入口點，主要自動化邏輯
│   ├── ui.js                浮動面板 UI 同日誌
│   ├── state.js             狀態持久化 (localStorage)
│   ├── scoring.js           分數提交 API
│   ├── lesson.js            課節導航同任務選擇
│   ├── utils.js             輔助函數 (waitMs, formatSeconds)
│   ├── style.css            面板樣式
│   └── i18n/
│       ├── index.js         國際化輔助
│       ├── en_US.js
│       ├── zh_HK.js
│       └── yue_HK.js
├── dist/                    構建輸出目錄
└── eb_auto_score.user.js    最終用戶腳本（構建後產出）
```

## 授權

[MIT](./LICENSE)
