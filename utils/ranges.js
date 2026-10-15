const { dayNumber } = require('./time');

// Groups items that have a DD/MM/YYYY "date" into runs of consecutive days.
// Each item can also carry "id" and "reason". Used by the absence board and /absent remove.
function groupIntoRanges(items) {
    const sorted = [...items].sort((a, b) => dayNumber(a.date) - dayNumber(b.date));
    const ranges = [];
    let i = 0;
    while (i < sorted.length) {
        let j = i + 1;
        while (j < sorted.length && dayNumber(sorted[j].date) - dayNumber(sorted[j - 1].date) === 1) j++;
        const group = sorted.slice(i, j);
        ranges.push({
            ids: group.map((item) => item.id),
            start: group[0].date,
            end: group[group.length - 1].date,
            days: group.length,
            reason: group[0].reason,
        });
        i = j;
    }
    return ranges;
}

module.exports = { groupIntoRanges };
