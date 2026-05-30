const { getTimezones } = require('../dbManager');

const BASE_LABEL = 'Portugal';
const BASE_OFFSET = 1; // GMT+1

function parseOffset(gmtString) {
    const match = String(gmtString).toUpperCase().match(/^GMT([+-]\d+)$/);
    if (!match) return null;
    return parseInt(match[1], 10);
}

function convertTime(time, fromOffset, toOffset) {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    const totalMinutes = hours * 60 + minutes;
    const diffMinutes = (toOffset - fromOffset) * 60;
    let converted = totalMinutes + diffMinutes;
    converted = ((converted % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = String(Math.floor(converted / 60)).padStart(2, '0');
    const m = String(converted % 60).padStart(2, '0');
    return `${h}:${m}`;
}

async function buildTimezoneField(time) {
    const timezones = await getTimezones();
    if (!timezones || timezones.length === 0) return null;
    const lines = [];
    for (const { label, tz } of timezones) {
        const offset = parseOffset(tz);
        if (offset === null) continue;
        if (offset === BASE_OFFSET && label === BASE_LABEL) continue;
        const converted = convertTime(time, BASE_OFFSET, offset);
        if (!converted) continue;
        lines.push(`**${label}:** ${converted}`);
    }
    if (lines.length === 0) return null;
    return lines.join('\n');
}

module.exports = { BASE_LABEL, BASE_OFFSET, parseOffset, convertTime, buildTimezoneField };
