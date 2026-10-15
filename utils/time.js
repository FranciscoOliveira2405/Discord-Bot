// Date and time helpers.
// Event times are entered in Portugal time (Europe/Lisbon), which switches between
// UTC+0 (winter) and UTC+1 (summer). Everything here uses the real time zone rules
// instead of a fixed offset.

const TIMEZONE = 'Europe/Lisbon';
const DAY_MS = 86_400_000;

const pad = (n) => String(n).padStart(2, '0');

// ─── Validation ──────────────────────────────────────────────

// DD/MM/YYYY, and a real calendar date (rejects 31/02/2026, 99/99/9999, ...)
function isValidDate(str) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(str));
    if (!match) return false;
    const [day, month, year] = match.slice(1).map(Number);
    if (year < 2000 || year > 2100) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// HH:MM, 24 hour clock
function isValidTime(str) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(str));
}

// ─── Date formats (older data used several formats) ──────────

function normalizeDate(date) {
    try {
        if (date instanceof Date) return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
        const text = String(date);
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;
        if (/^\d{2}-\d{2}-\d{2}$/.test(text)) {
            const [d, m, y] = text.split('-');
            return `${d}/${m}/20${y}`;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            const [y, m, d] = text.split('-');
            return `${d}/${m}/${y}`;
        }
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(text)) {
            const [y, m, d] = text.split('/');
            return `${d}/${m}/${y}`;
        }
        return text;
    } catch {
        return String(date);
    }
}

// DD/MM/YYYY (or any supported format) to YYYY-MM-DD
function toISODate(date) {
    const normalized = normalizeDate(date);
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : normalized;
}

// ─── Time zones ──────────────────────────────────────────────

// Offset of a time zone from UTC, in milliseconds, at a given instant.
function zoneOffsetMs(utcMs, timeZone = TIMEZONE) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(new Date(utcMs));
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return asUtc - Math.floor(utcMs / 1000) * 1000;
}

function lisbonOffsetHours(unixSeconds) {
    return zoneOffsetMs(unixSeconds * 1000) / 3_600_000;
}

// "DD/MM/YYYY" + "HH:MM" in Portugal time to a Unix timestamp (seconds). Returns null if invalid.
function lisbonToUnix(date, time) {
    const normalized = normalizeDate(date);
    if (!isValidDate(normalized)) return null;
    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(String(time));
    if (!timeMatch) return null;
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (hours > 23 || minutes > 59) return null;

    const [day, month, year] = normalized.split('/').map(Number);
    const guess = Date.UTC(year, month - 1, day, hours, minutes, 0);
    const firstOffset = zoneOffsetMs(guess);
    let utc = guess - firstOffset;
    const secondOffset = zoneOffsetMs(utc); // differs from the first only around a clock change
    if (secondOffset !== firstOffset) utc = guess - secondOffset;
    return Math.floor(utc / 1000);
}

// HH:MM of a moment in a zone that is `offsetHours` away from UTC
function formatInOffset(unixSeconds, offsetHours) {
    const date = new Date(unixSeconds * 1000 + offsetHours * 3_600_000);
    return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function nowUnix() {
    return Math.floor(Date.now() / 1000);
}

// Today's date in Portugal as YYYY-MM-DD
function todayLisbonISO(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
}

// ─── Calendar days (UTC based, so clock changes never matter) ─

function dayNumber(dateStr) {
    const [day, month, year] = normalizeDate(dateStr).split('/').map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function formatDayNumber(n) {
    const date = new Date(n * DAY_MS);
    return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

// Every date from start to end (inclusive). Returns null if a date is invalid or end is before start.
function getDateRange(startStr, endStr) {
    if (!isValidDate(startStr) || !isValidDate(endStr)) return null;
    const start = dayNumber(startStr);
    const end = dayNumber(endStr);
    if (start > end) return null;
    const dates = [];
    for (let n = start; n <= end; n++) dates.push(formatDayNumber(n));
    return dates;
}

module.exports = {
    TIMEZONE,
    isValidDate,
    isValidTime,
    normalizeDate,
    toISODate,
    zoneOffsetMs,
    lisbonOffsetHours,
    lisbonToUnix,
    formatInOffset,
    nowUnix,
    todayLisbonISO,
    dayNumber,
    formatDayNumber,
    getDateRange,
};
