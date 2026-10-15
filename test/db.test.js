const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');

// Every test file runs in its own process, so the data folder can be set once here.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-test-'));
process.env.BOT_DATA_DIR = dir;

// A database as created by versions before 2.0.0: file "v3xys.db", tag only, no Discord IDs.
const legacy = new Database(path.join(dir, 'v3xys.db'));
legacy.exec(`
    CREATE TABLE schedules (id TEXT PRIMARY KEY, type TEXT, date TEXT, time TEXT, opponent TEXT DEFAULT 'N/A', notes TEXT DEFAULT 'N/A', status TEXT DEFAULT 'Scheduled');
    CREATE TABLE roster (discordTag TEXT PRIMARY KEY, ign TEXT, roles TEXT, status TEXT DEFAULT 'Main');
    CREATE TABLE absences (id INTEGER PRIMARY KEY AUTOINCREMENT, discordTag TEXT, ign TEXT, reason TEXT, date TEXT, addedAt TEXT);
    CREATE TABLE timezones (label TEXT, tz TEXT UNIQUE);
    INSERT INTO roster VALUES ('alice', 'Ali', 'IGL, Entry', 'Main');
    INSERT INTO roster VALUES ('bob', 'Bobby', 'AWPer', 'Subs');
    INSERT INTO absences (discordTag, ign, reason, date, addedAt) VALUES ('alice', 'Ali', 'Trip', '01/01/2099', 'x');
    INSERT INTO timezones VALUES ('Germany', 'GMT+2');
`);
legacy.close();

const db = require('../utils/dbManager');

test.after(() => {
    db.closeDb();
    fs.rmSync(dir, { recursive: true, force: true });
});

test('the old v3xys.db is renamed to bot.db and keeps its data', () => {
    assert.equal(db.getRoster().length, 2);
    assert.equal(fs.existsSync(path.join(dir, 'bot.db')), true);
    assert.equal(fs.existsSync(path.join(dir, 'v3xys.db')), false);
});

test('old rows are linked to Discord IDs and tags are refreshed', () => {
    const result = db.syncMemberTags([
        { id: '1001', tag: 'alice_new', username: 'alice' }, // matched by the old name, now has a new tag
        { id: '1002', tag: 'carol', username: 'carol' },
    ]);
    assert.deepEqual(result, { linked: 2, refreshed: 0 }); // alice in roster + alice in absences
    const alice = db.getPlayer('1001', 'whatever');
    assert.equal(alice.ign, 'Ali');
    assert.equal(alice.discordTag, 'alice_new');
    assert.equal(db.getPlayer('9999', 'bob').ign, 'Bobby'); // bob is still found by tag until he is linked
});

test('a player who changes username is still the same player', () => {
    db.syncMemberTags([{ id: '1001', tag: 'alice_v3', username: 'alice_v3' }]);
    assert.equal(db.getPlayer('1001', 'ignored').discordTag, 'alice_v3');
    db.updatePlayer('1001', 'alice_v3', null, 'Subs');
    const roster = db.getRoster().filter((p) => p.discordId === '1001');
    assert.equal(roster.length, 1);
    assert.equal(roster[0].status, 'Subs');
    assert.equal(roster[0].roles, 'IGL, Entry'); // untouched
});

test('addPlayer replaces the entry of the same person instead of duplicating it', () => {
    db.addPlayer('1001', 'alice_v4', 'Ali2', 'Lurker', 'Main');
    const rows = db.getRoster().filter((p) => p.discordId === '1001');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ign, 'Ali2');
    assert.equal(rows[0].discordTag, 'alice_v4');
});

test('removePlayer works by ID', () => {
    assert.equal(db.removePlayer('1001', 'x'), true);
    assert.equal(db.removePlayer('1001', 'x'), false);
});

test('absences skip duplicates and expire', () => {
    const first = db.addAbsences('2001', 'dave', 'Dave', 'Exam', ['10/10/2020', '01/01/2099']);
    assert.deepEqual(first, { added: 2, skipped: 0 });
    const again = db.addAbsences('2001', 'dave', 'Dave', 'Exam', ['10/10/2020', '02/01/2099']);
    assert.deepEqual(again, { added: 1, skipped: 1 });
    assert.equal(db.getAbsencesFor('2001', 'dave').length, 3);

    assert.equal(db.removeExpiredAbsences(), 1); // only 10/10/2020 is in the past
    assert.equal(db.getAbsencesFor('2001', 'dave').length, 2);
});

test('events are sorted by time and expired ones are removed', () => {
    db.addSchedule('Practice', '05/05/2099', '20:00', null, null);
    db.addSchedule('Scrimmage', '05/05/2099', '18:00', 'Team X', 'Bring snacks');
    const expiredId = db.addSchedule('Practice', '01/01/2020', '20:00', null, null);

    const sorted = db.getSchedules();
    assert.equal(sorted[0].date, '01/01/2020');
    assert.equal(sorted[1].time, '18:00');
    assert.equal(sorted[2].time, '20:00');

    assert.equal(db.removeExpiredEvents(), 1);
    assert.equal(db.removeSchedule(expiredId), false); // already gone
    assert.equal(db.getSchedules().length, 2);
});

test('timezones are not added twice', () => {
    assert.equal(db.addTimezone('Germany again', 'GMT+2'), false);
    assert.equal(db.addTimezone('Brazil', 'GMT-3'), true);
    assert.equal(db.removeTimezone('GMT-3'), true);
});
