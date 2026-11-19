export function categoryFromCell(cell) {
    if (!cell || typeof cell.querySelector !== 'function') return '';
    const icon = cell.querySelector('i');
    return icon ? icon.textContent.trim() : '';
}

export function lessonMatches(category, status, scoreNum, settings) {
    if (status === 'locked') return false;

    const hasCategory = settings.filterTeachersPick || settings.filterStudentsPick;
    if (hasCategory) {
        const categoryOk = (settings.filterTeachersPick && category === 'teachers_pick')
            || (settings.filterStudentsPick && category === 'students_pick');
        if (!categoryOk) return false;
    }

    const hasStatus = settings.filterIncomplete || settings.filterLowScore;
    if (!hasStatus) return Boolean(hasCategory);

    return Boolean(
        (settings.filterIncomplete && (status === 'new' || status === 'incomplete'))
        || (settings.filterLowScore && !isNaN(scoreNum) && scoreNum < settings.filterScoreBelow)
    );
}

export function selectCandidates(candidates, settings, excludeIds) {
    const excluded = excludeIds instanceof Set ? excludeIds : new Set(excludeIds || []);
    return candidates.filter(c =>
        !excluded.has(c.id) && lessonMatches(c.category, c.statusLower, c.scoreNum, settings)
    );
}
