const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getSchedules, removeExpiredEvents, removeExpiredAbsences } = require('../dbManager');
const { updateAbsenceMessage } = require('./absenceManager');
const { updateScheduleMessage } = require('./scheduleManager');
const { DIVIDER, TYPE_COLORS, TYPE_EMOJIS, TYPE_LABELS, toUnixTimestamp, normalizeDate } = require('../constants');
const { BASE_LABEL } = require('./timezoneManager');

function startReminders(client) {
    cron.schedule('0 9 * * *', async () => {
        try {
            const schedules = await getSchedules();
            const today = new Date();
            const todayISO = today.toISOString().split('T')[0];
            const guild = client.guilds.cache.first(); if (!guild) return;
            const channel = guild.channels.cache.find(c => c.name === 'reminders'); if (!channel) return;
            const teamRole = guild.roles.cache.find(r => r.name === 'TEAM');

            for (const event of schedules) {
                const dateStr = normalizeDate(event.date);
                const isoDate = (() => { try { const [d,m,y] = dateStr.split('/'); return `${y}-${m}-${d}`; } catch { return null; } })();
                if (!isoDate || isoDate !== todayISO) continue;

                const color = TYPE_COLORS[event.type] || TYPE_COLORS.default;
                const emoji = TYPE_EMOJIS[event.type] || '📅';
                const label = TYPE_LABELS[event.type] || String(event.type).toUpperCase();
                const isMatch = event.type === 'Official Match' || event.type === 'Scrimmage';
                const unix = toUnixTimestamp(dateStr, String(event.time));
                const ts = unix ? `<t:${unix}:R>` : '';
                const title = isMatch ? `v3xys vs ${event.opponent && event.opponent !== 'N/A' ? event.opponent : 'TBD'}` : label;

                let desc = `${DIVIDER}\n📅  ${dateStr}　　🕐  ${String(event.time)} ${BASE_LABEL}　　${ts ? `⏳  ${ts}` : ''}\n`;
                if (isMatch && event.opponent && event.opponent !== 'N/A') desc += `🆚  ${event.opponent}\n`;
                if (event.notes && event.notes !== 'N/A') desc += `${DIVIDER}\n📝  ${event.notes}\n`;
                desc += DIVIDER;

                const embed = new EmbedBuilder().setColor(color).setAuthor({ name: `⚠️ REMINDER — TODAY  ·  ${emoji} ${label}` }).setTitle(title).setDescription(desc).setFooter({ text: `ID: ${event.id}` }).setTimestamp();
                // No auto-delete — message stays permanently
                await channel.send({ content: teamRole ? `${teamRole}` : '', embeds: [embed] });
            }
        } catch (err) { console.error('Reminder error:', err); }
    }, { timezone: 'Europe/Lisbon' });

    cron.schedule('0 0 * * *', async () => {
        try {
            const guild = client.guilds.cache.first();
            const count = await removeExpiredEvents();
            if (count > 0) { console.log(`🗑️ Removed ${count} expired event(s)`); if (guild) await updateScheduleMessage(guild); }
        } catch (err) { console.error('Event cleanup error:', err); }
    }, { timezone: 'Europe/Lisbon' });

    cron.schedule('0 0 * * *', async () => {
        try {
            const guild = client.guilds.cache.first();
            const count = await removeExpiredAbsences();
            if (count > 0) { console.log(`💤 Removed ${count} expired absence(s)`); if (guild) await updateAbsenceMessage(guild, false); }
        } catch (err) { console.error('Absence cleanup error:', err); }
    }, { timezone: 'Europe/Lisbon' });

    console.log('✅ Reminder system started');
}

module.exports = { startReminders };
