import '@material/web/button/filled-button.js';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/radio/radio.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/progress/linear-progress.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/iconbutton/icon-button.js';

import css from './style.css';
import { t, applyTranslations, LANG_CODES, langLabel } from './i18n/index.js';
import { formatSeconds } from './utils.js';
import { THEME_KEY, persistConfig, loadTheme } from './state.js';

export let panel = null;
export let isMinimized = false;
export let isRunning = false;
let _stopRequested = false;

export function getStopRequested() { return _stopRequested; }
export function setStopRequested(v) { _stopRequested = v; }

export function log(msg) {
    const el = document.getElementById('eb-log');
    if (el) {
        el.textContent += '[' + new Date().toLocaleTimeString() + '] ' + msg + '\n';
        el.scrollTop = el.scrollHeight;
    }
    console.log('[EB Auto]', msg);
}

export function setLogVisible(v) {
    const el = document.getElementById('eb-log');
    const btn = document.getElementById('eb-log-toggle');
    if (el) el.classList.toggle('eb-log-hidden', !v);
    if (btn) {
        btn.setAttribute('data-log-visible', String(v));
        btn.setAttribute('aria-label', v ? t('hideActivityLog') : t('showActivityLog'));
    }
}

export function setRunning(v) {
    isRunning = v;
    document.getElementById('eb-btn-all').disabled = v;
    document.getElementById('eb-btn-stop').classList.toggle('eb-visible', v);
}

export function applyTheme(theme, persist) {
    const light = theme === 'light';
    document.documentElement.classList.toggle('eb-theme-light', light);
    const btn = document.getElementById('eb-theme-toggle');
    if (btn) {
        btn.setAttribute('aria-label', light ? t('switchToDark') : t('switchToLight'));
    }
    if (persist) localStorage.setItem(THEME_KEY, theme);
}

export async function showCountdown(seconds) {
    if (seconds <= 0) return;
    const el = document.getElementById('eb-countdown');
    const label = document.getElementById('eb-countdown-label');
    const bar = document.getElementById('eb-progress-bar');
    el.classList.add('eb-visible');
    for (let i = seconds; i >= 0; i--) {
        if (_stopRequested) { el.classList.remove('eb-visible'); bar.value = 0; return; }
        label.textContent = t('nextLessonIn', formatSeconds(i));
        bar.value = (seconds - i) / seconds;
        await new Promise(r => setTimeout(r, 1000));
    }
    el.classList.remove('eb-visible');
    bar.value = 0;
}

