const test = require('node:test');
const assert = require('node:assert/strict');
const {
    isValidDate,
    isValidTime,
    normalizeDate,
    toISODate,
    lisbonToUnix,
    lisbonOffsetHours,
    formatInOffset,
    todayLisbonISO,
    getDateRange,
    dayNumber,
} = require('../utils/time');
const { groupIntoRanges } = require('../utils/ranges');

test('isValidDate accepts real dates and rejects impossible ones', () => {
    assert.equal(isValidDate('27/05/2026'), true);
    assert.equal(isValidDate('29/02/2028'), true); // leap year
    assert.equal(isValidDate('29/02/2027'), false);
    assert.equal(isValidDate('31/04/2026'), false);
    assert.equal(isValidDate('99/99/9999'), false);
    assert.equal(isValidDate('2026-05-27'), false);
    assert.equal(isValidDate('1/5/2026'), false);
});

test('isValidTime uses a 24 hour clock', () => {
    assert.equal(isValidTime('00:00'), true);
    assert.equal(isValidTime('21:30'), true);
    assert.equal(isValidTime('23:59'), true);
    assert.equal(isValidTime('24:00'), false);
    assert.equal(isValidTime('99:99'), false);
    assert.equal(isValidTime('9:30'), false);
    assert.equal(isValidTime('12:60'), false);
});

test('Portugal time follows daylight saving: UTC+1 in summer, UTC+0 in winter', () => {
    // 1 July 2026 21:00 in Portugal is 20:00 UTC
    assert.equal(lisbonToUnix('01/07/2026', '21:00'), Date.UTC(2026, 6, 1, 20, 0) / 1000);
    // 1 December 2026 21:00 in Portugal is 21:00 UTC
    assert.equal(lisbonToUnix('01/12/2026', '21:00'), Date.UTC(2026, 11, 1, 21, 0) / 1000);
});

test('the clock change on 25 October 2026 is handled', () => {
    // Saturday 24 October: still summer time (UTC+1)
    assert.equal(lisbonToUnix('24/10/2026', '12:00'), Date.UTC(2026, 9, 24, 11, 0) / 1000);
    // Monday 26 October: winter time (UTC+0)
    assert.equal(lisbonToUnix('26/10/2026', '12:00'), Date.UTC(2026, 9, 26, 12, 0) / 1000);
    assert.equal(lisbonOffsetHours(lisbonToUnix('24/10/2026', '12:00')), 1);
    assert.equal(lisbonOffsetHours(lisbonToUnix('26/10/2026', '12:00')), 0);
});

test('lisbonToUnix returns null for invalid input', () => {
    assert.equal(lisbonToUnix('31/02/2026', '12:00'), null);
    assert.equal(lisbonToUnix('01/01/2026', '25:00'), null);
    assert.equal(lisbonToUnix('01/01/2026', 'noon'), null);
});

test('formatInOffset converts to another zone', () => {
    const unix = lisbonToUnix('01/07/2026', '21:00'); // 20:00 UTC
    assert.equal(formatInOffset(unix, 2), '22:00');
    assert.equal(formatInOffset(unix, -3), '17:00');
    assert.equal(formatInOffset(unix, 5.5), '01:30');
});

test('todayLisbonISO uses the Portugal date, not the UTC date', () => {
    assert.equal(todayLisbonISO(new Date('2026-07-01T23:30:00Z')), '2026-07-02'); // already after midnight in Lisbon
    assert.equal(todayLisbonISO(new Date('2026-12-01T23:30:00Z')), '2026-12-01');
});

test('older date formats are normalised', () => {
    assert.equal(normalizeDate('27/05/2026'), '27/05/2026');
    assert.equal(normalizeDate('2026-05-27'), '27/05/2026');
    assert.equal(normalizeDate('2026/05/27'), '27/05/2026');
    assert.equal(normalizeDate('27-05-26'), '27/05/2026');
    assert.equal(toISODate('27/05/2026'), '2026-05-27');
    assert.equal(toISODate('27-05-26'), '2026-05-27');
});

test('getDateRange lists every day and survives clock changes', () => {
    assert.deepEqual(getDateRange('30/05/2026', '02/06/2026'), [
        '30/05/2026',
        '31/05/2026',
        '01/06/2026',
        '02/06/2026',
    ]);
    assert.equal(getDateRange('24/10/2026', '27/10/2026').length, 4); // includes the 25 October clock change
    assert.equal(getDateRange('02/06/2026', '30/05/2026'), null);
    assert.equal(getDateRange('32/05/2026', '02/06/2026'), null);
});

test('groupIntoRanges joins consecutive days, also across a clock change', () => {
    const items = ['26/10/2026', '24/10/2026', '25/10/2026', '30/10/2026'].map((date, id) => ({
        id,
        date,
        reason: 'Trip',
    }));
    const ranges = groupIntoRanges(items);
    assert.equal(ranges.length, 2);
    assert.equal(ranges[0].start, '24/10/2026');
    assert.equal(ranges[0].end, '26/10/2026');
    assert.equal(ranges[0].days, 3);
    assert.equal(ranges[1].days, 1);
    assert.equal(dayNumber('25/10/2026') - dayNumber('24/10/2026'), 1);
});
