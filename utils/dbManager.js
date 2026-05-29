const Database = require('better-sqlite3');
const path = require('path');
const { toISODate } = require('./constants');

const DB_PATH = path.join(__dirname, '..', 'data', 'v3xys.db');

let _db = null;
function getDb() {
    if (_db) return _db;
    _db = new Database(DB_PATH);
    _db.exec(`
        CREATE TABLE IF NOT EXISTS schedules (
            id TEXT PRIMARY KEY,
            type TEXT,
            date TEXT,
            time TEXT,
            opponent TEXT DEFAULT 'N/A',
            notes TEXT DEFAULT 'N/A',
            status TEXT DEFAULT 'Scheduled'
        );
        CREATE TABLE IF NOT EXISTS roster (
            discordTag TEXT PRIMARY KEY,
            ign TEXT,
            roles TEXT,
            status TEXT DEFAULT 'Main'
        );
        CREATE TABLE IF NOT EXISTS absences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discordTag TEXT,
            ign TEXT,
            reason TEXT,
            date TEXT,
            addedAt TEXT
        );
        CREATE TABLE IF NOT EXISTS timezones (
            label TEXT,
            tz TEXT UNIQUE
        );
    `);
    return _db;
}

// ─── Schedules ───────────────────────────────────────────────

async function getSchedules() {
    return getDb().prepare('SELECT * FROM schedules').all();
}

async function addSchedule(type, date, time, opponent, notes) {
    const id = String(Date.now());
    getDb().prepare('INSERT INTO schedules (id, type, date, time, opponent, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, type, date, time, opponent || 'N/A', notes || 'N/A', 'Scheduled');
    return id;
}

async function removeSchedule(id) {
    const result = getDb().prepare('DELETE FROM schedules WHERE id = ?').run(String(id));
    return result.changes > 0;
}

async function removeExpiredEvents() {
    const rows = getDb().prepare('SELECT id, date, time FROM schedules').all();
    const now = new Date();
    let count = 0;
    for (const row of rows) {
        try {
            const isoDate = toISODate(row.date);
            const timeStr = row.time || '00:00';
            if (new Date(`${isoDate}T${timeStr}:00`) < now) {
                getDb().prepare('DELETE FROM schedules WHERE id = ?').run(row.id);
                count++;
            }
        } catch {}
    }
    return count;
}

async function updateScheduleNotes(id, notes) {
    const result = getDb().prepare('UPDATE schedules SET notes = ? WHERE id = ?').run(notes, String(id));
    return result.changes > 0;
}

// ─── Roster ──────────────────────────────────────────────────

async function getRoster() {
    return getDb().prepare('SELECT * FROM roster').all();
}

async function addPlayer(discordTag, ign, roles, status) {
    getDb().prepare('INSERT OR REPLACE INTO roster (discordTag, ign, roles, status) VALUES (?, ?, ?, ?)').run(discordTag, ign, roles, status || 'Main');
}

async function updatePlayer(discordTag, newRoles, newStatus) {
    const player = getDb().prepare('SELECT * FROM roster WHERE discordTag = ?').get(discordTag);
    if (!player) return false;
    const roles = newRoles || player.roles;
    const status = newStatus || player.status;
    getDb().prepare('UPDATE roster SET roles = ?, status = ? WHERE discordTag = ?').run(roles, status, discordTag);
    return true;
}

async function removePlayer(discordTag) {
    const result = getDb().prepare('DELETE FROM roster WHERE discordTag = ?').run(discordTag);
    return result.changes > 0;
}

// ─── Absences ────────────────────────────────────────────────

async function getAbsences() {
    return getDb().prepare('SELECT * FROM absences').all();
}

async function addAbsence(discordTag, ign, reason, date) {
    getDb().prepare('INSERT INTO absences (discordTag, ign, reason, date, addedAt) VALUES (?, ?, ?, ?, ?)').run(discordTag, ign, reason, date, new Date().toISOString());
}

async function removeAbsence(discordTag) {
    const row = getDb().prepare('SELECT id FROM absences WHERE discordTag = ? LIMIT 1').get(discordTag);
    if (!row) return false;
    getDb().prepare('DELETE FROM absences WHERE id = ?').run(row.id);
    return true;
}

async function removeExpiredAbsences() {
    const rows = getDb().prepare('SELECT id, date FROM absences').all();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let count = 0;
    for (const row of rows) {
        try {
            const d = new Date(toISODate(row.date)); d.setHours(0, 0, 0, 0);
            if (d < today) { getDb().prepare('DELETE FROM absences WHERE id = ?').run(row.id); count++; }
        } catch {}
    }
    return count;
}

// ─── Timezones ───────────────────────────────────────────────

async function getTimezones() {
    return getDb().prepare('SELECT * FROM timezones').all();
}

async function addTimezone(label, tz) {
    const exists = getDb().prepare('SELECT 1 FROM timezones WHERE tz = ?').get(tz);
    if (exists) return false;
    getDb().prepare('INSERT INTO timezones (label, tz) VALUES (?, ?)').run(label, tz);
    return true;
}

async function removeTimezone(tz) {
    const result = getDb().prepare('DELETE FROM timezones WHERE tz = ?').run(tz);
    return result.changes > 0;
}

module.exports = {
    getSchedules, addSchedule, removeSchedule, removeExpiredEvents, updateScheduleNotes,
    getRoster, addPlayer, updatePlayer, removePlayer,
    getAbsences, addAbsence, removeAbsence, removeExpiredAbsences,
    getTimezones, addTimezone, removeTimezone,
};
