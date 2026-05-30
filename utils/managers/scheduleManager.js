const { getSchedules } = require('../dbManager');
const { DIVIDER, TYPE_EMOJIS, normalizeDate } = require('../constants');
const { buildTimezoneField } = require('./timezoneManager');
const path = require('path');
const fs = require('fs');

const SCHEDULE_MESSAGE_FILE = path.join(__dirname, '..', '..', 'data', 'scheduleMessageId.json');

function loadMessageId() {
    try { if (fs.existsSync(SCHEDULE_MESSAGE_FILE)) return JSON.parse(fs.readFileSync(SCHEDULE_MESSAGE_FILE, 'utf8')).messageId || null; } catch {} return null;
}
function saveMessageId(id) { try { fs.writeFileSync(SCHEDULE_MESSAGE_FILE, JSON.stringify({ messageId: id }), 'utf8'); } catch (e) { console.error('Failed to save schedule msg ID:', e); } }

async function findBotMessage(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const botId = channel.guild.client.user.id;
        return messages.find(m => m.author.id === botId && m.embeds.length > 0 && m.embeds[0].author?.name === 'Upcoming Schedule') || null;
    } catch { return null; }
}

async function buildScheduleEmbed() {
    const { EmbedBuilder } = require('discord.js');
    const schedules = await getSchedules();

    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setAuthor({ name: 'Upcoming Schedule' })
        .setFooter({ text: 'Auto-updated' })
        .setTimestamp();

    if (!schedules || schedules.length === 0) {
        embed.setDescription(`${DIVIDER}\n📭  No events scheduled.\n${DIVIDER}`);
        return embed;
    }

    const lines = await Promise.all(schedules.map(async e => {
        const emoji = TYPE_EMOJIS[e.type] || '📅';
        const opp = e.opponent && e.opponent !== 'N/A' ? `  ·  vs ${e.opponent}` : '';
        const dateStr = normalizeDate(e.date);
        const timeStr = String(e.time);
        const tzField = await buildTimezoneField(timeStr);
        let line = `${emoji}  **${e.type}**${opp}\n📅  ${dateStr}　🕐  ${timeStr}`;
        if (tzField) line += `\n🌍  ${tzField.replace(/\n/g, '　·　')}`;
        return line;
    }));

    let desc = `**${schedules.length}** event${schedules.length !== 1 ? 's' : ''} scheduled\n${DIVIDER}\n`;
    desc += lines.join(`\n${DIVIDER}\n`) + `\n${DIVIDER}`;
    embed.setDescription(desc);
    return embed;
}

async function updateScheduleMessage(guild) {
    const channel = guild.channels.cache.find(c => c.name === 'schedule');
    if (!channel) return;
    const embed = await buildScheduleEmbed();

    let existingMessage = null;

    const storedId = loadMessageId();
    if (storedId) {
        try { existingMessage = await channel.messages.fetch(storedId); } catch {}
    }

    if (!existingMessage) {
        existingMessage = await findBotMessage(channel);
        if (existingMessage) saveMessageId(existingMessage.id);
    }

    if (existingMessage) {
        await existingMessage.edit({ content: '', embeds: [embed] });
        return;
    }

    const sent = await channel.send({ embeds: [embed] });
    saveMessageId(sent.id);
}

module.exports = { updateScheduleMessage };
