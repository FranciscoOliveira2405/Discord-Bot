const { EmbedBuilder } = require('discord.js');
const { getSchedules } = require('../dbManager');
const { DIVIDER, CHANNELS, TYPE_EMOJIS, normalizeDate } = require('../constants');
const { buildTimezoneField } = require('./timezoneManager');
const { upsertBoard } = require('./boardManager');

const AUTHOR_NAME = 'Upcoming Schedule';

function buildScheduleEmbed() {
    const schedules = getSchedules();
    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: AUTHOR_NAME })
        .setFooter({ text: 'Auto-updated' })
        .setTimestamp();

    if (schedules.length === 0) {
        return embed.setDescription(`${DIVIDER}\n📭  No events scheduled.\n${DIVIDER}`);
    }

    const blocks = schedules.map((event) => {
        const emoji = TYPE_EMOJIS[event.type] || '📅';
        const opponent = event.opponent && event.opponent !== 'N/A' ? `  ·  vs ${event.opponent}` : '';
        const dateStr = normalizeDate(event.date);
        const timeStr = String(event.time);
        const timezones = buildTimezoneField(timeStr, dateStr);
        let block = `${emoji}  **${event.type}**${opponent}\n📅  ${dateStr}　🕐  ${timeStr}`;
        if (timezones) block += `\n🌍  ${timezones.replace(/\n/g, '　·　')}`;
        return block;
    });

    const count = `**${schedules.length}** event${schedules.length !== 1 ? 's' : ''} scheduled`;
    return embed.setDescription(`${count}\n${DIVIDER}\n${blocks.join(`\n${DIVIDER}\n`)}\n${DIVIDER}`);
}

async function updateScheduleMessage(guild) {
    await upsertBoard(guild, {
        channelName: CHANNELS.schedule,
        stateFile: 'scheduleMessageId.json',
        authorName: AUTHOR_NAME,
        embed: buildScheduleEmbed(),
    });
}

module.exports = { updateScheduleMessage };
