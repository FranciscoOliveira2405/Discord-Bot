const { getTimezones } = require('../dbManager');
const { zoneOffsetMs, lisbonOffsetHours, lisbonToUnix, formatInOffset, nowUnix } = require('../time');

const BASE_LABEL = 'Portugal';

// Accepts "GMT+2", "GMT-3", "GMT+5:30" or an IANA name such as "Europe/Berlin".
// IANA names follow daylight saving time automatically; GMT offsets are fixed.
// Returns null when the text is not a valid time zone.
function resolveZone(input) {
    const text = String(input).trim();

    const gmt = /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(text);
    if (gmt) {
        const sign = gmt[1] === '-' ? -1 : 1;
        const hours = Number(gmt[2]);
        const minutes = Number(gmt[3] ?? 0);
        const offsetHours = sign * (hours + minutes / 60);
        if (minutes > 59 || offsetHours < -12 || offsetHours > 14) return null;
        const suffix = minutes ? `:${String(minutes).padStart(2, '0')}` : '';
        return { kind: 'offset', offsetHours, id: `GMT${gmt[1]}${hours}${suffix}` };
    }

    if (text.includes('/') && !/^[+-]/.test(text)) {
        try {
            const zone = new Intl.DateTimeFormat('en-US', { timeZone: text }).resolvedOptions().timeZone;
            return { kind: 'iana', zone, id: zone };
        } catch {
            return null;
        }
    }
    return null;
}

// Current GMT offset of the base time zone, e.g. "GMT+1" in summer and "GMT+0" in winter
function currentBaseGmt() {
    const hours = lisbonOffsetHours(nowUnix());
    return `GMT${hours < 0 ? '-' : '+'}${Math.abs(hours)}`;
}

// One line per configured time zone with the event time converted to it.
function buildTimezoneField(time, date) {
    const timezones = getTimezones();
    if (timezones.length === 0) return null;

    const unix = (date ? lisbonToUnix(date, time) : null) ?? nowUnix();
    const baseOffset = lisbonOffsetHours(unix);

    const lines = [];
    for (const { label, tz } of timezones) {
        const zone = resolveZone(tz);
        if (!zone) continue;
        const offsetHours =
            zone.kind === 'offset' ? zone.offsetHours : zoneOffsetMs(unix * 1000, zone.zone) / 3_600_000;
        if (label === BASE_LABEL && offsetHours === baseOffset) continue;
        lines.push(`**${label}:** ${formatInOffset(unix, offsetHours)}`);
    }
    return lines.length > 0 ? lines.join('\n') : null;
}

module.exports = { BASE_LABEL, resolveZone, currentBaseGmt, buildTimezoneField };
