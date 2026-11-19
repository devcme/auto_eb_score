# 課節類別篩選（Teacher's Pick / Student's Pick）設計

日期：2026-11-19
類型：小型改動

## 意圖

讓面板的 Filter 可以只挑「Teacher's Pick」或「Student's Pick」類別的課節來評分，方便針對性重做或完成特定類別的課節。

## 現況（勘察結果）

- 課堂列表主表格每行 6 欄：`[0]` 類別圖示、`[1]` 發佈日期、`[2]` 課節連結、`[3]` 狀態、`[4]` 分數、`[5]` 到期日。
- 類別圖示為 `<i class="wmi" title="Teacher’s Pick">teachers_pick</i>`；另一類為 `students_pick`。目前 260 行全部帶類別。
- `pickRandomTask()` 已用 `cells[2]/[3]/[4]`，與 6 欄版相容，只須新增讀取 `cells[0]`。
- 頁面上的「Category: Teacher's Pick | Student's Pick」只是圖例，不是可操作控件。

## 已決定的行為

1. Filter 新增兩個 checkbox：**Teacher's Pick**、**Student's Pick**。
2. 類別是**額外約束**（使用者已選）：
   - 兩個都唔勾：不限類別。
   - 勾一個或兩個：候選課節的類別必須相符（兩個類別之間為 OR）。
3. 與現有狀態篩選以 **AND** 組合：
   - 狀態條件（Incomplete、Score below）內部維持 OR。
   - 冇勾任何狀態條件、但有勾類別 → 該類別的全部課節都符合（包括已完成）。
   - 全部篩選都冇勾 → 沒有符合課節（維持現行行為）。
4. **Current lesson** 的互斥規則延伸：勾 Current lesson 時，兩個類別 checkbox 一併停用；勾任何類別時，Current lesson 停用。
5. 新選項寫入 localStorage 配置（`eb_auto_config`），重載後還原。
6. 讀不到類別圖示的橫行視為「無類別」，在類別篩選生效時不會入選。
7. i18n：英文 `Teacher’s Pick` / `Student’s Pick`；繁中與粵語 `老師精選` / `學生精選`。

## 考慮過的其他方案

- **類別與現有篩選 OR 並列**：會令「Teacher's Pick」連已完成滿分課節都評埋，不符合針對性重做嘅用途，否決。
- **必須同時有狀態篩選**：只勾類別時會靜靜地變成「冇符合課節」，容易困惑，否決。

## 改動範圍

- `src/ui.js`：新增兩個 checkbox 及 change 事件。
- `src/index.js`：`onFilterChange()` 的停用／互斥邏輯。
- `src/state.js`：`readUIConfig()`、`applyConfigToUI()` 增加欄位。
- `src/lesson.js`：把比對邏輯抽成純函式（方便測試），加入類別比對。
- `src/i18n/{en_US,zh_HK,yue_HK}.js`：新增標籤。
- `test/`：為比對邏輯加單元測試（類別單選、類別+Incomplete、只勾類別、全不勾、無類別橫行）。

## 非目標

- 不改動網站的 Category 圖例或網站本身的篩選。
- 不改動自動評分／SCORM 流程。
- 不新增「依類別統計」之類功能。
