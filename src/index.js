import { t, setLang, applyTranslations } from './i18n/index.js';
import { waitMs, formatSeconds } from './utils.js';
import { clearState, saveState, loadConfig, applyConfigToUI, readUIConfig, loadState, persistConfig } from './state.js';
import { resolveScore, resolveDelaySec, initAndCommitAPI } from './scoring.js';
import { clickOpenLesson, handleDifficultySelection, pickRandomTask } from './lesson.js';
import {
    createPanel, panel, isRunning, getStopRequested,
    log, setRunning, applyTheme,
    showCountdown, setLogVisible, setStopRequested
} from './ui.js';

const LIST_URL = 'https://lms1.wiseman.com.hk/lms/user/secure/course/eb/select_lesson/index.shtml';

function onScoreAll() {
    if (isRunning) return;
    const cfg = readUIConfig();

    if (cfg.filterCurrent) {
        const overlay = document.querySelector('.overlay-player');
        if (!overlay || !overlay.contentWindow) {
            log(t('msgNoLessonOpen'));
            return;
        }
        const src = overlay.getAttribute('src') || '';
        const m = src.match(/id=([^&]+)/);
        if (!m) { log(t('msgCannotDetectId')); return; }

        setRunning(true);
        log(t('msgCurrentLesson'));

        handleDifficultySelection(overlay).then(() => {
            log(t('msgFirstVisit'));
            return waitMs(3000);
        }).then(() => {
            if (getStopRequested()) { clearState(); setRunning(false); return; }
            saveState({
                running: true,
                mode: 'one',
                phase: 'score',
                lessonId: m[1],
                lessonName: '(current)',
                lessonStatus: '',
                settings: cfg
            });
            log(t('msgRefreshing'));
            window.location.href = LIST_URL;
        });
        return;
    }

    saveState({
        running: true,
        mode: 'all',
        phase: 'enter',
        lessonId: null,
        lessonName: null,
        lessonStatus: null,
        doneIds: [],
        settings: cfg
    });
    log(t('msgStartingBatch'));
    window.location.href = LIST_URL;
}

function onStop() {
    setStopRequested(true);
    clearState();
    log(t('msgStopped'));
    setRunning(false);
}

function onThemeChange(theme, persist) {
    applyTheme(theme, persist);
}

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

function onLangChange(lang) {
    setLang(lang, () => applyTranslations(panel));
    persistConfig();
}

function onLogToggle(v) {
    setLogVisible(v);
    persistConfig();
}

async function doPhaseEnter(state) {
    setRunning(true);
    log(t('msgEnter', state.lessonName || state.lessonId));

    const overlay = await clickOpenLesson(state.lessonId);
    if (!overlay) {
        log(t('msgFailedToOpen'));
        await finishAndNext(state);
        return;
    }

    await handleDifficultySelection(overlay);

    log(t('msgFirstVisitDone'));
    await waitMs(3000);

    if (getStopRequested()) { clearState(); setRunning(false); return; }

    state.phase = 'score';
    state.settings = readUIConfig();
    saveState(state);
    log(t('msgRefreshing'));
    window.location.href = LIST_URL;
}

async function doPhaseScore(state) {
    setRunning(true);
    log(t('msgScore', state.lessonName || state.lessonId));

    const overlay = await clickOpenLesson(state.lessonId);
    if (!overlay) {
        log(t('msgFailedToOpen'));
        await finishAndNext(state);
        return;
    }

    if (getStopRequested()) { clearState(); setRunning(false); return; }

    const cfg = readUIConfig();
    const delaySec = resolveDelaySec(cfg);
    if (delaySec > 0) {
        log(t('msgDelay', formatSeconds(delaySec)));
        await showCountdown(delaySec);
    }

    if (getStopRequested()) { clearState(); setRunning(false); return; }

    const score = resolveScore(cfg);
    log(t('msgCommittingScore', score));
    const ok = await initAndCommitAPI(overlay, score);
    log(t(ok ? 'msgSuccess' : 'msgFailed'));

    log(t('msgWait3s'));
    await waitMs(3000);

    await finishAndNext(state);
}

async function finishAndNext(state) {
    if (getStopRequested()) { clearState(); setRunning(false); return; }

    if (state.mode === 'all') {
        if (!Array.isArray(state.doneIds)) state.doneIds = [];
        if (state.lessonId && !state.doneIds.includes(state.lessonId)) {
            state.doneIds.push(state.lessonId);
        }
        state.phase = 'enter';
        state.lessonId = null;
        state.lessonName = null;
        state.lessonStatus = null;
        state.settings = readUIConfig();
        saveState(state);
        log(t('msgNext'));
        window.location.href = LIST_URL;
    } else {
        clearState();
        setRunning(false);
        log(t('msgDone'));
        window.location.href = LIST_URL;
    }
}

async function resume(state) {
    if (!state || !state.running) return;

    if (state.phase === 'enter') {
        if (!state.lessonId) {
            const cfg = readUIConfig();
            const task = pickRandomTask(cfg, state.doneIds || []);
            if (!task) {
                log(t('msgNoMatchingTasks'));
                clearState();
                setRunning(false);
                return;
            }
            state.lessonId = task.id;
            state.lessonName = task.name;
            state.lessonStatus = task.status;
            log(t('msgFound', task.name + ' [' + task.status + '] score=' + task.score));
        }
        await doPhaseEnter(state);
    } else if (state.phase === 'score') {
        await doPhaseScore(state);
    }
}

function init() {
    createPanel(onScoreAll, onStop, onThemeChange, onFilterChange, onLangChange, onLogToggle);

    const savedCfg = loadConfig();
    if (Object.keys(savedCfg).length > 0) {
        applyConfigToUI(savedCfg, setLogVisible);
        onFilterChange();
    }

    const runState = loadState();
    if (runState && runState.running) {
        applyConfigToUI(runState.settings, setLogVisible);
        onFilterChange();
        log(t('msgResuming'));
        setTimeout(() => resume(runState), 1500);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
