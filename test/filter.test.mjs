import { test } from 'node:test';
import assert from 'node:assert';
import { lessonMatches, categoryFromCell, selectCandidates } from '../src/filter.js';

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

test('locked lessons never match, even with category-only filter', () => {
    assert.equal(lessonMatches(TEACHER, 'locked', NaN, S({ filterTeachersPick: true })), false);
    assert.equal(lessonMatches(STUDENT, 'locked', NaN, S({ filterStudentsPick: true })), false);
    assert.equal(lessonMatches(TEACHER, 'locked', NaN, S({ filterIncomplete: true })), false);
});

test('selectCandidates excludes lessons already processed this run', () => {
    const candidates = [
        { id: 'a', category: TEACHER, statusLower: 'completed', scoreNum: 100 },
        { id: 'b', category: TEACHER, statusLower: 'completed', scoreNum: 90 },
    ];
    const s = S({ filterTeachersPick: true });
    assert.deepEqual(selectCandidates(candidates, s, new Set(['a'])).map(c => c.id), ['b']);
});

test('category-only selection becomes empty once every candidate is processed', () => {
    const candidates = [
        { id: 'a', category: TEACHER, statusLower: 'completed', scoreNum: 100 },
    ];
    const s = S({ filterTeachersPick: true });
    assert.deepEqual(selectCandidates(candidates, s, new Set(['a'])), []);
});
