import { numVal } from './utils.js';

export const STATE_KEY = 'eb_auto_state';
export const CONFIG_KEY = 'eb_auto_config';
export const THEME_KEY = 'eb_auto_theme';

export function loadState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY)); } catch (e) { return null; }
}

export function saveState(s) {
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
}

export function clearState() {
    localStorage.removeItem(STATE_KEY);
}

export function loadConfig() {
    try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; } catch (e) { return {}; }
}

export function readUIConfig() {
    const radios = document.querySelectorAll('md-radio[name="eb-score-mode"]');
    let scoreMode = 'fixed';
    for (const r of radios) {
        if (r.checked) { scoreMode = r.value; break; }
    }

    return {
        scoreMode,
        scoreFixed: numVal('eb-score-fixed', 100),
        scoreMin: numVal('eb-score-min', 85),
        scoreMax: numVal('eb-score-max', 100),
        delayMin: numVal('eb-delay-min', 0),
        delayMax: numVal('eb-delay-max', 0),
        filterIncomplete: document.getElementById('eb-filter-incomplete').checked,
        filterLowScore: document.getElementById('eb-filter-low-score').checked,
        filterTeachersPick: document.getElementById('eb-filter-teachers-pick').checked,
        filterStudentsPick: document.getElementById('eb-filter-students-pick').checked,
        filterCurrent: document.getElementById('eb-filter-current').checked,
        filterScoreBelow: numVal('eb-filter-score', 100),
        logVisible: document.getElementById('eb-log-toggle').getAttribute('data-log-visible') === 'true'
    };
}

export function persistConfig() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(readUIConfig()));
}

export function applyConfigToUI(c, setLogVisible) {
    if (!c) return;

    const radios = document.querySelectorAll('md-radio[name="eb-score-mode"]');
    for (const r of radios) {
        r.checked = r.value === (c.scoreMode || 'fixed');
    }

    if (c.scoreFixed != null) document.getElementById('eb-score-fixed').value = c.scoreFixed;
    if (c.scoreMin != null) document.getElementById('eb-score-min').value = c.scoreMin;
    if (c.scoreMax != null) document.getElementById('eb-score-max').value = c.scoreMax;
    if (c.delayMin != null) document.getElementById('eb-delay-min').value = c.delayMin;
    if (c.delayMax != null) document.getElementById('eb-delay-max').value = c.delayMax;
    if (c.filterIncomplete != null) document.getElementById('eb-filter-incomplete').checked = c.filterIncomplete;
    if (c.filterLowScore != null) document.getElementById('eb-filter-low-score').checked = c.filterLowScore;
    if (c.filterTeachersPick != null) document.getElementById('eb-filter-teachers-pick').checked = c.filterTeachersPick;
    if (c.filterStudentsPick != null) document.getElementById('eb-filter-students-pick').checked = c.filterStudentsPick;
    if (c.filterCurrent != null) document.getElementById('eb-filter-current').checked = c.filterCurrent;
    if (c.filterScoreBelow != null) document.getElementById('eb-filter-score').value = c.filterScoreBelow;
    if (c.logVisible != null) setLogVisible(c.logVisible);
}

export function systemPrefersLight() {
    try { return window.matchMedia('(prefers-color-scheme: light)').matches; } catch (e) { return false; }
}

export function loadTheme() {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark') return t;
    return systemPrefersLight() ? 'light' : 'dark';
}