export function createPanel(onScoreAll, onStop, onThemeChange, onFilterChange, onLangChange, onLogToggle) {
    panel = document.createElement('div');
    panel.id = 'eb-auto-panel';
    panel.innerHTML = `
        <div id="eb-panel-inner">
            <div id="eb-panel-header">
                <span id="eb-panel-title"><span id="eb-panel-title-text" data-i18n="panelTitle">EB Auto Score</span> <span id="eb-panel-version" role="button" tabindex="0" data-i18n-title="aboutTitle">${EB_VERSION}</span></span>
                <button id="eb-theme-toggle" class="eb-theme-btn" aria-label="Switch to light mode" data-i18n-aria="switchToLight">
                    <svg id="eb-theme-icon-dark" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21q-3.75 0-6.37-2.63T3 12q0-3.75 2.63-6.38T12 3q.35 0 .69.03.34.02.67.07-1.03.73-1.64 1.9-.62 1.17-.62 2.5 0 2.23 1.56 3.79Q14.22 12.85 16.45 12.85q1.35 0 2.51-.61 1.16-.62 1.87-1.64.05.33.08.67.02.34.02.68 0 3.75-2.62 6.38T12 21"/></svg>
                    <svg id="eb-theme-icon-light" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17q-2.08 0-3.54-1.46Q7 14.08 7 12t1.46-3.54Q9.92 7 12 7t3.54 1.46Q17 9.92 17 12t-1.46 3.54Q14.08 17 12 17M2 13q-.42 0-.71-.29Q1 12.42 1 12t.29-.71Q1.58 11 2 11h2q.42 0 .71.29.29.29.29.71t-.29.71Q4.42 13 4 13zm18 0q-.42 0-.71-.29Q19 12.42 19 12t.29-.71q.29-.29.71-.29h2q.42 0 .71.29.29.29.29.71t-.29.71Q22.42 13 22 13zm-8-8q-.42 0-.71-.29Q11 4.42 11 4V2q0-.42.29-.71Q11.58 1 12 1t.71.29Q13 1.58 13 2v2q0 .42-.29.71Q12.42 5 12 5m0 18q-.42 0-.71-.29Q11 22.42 11 22v-2q0-.42.29-.71.29-.29.71-.29t.71.29q.29.29.29.71v2q0 .42-.29.71-.29.29-.71.29M5.65 7.05 4.575 6q-.3-.275-.288-.7.013-.425.288-.725.3-.3.725-.3t.7.3L7.05 5.65q.275.3.275.7 0 .4-.275.7-.275.3-.687.287-.413-.012-.713-.287M18 19.425l-1.05-1.075q-.275-.3-.275-.712 0-.413.275-.688.275-.3.688-.287.412.012.712.287L19.425 18q.3.275.288.7-.013.425-.288.725-.3.3-.725.3t-.7-.3M16.95 7.05q-.3-.275-.287-.688.012-.412.287-.712L18 4.575q.275-.3.7-.288.425.013.725.288.3.3.3.725t-.3.7L18.35 7.05q-.3.275-.7.275-.4 0-.7-.275M4.575 19.425q-.3-.3-.3-.725t.3-.7l1.075-1.05q.3-.275.712-.275.413 0 .688.275.3.275.287.688-.012.412-.287.712L6 19.425q-.275.3-.7.288-.425-.013-.725-.288"/></svg>
                </button>
                <md-icon-button id="eb-btn-toggle" aria-label="Collapse panel" data-i18n-aria="collapsePanel">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.4 15.4 6 14l6-6 6 6-1.4 1.4L12 10.8z"/></svg>
                </md-icon-button>
            </div>
            <div id="eb-panel-body">
                <fieldset class="eb-card">
                    <legend class="eb-card-title" data-i18n="targetScore">Target score</legend>
                    <div class="eb-row">
                        <md-radio id="eb-mode-fixed" name="eb-score-mode" value="fixed" checked data-i18n-aria="fixed"></md-radio>
                        <span style="font-size:14px;color:var(--md-sys-color-on-surface)" data-i18n="fixed">Fixed</span>
                        <md-outlined-text-field id="eb-score-fixed" type="number" value="100" min="0" max="100" label="${t('scoreLabel')}" style="width:90px"></md-outlined-text-field>
                    </div>
                    <div class="eb-row">
                        <md-radio id="eb-mode-range" name="eb-score-mode" value="random" data-i18n-aria="range"></md-radio>
                        <span style="font-size:14px;color:var(--md-sys-color-on-surface)" data-i18n="randomBetween">Random</span>
                    </div>
                    <div class="eb-row" style="padding-left:28px">
                        <md-outlined-text-field id="eb-score-min" type="number" value="85" min="0" max="100" label="${t('min')}" style="width:90px"></md-outlined-text-field>
                        <md-outlined-text-field id="eb-score-max" type="number" value="100" min="0" max="100" label="${t('max')}" style="width:90px"></md-outlined-text-field>
                    </div>
                </fieldset>
                <fieldset class="eb-card">
                    <legend class="eb-card-title" data-i18n="delayBetweenLessons">Delay between lessons</legend>
                    <div class="eb-row eb-row-fields">
                        <md-outlined-text-field id="eb-delay-min" type="number" value="0" min="0" step="0.1" label="${t('min')}" style="flex:1"></md-outlined-text-field>
                        <md-outlined-text-field id="eb-delay-max" type="number" value="0" min="0" step="0.1" label="${t('max')}" style="flex:1"></md-outlined-text-field>
                    </div>
                    <p class="eb-support" data-i18n="delayHelp">Minutes. Set both to 0 to score without waiting.</p>
                </fieldset>
                <fieldset class="eb-card">
                    <legend class="eb-card-title" data-i18n="whichLessons">Filter</legend>
                    <div class="eb-col">
                        <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
                            <md-checkbox id="eb-filter-incomplete" checked></md-checkbox>
                            <span style="font-size:14px;color:var(--md-sys-color-on-surface)" data-i18n="incompleteNewOnly">Incomplete</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
                            <md-checkbox id="eb-filter-low-score"></md-checkbox>
                            <span style="font-size:14px;color:var(--md-sys-color-on-surface)" data-i18n="redoWhenScoreBelow">Score below</span>
                            <md-outlined-text-field id="eb-filter-score" type="number" value="100" min="0" max="100" style="width:64px"></md-outlined-text-field>
                            <span style="font-size:14px;color:var(--md-sys-color-on-surface)" data-i18n="scoreUnit">pts</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
                            <md-checkbox id="eb-filter-teachers-pick"></md-checkbox>
                            <span style="font-size:14px;color:var(--md-sys-color-on-surface)" data-i18n="teachersPick">Teacher’s Pick</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
                            <md-checkbox id="eb-filter-students-pick"></md-checkbox>
                            <span style="font-size:14px;color:var(--md-sys-color-on-surface)" data-i18n="studentsPick">Student’s Pick</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
                            <md-checkbox id="eb-filter-current"></md-checkbox>
                            <span style="font-size:14px;color:var(--md-sys-color-on-surface)" data-i18n="currentLessonOpt">Current lesson</span>
                        </label>
                    </div>
                </fieldset>
                <div id="eb-countdown">
                    <span id="eb-countdown-label" data-i18n="countdownWaiting">Waiting</span>
                    <md-linear-progress id="eb-progress-bar" value="0"></md-linear-progress>
                </div>
                <fieldset class="eb-card">
                    <legend class="eb-card-title" data-i18n="langTitle">Language</legend>
                    <md-outlined-select id="eb-lang-select" label="Language" aria-label="Language">
                        ${LANG_CODES.map(c => `<md-select-option value="${c}"><span slot="headline">${langLabel(c)}</span></md-select-option>`).join('')}
                    </md-outlined-select>
                </fieldset>
                <div class="eb-card">
                    <div style="display:flex;align-items:center;justify-content:space-between">
                        <span style="font-size:14px;font-weight:500;color:var(--md-sys-color-on-surface)" data-i18n="activityLog">Log</span>
                        <md-icon-button id="eb-log-toggle" style="--md-icon-button-icon-size:20px" aria-label="Hide activity log" data-i18n-aria="hideActivityLog" data-log-visible="true">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3"/></svg>
                        </md-icon-button>
                    </div>
                    <div id="eb-log" role="log" aria-live="polite"></div>
                </div>
            </div>
            <div id="eb-panel-footer">
                <md-filled-button id="eb-btn-all" data-i18n="scoreAllMatching">Score all matching</md-filled-button>
                <md-outlined-button id="eb-btn-stop" class="eb-hidden" data-i18n="stop">Stop</md-outlined-button>
            </div>
            <div id="eb-about" class="eb-hidden" role="dialog" aria-modal="true" aria-labelledby="eb-about-title">
                <div id="eb-about-card">
                    <div id="eb-about-head">
                        <span id="eb-about-title" data-i18n="aboutTitle">About</span>
                        <md-icon-button id="eb-about-close" aria-label="Close" data-i18n-aria="closeAbout">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.4 19 5 17.6 10.6 12 5 6.4 6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4z"/></svg>
                        </md-icon-button>
                    </div>
                    <span id="eb-about-version">v${EB_VERSION}</span>
                    <div class="eb-about-row">
                        <span class="eb-about-label" data-i18n="aboutAuthor">Author</span>
                        <span><a href="https://github.com/devcme" target="_blank" rel="noopener noreferrer">devc</a></span> &amp <a href="https://github.com/Si-Jiu" target="_blank" rel="noopener noreferrer">Si-Jiu</a>
                    </div>
                    <div class="eb-about-row">
                        <span class="eb-about-label" data-i18n="aboutGithub">GitHub</span>
                        <a href="https://github.com/devcme/auto_eb_score" target="_blank" rel="noopener noreferrer">devcme/auto_eb_score</a>
                    </div>
                    <p id="eb-about-message" data-i18n="aboutMessage"></p>
                </div>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    document.body.appendChild(panel);

    applyTranslations(panel);

    const ver = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) || EB_VERSION;
    document.getElementById('eb-panel-version').textContent = ver;
    document.getElementById('eb-about-version').textContent = 'v' + ver;

    document.getElementById('eb-lang-select').addEventListener('change', e => {
        onLangChange(e.target.value);
    });

    // Drag
    const header = document.getElementById('eb-panel-header');
    let sx, sy, sl, st;
    header.addEventListener('mousedown', e => {
        if (e.target.closest('md-icon-button, #eb-panel-version')) return;
        e.preventDefault();
        sx = e.clientX; sy = e.clientY;
        const r = panel.getBoundingClientRect();
        sl = r.left; st = r.top;
        const move = ev => {
            const w = panel.offsetWidth, h = panel.offsetHeight;
            const cw = document.documentElement.clientWidth;
            const ch = document.documentElement.clientHeight;
            const x = Math.max(8, Math.min(sl + ev.clientX - sx, cw - w - 8));
            const y = Math.max(8, Math.min(st + ev.clientY - sy, ch - h - 8));
            panel.style.left = x + 'px';
            panel.style.top = y + 'px';
            panel.style.right = 'auto';
        };
        const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    });

    // Collapse toggle
    document.getElementById('eb-btn-toggle').addEventListener('click', () => {
        const body = document.getElementById('eb-panel-body');
        const footer = document.getElementById('eb-panel-footer');
        const btn = document.getElementById('eb-btn-toggle');
        isMinimized = !isMinimized;
        body.classList.toggle('collapsed', isMinimized);
        footer.classList.toggle('eb-hidden', isMinimized);
        btn.classList.toggle('eb-collapsed', isMinimized);
        btn.setAttribute('aria-label', isMinimized ? t('expandPanel') : t('collapsePanel'));
    });

    // Theme
    document.getElementById('eb-theme-toggle').addEventListener('click', () => {
        const isLight = document.documentElement.classList.contains('eb-theme-light');
        onThemeChange(isLight ? 'dark' : 'light', true);
    });

    try {
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', ev => {
            if (localStorage.getItem(THEME_KEY)) return;
            onThemeChange(ev.matches ? 'light' : 'dark', false);
        });
    } catch (e) { }

    // About dialog (opened by clicking the version badge)
    const about = document.getElementById('eb-about');
    const versionBtn = document.getElementById('eb-panel-version');
    const setAbout = show => about.classList.toggle('eb-hidden', !show);
    versionBtn.addEventListener('click', () => setAbout(true));
    versionBtn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAbout(true); }
    });
    document.getElementById('eb-about-close').addEventListener('click', () => setAbout(false));
    about.addEventListener('click', e => { if (e.target === about) setAbout(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setAbout(false); });

    // Filter
    document.getElementById('eb-filter-incomplete').addEventListener('change', onFilterChange);
    document.getElementById('eb-filter-low-score').addEventListener('change', onFilterChange);
    document.getElementById('eb-filter-teachers-pick').addEventListener('change', onFilterChange);
    document.getElementById('eb-filter-students-pick').addEventListener('change', onFilterChange);
    document.getElementById('eb-filter-current').addEventListener('change', onFilterChange);

    // Log toggle
    document.getElementById('eb-log-toggle').addEventListener('click', () => {
        const visible = document.getElementById('eb-log-toggle').getAttribute('data-log-visible') !== 'true';
        onLogToggle(visible);
    });

    // Auto-save config
    const numFields = panel.querySelectorAll('md-outlined-text-field[type="number"]');
    numFields.forEach(el => {
        el.addEventListener('input', persistConfig);
        el.addEventListener('change', persistConfig);
    });

    // Score mode radios - save when changed
    panel.querySelectorAll('md-radio[name="eb-score-mode"]').forEach(radio => {
        radio.addEventListener('change', persistConfig);
    });

    // Buttons
    document.getElementById('eb-btn-all').addEventListener('click', onScoreAll);
    document.getElementById('eb-btn-stop').addEventListener('click', onStop);

    applyTheme(loadTheme(), false);

    return panel;
}
