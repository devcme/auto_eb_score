import { waitMs, randInt } from './utils.js';
import { t } from './i18n/index.js';
import { log, getStopRequested } from './ui.js';
import { selectCandidates, categoryFromCell } from './filter.js';

export async function clickOpenLesson(lessonId) {
    const link = document.querySelector('a.popup[data-id="' + lessonId + '"]');
    if (link) {
        link.click();
    } else {
        log(t('msgLinkNotFound'));
        return null;
    }

    await waitMs(1500);

    let overlay = document.querySelector('.overlay-player');
    for (let i = 0; i < 20 && !overlay; i++) {
        await waitMs(500);
        overlay = document.querySelector('.overlay-player');
    }
    if (!overlay) { log(t('msgOverlayFailed')); return null; }

    log(t('msgWaitingScorm'));
    try {
        const win = overlay.contentWindow;
        for (let i = 0; i < 30; i++) {
            if (getStopRequested()) return null;
            if (win && win.API && win.API.isInitialized === 'true') break;
            await waitMs(1000);
        }
    } catch (e) {
        log(t('msgAccessError', e.message));
    }

    return overlay;
}

function findDeepestByText(doc, text) {
    const xpath = `.//*[contains(text(),'${text}')]`;
    const r = doc.evaluate(xpath, doc.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = r.snapshotLength - 1; i >= 0; i--) {
        const el = r.snapshotItem(i);
        if (el.textContent.trim().length < 50) return el;
    }
    return null;
}

function findAnswerOptions(doc, win) {
    try {
        const all = doc.querySelectorAll('div, span');
        const ptr = [];
        for (const el of all) {
            if (el.children.length > 2) continue;
            const t = el.textContent.trim();
            if (t.length < 3 || t.length > 100) continue;
            try { if (win.getComputedStyle(el).cursor === 'pointer') ptr.push(el); } catch (e) { }
        }
        const groups = {};
        for (const el of ptr) {
            const p = el.parentElement;
            if (!p) continue;
            if (!groups[p]) groups[p] = [];
            groups[p].push(el);
        }
        let best = [];
        for (const p in groups) { if (groups[p].length > best.length) best = groups[p]; }
        return best.length >= 2 ? best : [];
    } catch (e) { return []; }
}

export async function handleDifficultySelection(overlayPlayer) {
    try {
        const outerDoc = overlayPlayer.contentDocument;
        if (!outerDoc) return;
        const innerIframe = outerDoc.querySelector('iframe');
        if (!innerIframe) return;

        let found = false;
        for (let i = 0; i < 15; i++) {
            if (getStopRequested()) return;
            try {
                const d = innerIframe.contentDocument;
                if (d && d.body && d.body.innerText && d.body.innerText.includes('LEVEL OF DIFFICULTY')) { found = true; break; }
            } catch (e) { }
            await waitMs(1000);
        }
        if (!found) return;

        log(t('msgDifficultyDetected'));

        const doc1 = innerIframe.contentDocument;
        const challengingEl = findDeepestByText(doc1, 'Challenging');
        if (challengingEl) {
            challengingEl.click();
            log(t('msgClickedChallenging'));
        }
        await waitMs(1000);

        let startBtn = null;
        for (let i = 0; i < 10; i++) {
            if (getStopRequested()) return;
            try {
                const d = innerIframe.contentDocument;
                startBtn = Array.from(d.querySelectorAll('button')).find(b => b.textContent.includes('Start Lessons') && !b.disabled);
                if (startBtn) break;
            } catch (e) { }
            await waitMs(500);
        }
        if (startBtn) {
            startBtn.click();
            log(t('msgClickedStartLessons'));
        } else {
            log(t('msgStartBtnFallback'));
            try {
                const d = innerIframe.contentDocument;
                const result = d.evaluate('//button-group//button', d, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const btn = result.singleNodeValue;
                if (btn) { btn.click(); log(t('msgClickedViaXpath')); }
            } catch (e) { }
        }
        await waitMs(3000);

        try {
            const doc2 = innerIframe.contentDocument;
            const win2 = innerIframe.contentWindow;
            if (doc2 && win2) {
                const options = findAnswerOptions(doc2, win2);
                if (options.length > 0) {
                    options[Math.floor(Math.random() * options.length)].click();
                    await waitMs(500);
                    const sub = Array.from(doc2.querySelectorAll('button')).find(b => b.textContent.includes('Submit') && !b.disabled);
                    if (sub) sub.click();
                    log(t('msgAnsweredQ1'));
                    await waitMs(500);
                }
            }
        } catch (e) { }
    } catch (e) {
        log(t('msgDifficultyError', e.message));
    }
}

export function pickRandomTask(settings, excludeIds) {
    const candidates = [];
    document.querySelectorAll('table tbody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        const link = cells[2] && cells[2].querySelector('a.popup[data-id]');
        if (!link) return;
        const scoreText = cells[4] ? cells[4].textContent.trim() : '-';

        candidates.push({
            id: link.dataset.id,
            name: cells[2].textContent.trim().replace(/\s+/g, ' ').substring(0, 70),
            status: cells[3] ? cells[3].textContent.trim() : '',
            statusLower: cells[3] ? cells[3].textContent.trim().toLowerCase() : '',
            score: scoreText,
            scoreNum: parseInt(scoreText),
            category: categoryFromCell(cells[0])
        });
    });

    const matched = selectCandidates(candidates, settings, excludeIds);
    return matched.length > 0 ? matched[randInt(0, matched.length - 1)] : null;
}
