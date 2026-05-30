const LOGO = 'https://cdn.discordapp.com/attachments/908857825520943144/1508572777605759016/007964c9-c491-47da-849a-c8b104902184.png';
const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
const PORTUGAL_UTC_OFFSET = 1; // UTC+1

const TYPE_COLORS = {
    'Practice': 0x378ADD,
    'Official Match': 0xF0A500,
    'Scrimmage': 0xE67E22,
    'VOD Review': 0x9B59B6,
    'default': 0xE74C3C,
};

const TYPE_EMOJIS = {
    'Practice': '🎯',
    'Official Match': '🏆',
    'Scrimmage': '⚔️',
    'VOD Review': '🎥',
};

const TYPE_LABELS = {
    'Practice': 'PRACTICE',
    'Official Match': 'OFFICIAL MATCH',
    'Scrimmage': 'SCRIMMAGE',
    'VOD Review': 'VOD REVIEW',
};

const ROLE_EMOJIS = {
    'IGL': '🎙️', 'Entry': '💥', '2nd Entry': '⚡', 'AWPer': '🔭',
    'Rifler': '🔫', 'Lurker': '👤', 'Anchor': '⚓', 'Spacemaker': '🚀', 'Rotation': '🔄',
};

const ALL_ROLES = [
    { name: 'IGL', value: 'IGL' },
    { name: 'Entry', value: 'Entry' },
    { name: '2nd Entry', value: '2nd Entry' },
    { name: 'AWPer', value: 'AWPer' },
    { name: 'Rifler', value: 'Rifler' },
    { name: 'Lurker', value: 'Lurker' },
    { name: 'Anchor', value: 'Anchor' },
    { name: 'Spacemaker', value: 'Spacemaker' },
    { name: 'Rotation', value: 'Rotation' },
];

const STATUS_INDICATORS = {
    'Main': '🟢 Main',
    'Subs': '🟡 Subs',
    'Tryouts': '🔵 Tryouts',
    'Stand-ins': '⚪ Stand-ins',
};

function hasPerms(interaction) {
    return interaction.member.roles.cache.some(r => r.name === 'OWNER' || r.name === 'MANAGERS');
}

function hasTeamPerms(interaction) {
    return interaction.member.roles.cache.some(r => r.name === 'OWNER' || r.name === 'MANAGERS' || r.name === 'TEAM');
}

// Fixed: converts Portugal time (UTC+1) to correct Unix timestamp
// Previously used local time which was wrong on Railway (UTC server)
function toUnixTimestamp(date, time) {
    try {
        let day, month, year;
        const dateStr = String(date);
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            [day, month, year] = dateStr.split('/').map(Number);
        } else if (/^\d{2}-\d{2}-\d{2}$/.test(dateStr)) {
            [day, month, year] = dateStr.split('-').map(Number); year = 2000 + year;
        } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
            [year, month, day] = dateStr.split('/').map(Number);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            [year, month, day] = dateStr.split('-').map(Number);
        } else return null;
        const [hours, minutes] = String(time).split(':').map(Number);
        // Use Date.UTC and subtract Portugal offset to get correct UTC timestamp
        return Math.floor(Date.UTC(year, month - 1, day, hours - PORTUGAL_UTC_OFFSET, minutes, 0) / 1000);
    } catch { return null; }
}

function normalizeDate(date) {
    try {
        const dateStr = String(date);
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
        if (typeof date === 'object' && date instanceof Date) {
            return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        }
        if (/^\d{2}-\d{2}-\d{2}$/.test(dateStr)) {
            const [d, m, y] = dateStr.split('-');
            return `${d}/${m}/20${y}`;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('-');
            return `${d}/${m}/${y}`;
        }
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('/');
            return `${d}/${m}/${y}`;
        }
        return dateStr;
    } catch { return String(date); }
}

function toISODate(date) {
    try {
        const dateStr = String(date);
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [d, m, y] = dateStr.split('/');
            return `${y}-${m}-${d}`;
        }
        if (/^\d{2}-\d{2}-\d{2}$/.test(dateStr)) {
            const [d, m, y] = dateStr.split('-');
            return `20${y}-${m}-${d}`;
        }
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) return dateStr.replace(/\//g, '-');
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        if (typeof date === 'object' && date instanceof Date) return date.toISOString().split('T')[0];
        return dateStr;
    } catch { return String(date); }
}

module.exports = {
    LOGO, DIVIDER, TYPE_COLORS, TYPE_EMOJIS, TYPE_LABELS,
    ROLE_EMOJIS, ALL_ROLES, STATUS_INDICATORS,
    hasPerms, hasTeamPerms, toUnixTimestamp, normalizeDate, toISODate,
};
