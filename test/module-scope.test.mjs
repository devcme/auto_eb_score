import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url);

const files = readdirSync(SRC).filter(f => f.endsWith('.js'));

// `stopRequested` used to be a module-scope `let` in the single-file userscript.
// After the split into modules it lives in ui.js behind getStopRequested() /
// setStopRequested(). A bare `stopRequested` reference is an unbound identifier:
// reading it throws ReferenceError in the browser and aborts the automation flow.
test('no bare stopRequested references (must use getStopRequested())', () => {
    const offenders = [];
    for (const file of files) {
        const src = readFileSync(join(SRC.pathname, file), 'utf-8');
        src.split('\n').forEach((line, i) => {
            if (/(?<![A-Za-z0-9_$.])stopRequested\b/.test(line)) {
                offenders.push(`${file}:${i + 1}: ${line.trim()}`);
            }
        });
    }
    assert.deepEqual(offenders, []);
});
