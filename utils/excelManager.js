const ExcelJS = require('exceljs');
const path = require('path');
const { toISODate } = require('./constants');

const FILE_PATH = path.join(__dirname, '..', 'data', 'schedules.xlsx');

async function getWorkbook() {
    const wb = new ExcelJS.Workbook();
    try { await wb.xlsx.readFile(FILE_PATH); } catch {}
    return wb;
}

function ensureSheet(wb, name, headers) {
    let sheet = wb.getWorksheet(name);
    if (!sheet) { sheet = wb.addWorksheet(name); sheet.getRow(1).values = headers; }
    return sheet;
}

// ─── SCHEDULES ───────────────────────────────────────────
async function getSchedules() {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Schedules');
    if (!sheet) return [];
    const schedules = [];
    sheet.eachRow((row, i) => {
        if (i === 1) return;
        schedules.push({
            id: String(row.getCell(1).value), type: row.getCell(2).value,
            date: row.getCell(3).value, time: row.getCell(4).value,
            opponent: row.getCell(5).value, notes: row.getCell(6).value,
            status: row.getCell(7).value,
        });
    });
    return schedules;
}

async function addSchedule(type, date, time, opponent, notes) {
    const wb = await getWorkbook();
    const sheet = ensureSheet(wb, 'Schedules', ['ID', 'Type', 'Date', 'Time', 'Opponent', 'Notes', 'Status']);
    const id = Date.now();
    sheet.addRow([id, type, date, time, opponent || 'N/A', notes || 'N/A', 'Scheduled']);
    await wb.xlsx.writeFile(FILE_PATH);
    return id;
}

async function removeSchedule(id) {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Schedules');
    if (!sheet) return false;
    let removed = false, rowIndex = null;
    sheet.eachRow((row, i) => { if (String(row.getCell(1).value) === String(id)) { rowIndex = i; removed = true; } });
    if (rowIndex) sheet.spliceRows(rowIndex, 1);
    await wb.xlsx.writeFile(FILE_PATH);
    return removed;
}

async function removeExpiredEvents() {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Schedules');
    if (!sheet) return 0;
    const now = new Date();
    const toRemove = [];
    sheet.eachRow((row, i) => {
        if (i === 1) return;
        const date = row.getCell(3).value, time = row.getCell(4).value;
        if (!date || !time) return;
        try {
            const isoDate = toISODate(date);
            const timeStr = String(time).includes(':') ? String(time) : '00:00';
            if (new Date(`${isoDate}T${timeStr}:00`) < now) toRemove.push(i);
        } catch {}
    });
    for (const i of toRemove.reverse()) sheet.spliceRows(i, 1);
    await wb.xlsx.writeFile(FILE_PATH);
    return toRemove.length;
}

async function updateScheduleNotes(id, notes) {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Schedules');
    if (!sheet) return false;
    let updated = false;
    sheet.eachRow((row) => { if (String(row.getCell(1).value) === String(id)) { row.getCell(6).value = notes; updated = true; } });
    await wb.xlsx.writeFile(FILE_PATH);
    return updated;
}

// ─── ROSTER ──────────────────────────────────────────────
async function getRoster() {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Roster');
    if (!sheet) return [];
    const roster = [];
    sheet.eachRow((row, i) => {
        if (i === 1) return;
        roster.push({
            discordTag: row.getCell(1).value, ign: row.getCell(2).value,
            tRole: row.getCell(3).value, ctRole: row.getCell(4).value,
            status: row.getCell(5).value,
        });
    });
    return roster;
}

async function addPlayer(discordTag, ign, tRole, ctRole) {
    const wb = await getWorkbook();
    const sheet = ensureSheet(wb, 'Roster', ['Discord Tag', 'IGN', 'T Role', 'CT Role', 'Status']);
    sheet.addRow([discordTag, ign, tRole, ctRole, 'Active']);
    await wb.xlsx.writeFile(FILE_PATH);
}

