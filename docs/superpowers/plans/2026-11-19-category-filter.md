# 課節類別篩選 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在面板的 Filter 加入 Teacher's Pick / Student's Pick 類別篩選，只評分指定類別的課節。

**Architecture:** 把「一行課節是否符合篩選」抽成無 DOM 依賴的純函式 `src/filter.js`，由 `lesson.js` 的 `pickRandomTask()` 呼叫；UI、localStorage 與 i18n 按現有模式擴充。

**Tech Stack:** 原生 ES modules、esbuild、`node:test`、Material Web components。

**Spec:** `docs/superpowers/specs/2026-11-19-category-filter-design.md`

## Global Constraints

- 不新增任何依賴。
- 測試指令：`node --test test/`；建置指令：`pnpm build`（輸出 `dist/eb_auto_score.user.js` 及根目錄 `eb_auto_score.user.js`）。
- Checkbox id：`eb-filter-teachers-pick`、`eb-filter-students-pick`。
- Config 欄位：`filterTeachersPick`、`filterStudentsPick`（boolean）。
- i18n 標籤逐字使用：英文 `Teacher’s Pick` / `Student’s Pick`；`zh_HK` 與 `yue_HK` 均為 `老師精選` / `學生精選`。
- 類別圖示文字為 `teachers_pick` / `students_pick`（`<i class="wmi">` 的 textContent）。
- 不改動 SCORM／自動評分流程。
- 除非使用者明確要求，不要建立 git commit。

## Review Focus

- 課節列缺少類別圖示（`<i>` 不存在或類別未知）而類別篩選生效時，必須排除該列且不拋錯。
- 只勾類別、冇勾任何狀態篩選時，必須包括已完成／滿分的該類課節（用家已確認的語意）。
- 全部 checkbox 都冇勾時，結果必須仍然係「冇符合課節」，不能變成「所有課節」。
- 舊版 localStorage 設定缺少新欄位時，面板必須正常載入，兩個新 checkbox 預設不勾。
- 頁面上其他只有 2 欄的表格（`cells.length < 5`）必須繼續被忽略，不能因讀 `cells[0]` 而出錯。

---

### Task 1: 純篩選函式 `src/filter.js` 與單元測試

**Files:**
- Create: `src/filter.js`
- Test: `test/filter.test.mjs`

**Interfaces:**
- Produces: `lessonMatches(category: string, status: string, scoreNum: number, settings: object) -> boolean`
  - `settings` 欄位：`filterIncomplete`、`filterLowScore`、`filterScoreBelow`、`filterTeachersPick`、`filterStudentsPick`
- Produces: `categoryFromCell(cell: Element | null) -> string`，回傳去空白後的圖示文字，冇圖示時回傳 `''`。

- [ ] **Step 1: Write the failing test**

Create `test/filter.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert';
import { lessonMatches, categoryFromCell } from '../src/filter.js';

const base = {
    filterIncomplete: false,
    filterLowScore: false,
    filterScoreBelow: 100,
    filterTeachersPick: false,
    filterStudentsPick: false,
};
const S = over => ({ ...base, ...over });
const TEACHER = 'teachers_pick';
const STUDENT = 'students_pick';

test('no filters selected matches nothing', () => {
    assert.equal(lessonMatches(TEACHER, 'new', NaN, S({})), false);
    assert.equal(lessonMatches(STUDENT, 'completed', 100, S({})), false);
});

test('teacher category only matches every status in that category', () => {
    const s = S({ filterTeachersPick: true });
    assert.equal(lessonMatches(TEACHER, 'new', NaN, s), true);
    assert.equal(lessonMatches(TEACHER, 'completed', 100, s), true);
    assert.equal(lessonMatches(STUDENT, 'new', NaN, s), false);
});

test('student category only matches students pick', () => {
    const s = S({ filterStudentsPick: true });
    assert.equal(lessonMatches(STUDENT, 'incomplete', NaN, s), true);
    assert.equal(lessonMatches(TEACHER, 'incomplete', NaN, s), false);
});

test('both categories selected matches either', () => {
    const s = S({ filterTeachersPick: true, filterStudentsPick: true });
    assert.equal(lessonMatches(TEACHER, 'completed', 100, s), true);
    assert.equal(lessonMatches(STUDENT, 'completed', 100, s), true);
});

test('category and incomplete are combined with AND', () => {
    const s = S({ filterTeachersPick: true, filterIncomplete: true });
    assert.equal(lessonMatches(TEACHER, 'new', NaN, s), true);
    assert.equal(lessonMatches(TEACHER, 'incomplete', NaN, s), true);
    assert.equal(lessonMatches(TEACHER, 'completed', 100, s), false);
    assert.equal(lessonMatches(STUDENT, 'new', NaN, s), false);
});

test('low score filter still applies inside a category', () => {
    const s = S({ filterStudentsPick: true, filterLowScore: true, filterScoreBelow: 60 });
    assert.equal(lessonMatches(STUDENT, 'completed', 59, s), true);
    assert.equal(lessonMatches(STUDENT, 'completed', 60, s), false);
    assert.equal(lessonMatches(STUDENT, 'completed', NaN, s), false);
});

test('incomplete matches any category when no category filter', () => {
    const s = S({ filterIncomplete: true });
    assert.equal(lessonMatches('', 'new', NaN, s), true);
    assert.equal(lessonMatches(TEACHER, 'completed', 100, s), false);
});

test('missing category is excluded when a category filter is active', () => {
    const s = S({ filterTeachersPick: true });
    assert.equal(lessonMatches('', 'new', NaN, s), false);
    assert.equal(lessonMatches('unknown_category', 'new', NaN, s), false);
});

test('categoryFromCell reads the wmi icon text and handles missing cells', () => {
    assert.equal(categoryFromCell({ querySelector: () => ({ textContent: ' teachers_pick ' }) }), 'teachers_pick');
    assert.equal(categoryFromCell({ querySelector: () => null }), '');
    assert.equal(categoryFromCell(null), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/filter.test.mjs`
