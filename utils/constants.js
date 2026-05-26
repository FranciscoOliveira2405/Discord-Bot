const LOGO = 'https://cdn.discordapp.com/attachments/908857825520943144/1508572777605759016/007964c9-c491-47da-849a-c8b104902184.png';
const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

const TYPE_COLORS = {
    'Practice':       0x378ADD,
    'Official Match': 0xF0A500,
    'Scrimmage':      0xE67E22,
    'VOD Review':     0x9B59B6,
    'default':        0xE74C3C,
};

const TYPE_EMOJIS = {
    'Practice':       '🎯',
    'Official Match': '🏆',
    'Scrimmage':      '⚔️',
    'VOD Review':     '🎥',
};

const TYPE_LABELS = {
    'Practice':       'PRACTICE',
    'Official Match': 'OFFICIAL MATCH',
    'Scrimmage':      'SCRIMMAGE',
    'VOD Review':     'VOD REVIEW',
};

const ROLE_EMOJIS = {
    'IGL':           '🎙️',
    'AWPer':         '🔭',
    'Rifler':        '🔫',
    'Entry Fragger': '💥',
    'Second Entry':  '⚡',
    'Support':       '🛡️',
    'Lurker':        '👤',
    'Anchor':        '⚓',
    'Rotator':       '🔄',
};

const ALL_ROLES = [
    { name: 'IGL', value: 'IGL' },
    { name: 'Entry Fragger', value: 'Entry Fragger' },
    { name: 'Second Entry', value: 'Second Entry' },
    { name: 'Lurker', value: 'Lurker' },
    { name: 'Support', value: 'Support' },
    { name: 'AWPer', value: 'AWPer' },
    { name: 'Rifler', value: 'Rifler' },
    { name: 'Anchor', value: 'Anchor' },
    { name: 'Rotator', value: 'Rotator' },
];

const STATUS_INDICATORS = {
    'Active':     '🟢 Active',
    'Inactive':   '🔴 Inactive',
    'Substitute': '🟡 Substitute',
};

function hasPerms(interaction) {
    return interaction.member.roles.cache.some(r => r.name === 'OWNER' || r.name === 'MANAGERS');
}

function toUnixTimestamp(date, time) {
    try {
        let day, month, year;
        const dateStr = String(date);
        if (/^\d{2}-\d{2}-\d{2}$/.test(dateStr)) {
            [day, month, year] = dateStr.split('-').map(Number);
            year = 2000 + year;
        } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
            [year, month, day] = dateStr.split('/').map(Number);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            [year, month, day] = dateStr.split('-').map(Number);
        } else {
            return null;
        }
        const [hours, minutes] = String(time).split(':').map(Number);
        const d = new Date(year, month - 1, day, hours, minutes, 0);
        return Math.floor(d.getTime() / 1000);
    } catch {
        return null;
    }
}

function normalizeDate(date) {
    try {
        const dateStr = String(date);
        if (/^\d{2}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        if (typeof date === 'object' && date instanceof Date) {
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = String(date.getFullYear()).slice(-2);
            return `${d}-${m}-${y}`;
        }
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('/');
            return `${day}-${month}-${String(year).slice(-2)}`;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${String(year).slice(-2)}`;
        }
        return dateStr;
    } catch {
        return String(date);
    }
}

function toISODate(date) {
    try {
        const dateStr = String(date);
        if (/^\d{2}-\d{2}-\d{2}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('-');
            return `20${year}-${month}-${day}`;
        }
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
            return dateStr.replace(/\//g, '-');
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }
        if (typeof date === 'object' && date instanceof Date) {
            return date.toISOString().split('T')[0];
        }
        return dateStr;
    } catch {
        return String(date);
    }
}

module.exports = {
    LOGO, DIVIDER, TYPE_COLORS, TYPE_EMOJIS, TYPE_LABELS,
    ROLE_EMOJIS, ALL_ROLES, STATUS_INDICATORS,
    hasPerms, toUnixTimestamp, normalizeDate, toISODate,
};