async function updatePlayer(discordTag, newTRole, newCTRole, newStatus) {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Roster');
    if (!sheet) return false;
    let updated = false;
    sheet.eachRow((row) => {
        if (row.getCell(1).value === discordTag) {
            if (newTRole) row.getCell(3).value = newTRole;
            if (newCTRole) row.getCell(4).value = newCTRole;
            if (newStatus) row.getCell(5).value = newStatus;
            updated = true;
        }
    });
    await wb.xlsx.writeFile(FILE_PATH);
    return updated;
}

async function removePlayer(discordTag) {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Roster');
    if (!sheet) return false;
    let removed = false, rowIndex = null;
    sheet.eachRow((row, i) => { if (row.getCell(1).value === discordTag) { rowIndex = i; removed = true; } });
    if (rowIndex) sheet.spliceRows(rowIndex, 1);
    await wb.xlsx.writeFile(FILE_PATH);
    return removed;
}

// ─── ABSENCES ────────────────────────────────────────────
async function getAbsences() {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Absences');
    if (!sheet) return [];
    const absences = [];
    sheet.eachRow((row, i) => {
        if (i === 1) return;
        absences.push({
            discordTag: row.getCell(1).value, ign: row.getCell(2).value,
            reason: row.getCell(3).value, date: row.getCell(4).value,
            addedAt: row.getCell(5).value,
        });
    });
    return absences;
}

async function addAbsence(discordTag, ign, reason, date) {
    const wb = await getWorkbook();
    const sheet = ensureSheet(wb, 'Absences', ['Discord Tag', 'IGN', 'Reason', 'Date', 'Added At']);
    sheet.addRow([discordTag, ign, reason, date, new Date().toISOString()]);
    await wb.xlsx.writeFile(FILE_PATH);
}

async function removeAbsence(discordTag) {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Absences');
    if (!sheet) return false;
    let removed = false, rowIndex = null;
    sheet.eachRow((row, i) => { if (String(row.getCell(1).value) === String(discordTag)) { rowIndex = i; removed = true; } });
    if (rowIndex) sheet.spliceRows(rowIndex, 1);
    await wb.xlsx.writeFile(FILE_PATH);
    return removed;
}

async function removeExpiredAbsences() {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Absences');
    if (!sheet) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const toRemove = [];
    sheet.eachRow((row, i) => {
        if (i === 1) return;
        const date = row.getCell(4).value;
        if (!date) return;
        try {
            const d = new Date(toISODate(date)); d.setHours(0, 0, 0, 0);
            if (d < today) toRemove.push(i);
        } catch {}
    });
    for (const i of toRemove.reverse()) sheet.spliceRows(i, 1);
    await wb.xlsx.writeFile(FILE_PATH);
    return toRemove.length;
}

// ─── TIMEZONES ───────────────────────────────────────────
async function getTimezones() {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Timezones');
    if (!sheet) return [];
    const timezones = [];
    sheet.eachRow((row, i) => { if (i === 1) return; timezones.push({ label: row.getCell(1).value, tz: row.getCell(2).value }); });
    return timezones;
}

async function addTimezone(label, tz) {
    const wb = await getWorkbook();
    const sheet = ensureSheet(wb, 'Timezones', ['Label', 'Timezone']);
    let exists = false;
    sheet.eachRow((row, i) => { if (i === 1) return; if (row.getCell(2).value === tz) exists = true; });
    if (exists) return false;
    sheet.addRow([label, tz]);
    await wb.xlsx.writeFile(FILE_PATH);
    return true;
}

async function removeTimezone(tz) {
    const wb = await getWorkbook();
    const sheet = wb.getWorksheet('Timezones');
    if (!sheet) return false;
    let removed = false, rowIndex = null;
    sheet.eachRow((row, i) => { if (i === 1) return; if (row.getCell(2).value === tz) { rowIndex = i; removed = true; } });
    if (rowIndex) sheet.spliceRows(rowIndex, 1);
    await wb.xlsx.writeFile(FILE_PATH);
    return removed;
}

module.exports = {
    getSchedules, addSchedule, removeSchedule, removeExpiredEvents, updateScheduleNotes,
    getRoster, addPlayer, updatePlayer, removePlayer,
    getAbsences, addAbsence, removeAbsence, removeExpiredAbsences,
    getTimezones, addTimezone, removeTimezone,
};