Expected: FAIL — `Cannot find module ... src/filter.js`（或 `ERR_MODULE_NOT_FOUND`）。

- [ ] **Step 3: Create `src/filter.js`**

實作兩個匯出函式，無其他 import：

- `categoryFromCell(cell)`：`cell` 為 null 或沒有 `querySelector` 時回傳 `''`；否則取 `cell.querySelector('i')`，有圖示就回傳 `icon.textContent.trim()`，冇就回傳 `''`。
- `lessonMatches(category, status, scoreNum, settings)`：
  1. `const hasCategory = settings.filterTeachersPick || settings.filterStudentsPick;`
  2. 若 `hasCategory`，類別必須符合：`(settings.filterTeachersPick && category === 'teachers_pick') || (settings.filterStudentsPick && category === 'students_pick')`；不符即回傳 `false`。
  3. `const hasStatus = settings.filterIncomplete || settings.filterLowScore;`
  4. 若 `!hasStatus`：回傳 `Boolean(hasCategory)`（全冇勾 → `false`；只勾類別 → `true`）。
  5. 狀態比對：`(settings.filterIncomplete && (status === 'new' || status === 'incomplete')) || (settings.filterLowScore && !isNaN(scoreNum) && scoreNum < settings.filterScoreBelow)`。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/filter.test.mjs`
Expected: PASS，9 個 test 全綠。

- [ ] **Step 5: Run the full suite**

Run: `node --test test/`
Expected: PASS（包含原有 `module-scope.test.mjs`）。

---

### Task 2: `pickRandomTask()` 使用類別篩選

**Files:**
- Modify: `src/lesson.js:1`（import）、`src/lesson.js:143-176`（`pickRandomTask`）

**Interfaces:**
- Consumes: Task 1 的 `lessonMatches`、`categoryFromCell`。

- [ ] **Step 1: Add the import**

在 `src/lesson.js` 頂部加入：

```js
import { lessonMatches, categoryFromCell } from './filter.js';
```

- [ ] **Step 2: Replace the inline matching in `pickRandomTask()`**

在讀取 `cells` 與 `link` 之後，新增：

```js
const category = categoryFromCell(cells[0]);
```

刪除現有的 `let match = false;` 至 `if (match)` 之間的狀態／分數判斷，改為：

```js
if (lessonMatches(category, status, scoreNum, settings)) {
    tasks.push({
        id: link.dataset.id,
        name: cells[2].textContent.trim().replace(/\s+/g, ' ').substring(0, 70),
        status: cells[3].textContent.trim(),
        score: scoreText
    });
}
```

保留現有 `cells.length < 5` 與 `link` 檢查（2 欄表格繼續被忽略）。

- [ ] **Step 3: Run the full suite**

Run: `node --test test/`
Expected: PASS。

- [ ] **Step 4: Verify no inline status matching remains**

Run: `grep -n "filterIncomplete\|filterLowScore" src/lesson.js`
Expected: 無輸出（這些判斷已移到 `filter.js`）。

---

### Task 3: UI、持久化與 i18n

**Files:**
- Modify: `src/ui.js`（Filter fieldset、filter event listeners）
- Modify: `src/state.js:20-36`（`readUIConfig`）、`src/state.js:47-60`（`applyConfigToUI`）
- Modify: `src/index.js:57-78`（`onFilterChange`）
- Modify: `src/i18n/en_US.js`、`src/i18n/zh_HK.js`、`src/i18n/yue_HK.js`

**Interfaces:**
- Produces: DOM ids `eb-filter-teachers-pick`、`eb-filter-students-pick`。
- Produces: config keys `filterTeachersPick`、`filterStudentsPick`。

- [ ] **Step 1: Add the two checkboxes to the Filter fieldset in `src/ui.js`**

在「Score below」`<label>` 之後、「Current lesson」`<label>` 之前插入：

```html
<label style="display:flex;align-items:center;gap:4px;cursor:pointer">
    <md-checkbox id="eb-filter-teachers-pick"></md-checkbox>
    <span style="font-size:14px;color:var(--md-sys-color-on-surface)" data-i18n="teachersPick">Teacher’s Pick</span>
