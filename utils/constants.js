const { roleIds } = require('./config');
const { normalizeDate, toISODate, lisbonToUnix } = require('./time');

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

// The bot looks for these channels by name.
const CHANNELS = {
    schedule: 'schedule',
    absences: 'absences',
    reminders: 'reminders',
    announcements: 'announcements',
};

const NO_PERMS_MANAGER = '❌ You need **@OWNER** or **@MANAGERS** to use this.';
const NO_PERMS_TEAM = '❌ You need **@TEAM**, **@OWNER** or **@MANAGERS** to use this.';

const TYPE_COLORS = {
    Practice: 0x378add,
    'Official Match': 0xf0a500,
    Scrimmage: 0xe67e22,
    'VOD Review': 0x9b59b6,
    default: 0xe74c3c,
};

const TYPE_EMOJIS = {
    Practice: '🎯',
    'Official Match': '🏆',
    Scrimmage: '⚔️',
    'VOD Review': '🎥',
};

const TYPE_LABELS = {
    Practice: 'PRACTICE',
    'Official Match': 'OFFICIAL MATCH',
    Scrimmage: 'SCRIMMAGE',
    'VOD Review': 'VOD REVIEW',
};

const ROLE_EMOJIS = {
    IGL: '🎙️',
    Entry: '💥',
    '2nd Entry': '⚡',
    AWPer: '🔭',
    Rifler: '🔫',
    Lurker: '👤',
    Anchor: '⚓',
    Spacemaker: '🚀',
    Rotation: '🔄',
};

const ALL_ROLES = Object.keys(ROLE_EMOJIS).map((name) => ({ name, value: name }));

const STATUS_INDICATORS = {
    Main: '🟢 Main',
    Subs: '🟡 Subs',
    Tryouts: '🔵 Tryouts',
    'Stand-ins': '⚪ Stand-ins',
};

// ─── Permissions (by role ID, never by role name) ────────────

function memberRoleIds(interaction) {
    const roles = interaction.member?.roles;
    if (!roles) return [];
    return Array.isArray(roles) ? roles : [...roles.cache.keys()];
}

function hasPerms(interaction) {
    const ids = memberRoleIds(interaction);
    const { owner, managers } = roleIds();
    return ids.includes(owner) || ids.includes(managers);
}

function hasTeamPerms(interaction) {
    const ids = memberRoleIds(interaction);
    const { owner, managers, team } = roleIds();
    return ids.includes(owner) || ids.includes(managers) || ids.includes(team);
}

// ─── Discord lookups ─────────────────────────────────────────

function findChannel(guild, name) {
    return guild.channels.cache.find((channel) => channel.name === name) ?? null;
}

function getTeamRole(guild) {
    return guild.roles.cache.get(roleIds().team) ?? null;
}

// Message options that ping @TEAM and nobody else. Spread it into channel.send({ ... }).
function teamMention(guild) {
    const role = getTeamRole(guild);
    return role ? { content: `${role}`, allowedMentions: { roles: [role.id] } } : { content: '' };
}

module.exports = {
    DIVIDER,
    CHANNELS,
    NO_PERMS_MANAGER,
    NO_PERMS_TEAM,
    TYPE_COLORS,
    TYPE_EMOJIS,
    TYPE_LABELS,
    ROLE_EMOJIS,
    ALL_ROLES,
    STATUS_INDICATORS,
    hasPerms,
    hasTeamPerms,
    findChannel,
    getTeamRole,
    teamMention,
    // date helpers live in time.js; re-exported here for convenience
    normalizeDate,
    toISODate,
    toUnixTimestamp: lisbonToUnix,
};
