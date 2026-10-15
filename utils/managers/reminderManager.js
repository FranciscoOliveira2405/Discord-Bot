const cron = require('node-cron');
const { getSchedules, removeExpiredEvents, removeExpiredAbsences } = require('../dbManager');
const { updateAbsenceMessage } = require('./absenceManager');
const { updateScheduleMessage } = require('./scheduleManager');
const { CHANNELS, findChannel, teamMention, toISODate } = require('../constants');
const { getMainGuild } = require('../config');
const { todayLisbonISO, TIMEZONE } = require('../time');
const { buildEventEmbed } = require('../embeds');

const OPTIONS = { timezone: TIMEZONE };

function startReminders(client) {
    // 9 AM every day: remind the team about today's events
    cron.schedule(
        '0 9 * * *',
        async () => {
            try {
                const guild = getMainGuild(client);
                const channel = guild && findChannel(guild, CHANNELS.reminders);
                if (!channel) return;

                const today = todayLisbonISO();
                for (const event of getSchedules()) {
                    if (toISODate(event.date) !== today) continue;
                    const embed = buildEventEmbed(event, {
                        authorPrefix: '⚠️ REMINDER — TODAY  ·  ',
                        showTimezones: false,
                    });
                    // Not deleted automatically, so there are no "ghost pings"
                    await channel.send({ ...teamMention(guild), embeds: [embed] });
                }
            } catch (err) {
                console.error('Reminder error:', err);
            }
        },
        OPTIONS,
    );

    // Midnight: remove events that already happened
    cron.schedule(
        '0 0 * * *',
        async () => {
            try {
                const count = removeExpiredEvents();
                if (count === 0) return;
                console.log(`🗑️ Removed ${count} expired event(s)`);
                const guild = getMainGuild(client);
                if (guild) await updateScheduleMessage(guild);
            } catch (err) {
                console.error('Event cleanup error:', err);
            }
        },
        OPTIONS,
    );

    // Midnight: remove absences that already passed
    cron.schedule(
        '0 0 * * *',
        async () => {
            try {
                const count = removeExpiredAbsences();
                if (count === 0) return;
                console.log(`💤 Removed ${count} expired absence(s)`);
                const guild = getMainGuild(client);
                if (guild) await updateAbsenceMessage(guild, false);
            } catch (err) {
                console.error('Absence cleanup error:', err);
            }
        },
        OPTIONS,
    );

    console.log('✅ Reminder system started');
}

module.exports = { startReminders };
