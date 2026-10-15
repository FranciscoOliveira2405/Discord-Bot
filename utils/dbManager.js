const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { dataDir } = require('./paths');
const { toISODate, lisbonToUnix, nowUnix, todayLisbonISO } = require('./time');

const DB_FILE = 'bot.db';
const LEGACY_DB_FILE = 'v3xys.db'; // name used before version 2.0.0

// A person is matched by Discord ID. Rows saved before 2.0.0 only have a tag until
// syncMemberTags() links them to the real member.
const WHO = '(discordId = @id OR (discordId IS NULL AND discordTag = @tag))';

let _db = null;

// Renames the pre-2.0.0 database so nobody loses their data.
function renameLegacyDatabase(dir) {
    const legacy = path.join(dir, LEGACY_DB_FILE);
    const current = path.join(dir, DB_FILE);
    if (!fs.existsSync(legacy) || fs.existsSync(current)) return;
    for (const suffix of ['', '-wal', '-shm']) {
        if (fs.existsSync(legacy + suffix)) fs.renameSync(legacy + suffix, current + suffix);
    }
    console.log(`📦 Renamed ${LEGACY_DB_FILE} to ${DB_FILE}`);
}

function columnsOf(db, table) {
    return db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .map((column) => column.name);
}

// Adds what older databases are missing. Safe to run on every start.
function migrate(db) {
    for (const table of ['roster', 'absences']) {
        if (!columnsOf(db, table).includes('discordId')) db.exec(`ALTER TABLE ${table} ADD COLUMN discordId TEXT`);
    }
    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_discord_id ON roster(discordId) WHERE discordId IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_absences_discord_id ON absences(discordId);
        CREATE INDEX IF NOT EXISTS idx_absences_tag_date ON absences(discordTag, date);
    `);
}

function getDb() {
    if (_db) return _db;
    const dir = dataDir();
    renameLegacyDatabase(dir);
    _db = new Database(path.join(dir, DB_FILE));
    _db.pragma('journal_mode = WAL');
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
            discordId TEXT,
            ign TEXT,
            roles TEXT,
            status TEXT DEFAULT 'Main'
        );
        CREATE TABLE IF NOT EXISTS absences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discordTag TEXT,
            discordId TEXT,
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
    migrate(_db);
    return _db;
}

function closeDb() {
    if (_db) {
        _db.close();
        _db = null;
    }
}

// ─── Schedules ───────────────────────────────────────────────

// Sorted by date and time, soonest first
function getSchedules() {
    const rows = getDb().prepare('SELECT * FROM schedules').all();
    const when = (row) => lisbonToUnix(row.date, row.time) ?? Infinity;
    return rows.sort((a, b) => {
        const diff = when(a) - when(b);
        return Number.isNaN(diff) ? 0 : diff;
    });
}

// Event IDs are timestamps. Two events created in the same millisecond must not share an ID.
let lastScheduleId = 0;
function newScheduleId() {
    lastScheduleId = Math.max(Date.now(), lastScheduleId + 1);
    return String(lastScheduleId);
}

function addSchedule(type, date, time, opponent, notes) {
    const id = newScheduleId();
    getDb()
        .prepare('INSERT INTO schedules (id, type, date, time, opponent, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, type, date, time, opponent || 'N/A', notes || 'N/A', 'Scheduled');
    return id;
}

function removeSchedule(id) {
    return getDb().prepare('DELETE FROM schedules WHERE id = ?').run(String(id)).changes > 0;
}

function removeExpiredEvents() {
    const db = getDb();
    const now = nowUnix();
    const expired = db
        .prepare('SELECT id, date, time FROM schedules')
        .all()
        .filter((row) => {
            const unix = lisbonToUnix(row.date, row.time || '00:00');
            return unix !== null && unix < now;
        });
    const remove = db.prepare('DELETE FROM schedules WHERE id = ?');
    db.transaction(() => expired.forEach((row) => remove.run(row.id)))();
    return expired.length;
}

function updateScheduleNotes(id, notes) {
    return getDb().prepare('UPDATE schedules SET notes = ? WHERE id = ?').run(notes, String(id)).changes > 0;
}

// ─── Roster ──────────────────────────────────────────────────

function getRoster() {
    return getDb().prepare('SELECT * FROM roster').all();
}

function getPlayer(discordId, discordTag) {
    return getDb().prepare(`SELECT * FROM roster WHERE ${WHO}`).get({ id: discordId, tag: discordTag }) ?? null;
}

// Adds a player, or replaces the existing entry for the same person
function addPlayer(discordId, discordTag, ign, roles, status) {
    const db = getDb();
    const existing = db.prepare(`SELECT rowid AS rid FROM roster WHERE ${WHO}`).get({ id: discordId, tag: discordTag });
    if (existing) {
        db.prepare(
            'UPDATE roster SET discordId = ?, discordTag = ?, ign = ?, roles = ?, status = ? WHERE rowid = ?',
        ).run(discordId, discordTag, ign, roles, status || 'Main', existing.rid);
    } else {
        db.prepare('INSERT INTO roster (discordId, discordTag, ign, roles, status) VALUES (?, ?, ?, ?, ?)').run(
            discordId,
            discordTag,
            ign,
            roles,
            status || 'Main',
        );
    }
}

function updatePlayer(discordId, discordTag, newRoles, newStatus) {
    const db = getDb();
    const player = db
        .prepare(`SELECT rowid AS rid, * FROM roster WHERE ${WHO}`)
        .get({ id: discordId, tag: discordTag });
    if (!player) return false;
    db.prepare('UPDATE roster SET discordId = ?, discordTag = ?, roles = ?, status = ? WHERE rowid = ?').run(
        discordId,
        discordTag,
        newRoles || player.roles,
        newStatus || player.status,
        player.rid,
    );
    return true;
}

function removePlayer(discordId, discordTag) {
    return getDb().prepare(`DELETE FROM roster WHERE ${WHO}`).run({ id: discordId, tag: discordTag }).changes > 0;
}

// ─── Absences ────────────────────────────────────────────────

function getAbsences() {
    return getDb().prepare('SELECT * FROM absences').all();
}

function getAbsencesFor(discordId, discordTag) {
    return getDb().prepare(`SELECT * FROM absences WHERE ${WHO}`).all({ id: discordId, tag: discordTag });
}

// Adds one absence per date and skips dates that already exist.
function addAbsences(discordId, discordTag, ign, reason, dates) {
    const db = getDb();
    const exists = db.prepare(`SELECT 1 FROM absences WHERE ${WHO} AND date = @date`);
    const insert = db.prepare(
        'INSERT INTO absences (discordId, discordTag, ign, reason, date, addedAt) VALUES (?, ?, ?, ?, ?, ?)',
    );
    let added = 0;
    let skipped = 0;
    db.transaction(() => {
        for (const date of dates) {
            if (exists.get({ id: discordId, tag: discordTag, date })) {
                skipped++;
                continue;
            }
            insert.run(discordId, discordTag, ign, reason, date, new Date().toISOString());
            added++;
        }
    })();
    return { added, skipped };
}

function removeAbsenceById(id) {
    return getDb().prepare('DELETE FROM absences WHERE id = ?').run(id).changes > 0;
}

function removeAbsencesByIds(ids) {
    const remove = getDb().prepare('DELETE FROM absences WHERE id = ?');
    getDb().transaction(() => ids.forEach((id) => remove.run(id)))();
}

// Removes absences from before today (Portugal time)
function removeExpiredAbsences() {
    const db = getDb();
    const today = todayLisbonISO();
    const expired = db
        .prepare('SELECT id, date FROM absences')
        .all()
        .filter((row) => {
            const iso = toISODate(row.date);
            return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso < today;
        });
    removeAbsencesByIds(expired.map((row) => row.id));
    return expired.length;
}

// ─── Timezones ───────────────────────────────────────────────

function getTimezones() {
    return getDb().prepare('SELECT * FROM timezones').all();
}

function addTimezone(label, tz) {
    const db = getDb();
    if (db.prepare('SELECT 1 FROM timezones WHERE tz = ?').get(tz)) return false;
    db.prepare('INSERT INTO timezones (label, tz) VALUES (?, ?)').run(label, tz);
    return true;
}

function removeTimezone(tz) {
    return getDb().prepare('DELETE FROM timezones WHERE tz = ?').run(tz).changes > 0;
}

// ─── Member sync ─────────────────────────────────────────────

// members: [{ id, tag, username }] from the Discord server.
// Links rows saved before 2.0.0 (tag only) to the member's ID, and refreshes tags after username changes.
function syncMemberTags(members) {
    const db = getDb();
    const byId = new Map(members.map((member) => [member.id, member]));
    const byTag = new Map();
    for (const member of members) {
        byTag.set(member.tag, member);
        byTag.set(member.username, member);
    }

    let linked = 0;
    let refreshed = 0;
    db.transaction(() => {
        for (const table of ['roster', 'absences']) {
            const rows = db.prepare(`SELECT rowid AS rid, discordTag, discordId FROM ${table}`).all();
            for (const row of rows) {
                const member = row.discordId ? byId.get(row.discordId) : byTag.get(row.discordTag);
                if (!member) continue;
                if (!row.discordId) {
                    db.prepare(`UPDATE ${table} SET discordId = ?, discordTag = ? WHERE rowid = ?`).run(
                        member.id,
                        member.tag,
                        row.rid,
                    );
                    linked++;
                } else if (row.discordTag !== member.tag) {
                    db.prepare(`UPDATE ${table} SET discordTag = ? WHERE rowid = ?`).run(member.tag, row.rid);
                    refreshed++;
                }
            }
        }
    })();
    return { linked, refreshed };
}

module.exports = {
    getDb,
    closeDb,
    getSchedules,
    addSchedule,
    removeSchedule,
    removeExpiredEvents,
    updateScheduleNotes,
    getRoster,
    getPlayer,
    addPlayer,
    updatePlayer,
    removePlayer,
    getAbsences,
    getAbsencesFor,
    addAbsences,
    removeAbsenceById,
    removeAbsencesByIds,
    removeExpiredAbsences,
    getTimezones,
    addTimezone,
    removeTimezone,
    syncMemberTags,
};
