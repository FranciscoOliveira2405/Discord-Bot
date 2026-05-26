const { getSchedules } = require('../excelManager');
const { LOGO, DIVIDER, TYPE_EMOJIS, normalizeDate } = require('../constants');
const path = require('path');
const fs = require('fs');

const SCHEDULE_MESSAGE_FILE = path.join(__dirname, '..', '..', 'data', 'scheduleMessageId.json');

function loadMessageId() {
    try { if (fs.existsSync(SCHEDULE_MESSAGE_FILE)) return JSON.parse(fs.readFileSync(SCHEDULE_MESSAGE_FILE, 'utf8')).messageId || null; } catch {} return null;
}
function saveMessageId(id) { try { fs.writeFileSync(SCHEDULE_MESSAGE_FILE, JSON.stringify({ messageId: id }), 'utf8'); } catch (e) { console.error('Failed to save schedule msg ID:', e); } }

async function buildScheduleEmbed() {
    const { EmbedBuilder } = require('discord.js');
    const schedules = await getSchedules();
    const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'v3xys — Upcoming Schedule', iconURL: LOGO }).setFooter({ text: 'v3xys — Auto-updated', iconURL: LOGO }).setTimestamp();

    if (!schedules || schedules.length === 0) {
        embed.setDescription(`${DIVIDER}\n📭  No events scheduled.\n${DIVIDER}`);
        return embed;
    }
    const lines = schedules.map(e => {
        const emoji = TYPE_EMOJIS[e.type] || '📅';
        const opp = e.opponent && e.opponent !== 'N/A' ? `  ·  vs ${e.opponent}` : '';
        return `${emoji}  **${e.type}**${opp}\n📅  ${normalizeDate(e.date)}　🕐  ${String(e.time)}`;
    });
    let desc = `**${schedules.length}** event${schedules.length !== 1 ? 's' : ''} scheduled\n${DIVIDER}\n`;
    desc += lines.join(`\n${DIVIDER}\n`) + `\n${DIVIDER}`;
    embed.setDescription(desc);
    return embed;
}

async function updateScheduleMessage(guild) {
    const channel = guild.channels.cache.find(c => c.name === 'schedule');
    if (!channel) return;
    const embed = await buildScheduleEmbed();
    const storedId = loadMessageId();
    if (storedId) {
        try { const existing = await channel.messages.fetch(storedId); await existing.edit({ content: '', embeds: [embed] }); return; } catch {}
    }
    const sent = await channel.send({ embeds: [embed] });
    saveMessageId(sent.id);
}

module.exports = { updateScheduleMessage };