</label>
<label style="display:flex;align-items:center;gap:4px;cursor:pointer">
    <md-checkbox id="eb-filter-students-pick"></md-checkbox>
    <span style="font-size:14px;color:var(--md-sys-color-on-surface)" data-i18n="studentsPick">Student’s Pick</span>
</label>
```

在現有 `// Filter` 的三個 `addEventListener('change', onFilterChange)` 之後，加入這兩個 checkbox 的同款 listener。

- [ ] **Step 2: Persist the new options in `src/state.js`**

`readUIConfig()` 回傳物件加：

```js
filterTeachersPick: document.getElementById('eb-filter-teachers-pick').checked,
filterStudentsPick: document.getElementById('eb-filter-students-pick').checked,
```

`applyConfigToUI()` 加（保留 `!= null` 檢查，舊設定缺欄位時不改動 checkbox）：

```js
if (c.filterTeachersPick != null) document.getElementById('eb-filter-teachers-pick').checked = c.filterTeachersPick;
if (c.filterStudentsPick != null) document.getElementById('eb-filter-students-pick').checked = c.filterStudentsPick;
```

- [ ] **Step 3: Extend the mutual-exclusion logic in `src/index.js`**

把 `onFilterChange()` 改為：

```js
function onFilterChange() {
    const inc = document.getElementById('eb-filter-incomplete');
    const low = document.getElementById('eb-filter-low-score');
    const cur = document.getElementById('eb-filter-current');
    const teacher = document.getElementById('eb-filter-teachers-pick');
    const student = document.getElementById('eb-filter-students-pick');
    const scoreInput = document.getElementById('eb-filter-score');
    const listFilters = [inc, low, teacher, student];

    if (cur.checked) {
        listFilters.forEach(el => { el.disabled = true; });
        scoreInput.disabled = true;
    } else {
        listFilters.forEach(el => { el.disabled = false; });
        scoreInput.disabled = false;
        cur.disabled = listFilters.some(el => el.checked);
    }
    persistConfig();
}
```

- [ ] **Step 4: Add translations**

在三個 i18n 檔的 `incompleteNewOnly` 一行附近加入：

- `src/i18n/en_US.js`：`teachersPick: 'Teacher’s Pick',` / `studentsPick: 'Student’s Pick',`
- `src/i18n/zh_HK.js`：`teachersPick: '老師精選',` / `studentsPick: '學生精選',`
- `src/i18n/yue_HK.js`：`teachersPick: '老師精選',` / `studentsPick: '學生精選',`

- [ ] **Step 5: Run the full suite**

Run: `node --test test/`
Expected: PASS。

- [ ] **Step 6: Build**

Run: `pnpm build`
Expected: exit 0，`dist/eb_auto_score.user.js` 與根目錄 `eb_auto_score.user.js` 更新。

- [ ] **Step 7: Verify the built bundle contains the new wiring**

Run: `grep -c "eb-filter-teachers-pick" eb_auto_score.user.js && grep -c "eb-filter-students-pick" eb_auto_score.user.js`
Expected: 兩個數字都 ≥ 1。

---

### Task 4: 端到端驗證（登入中的瀏覽器）

**Files:**
- 不修改原始碼；使用建置產物與現有登入 session。

**Interfaces:**
- Consumes: Task 3 的建置產物 `eb_auto_score.user.js`。

- [ ] **Step 1: Inject the userscript into the logged-in lesson list page**

用 Playwright CDP（偵察時留下的 `:9222`）在課堂列表頁執行 `page.addScriptTag({ path: 'eb_auto_score.user.js' })`。

- [ ] **Step 2: Verify the panel renders both checkboxes**

檢查 `#eb-panel` 內存在 `#eb-filter-teachers-pick` 與 `#eb-filter-students-pick`，且標籤文字為 `Teacher’s Pick` / `Student’s Pick`。

- [ ] **Step 3: Verify old config compatibility**

先設定 `localStorage.eb_auto_config = '{}'`，重新注入 script；確認兩個新 checkbox 為 unchecked 且無 JS 錯誤。

- [ ] **Step 4: Verify persistence round-trip**

勾選 Teacher's Pick，讀取 `localStorage.eb_auto_config` 確認 `"filterTeachersPick":true`；重新載入頁面並注入 script，確認 checkbox 保持勾選。

- [ ] **Step 5: Verify matching against real rows**

bundle 為 IIFE，不暴露 `lessonMatches`，所以在頁面 context 直接檢查等價條件：

```js
(() => {
    const rows = [...document.querySelectorAll('table')[0].querySelectorAll('tbody tr')];
    return rows.map(r => {
        const c = r.querySelectorAll('td');
        const icon = c[0] && c[0].querySelector('i');
        return { cat: icon ? icon.textContent.trim() : '', status: c[3].textContent.trim().toLowerCase() };
    }).filter(x => x.cat === 'teachers_pick' && (x.status === 'new' || x.status === 'incomplete'));
})()
```

Expected: 回傳非空陣列，且沒有 `completed` 項目；另外 `teachers_pick` 而 `completed` 的課節不出現在結果中。
