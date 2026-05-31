const { getAbsences } = require('../dbManager');
const { DIVIDER } = require('../constants');
const path = require('path');
const fs = require('fs');

const ABSENCE_MESSAGE_FILE = path.join(__dirname, '..', '..', 'data', 'absenceMessageId.json');

function loadMessageId() {
    try { if (fs.existsSync(ABSENCE_MESSAGE_FILE)) return JSON.parse(fs.readFileSync(ABSENCE_MESSAGE_FILE, 'utf8')).messageId || null; } catch {} return null;
}
function saveMessageId(id) { try { fs.writeFileSync(ABSENCE_MESSAGE_FILE, JSON.stringify({ messageId: id }), 'utf8'); } catch (e) { console.error('Failed to save absence msg ID:', e); } }

async function findBotMessage(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const botId = channel.guild.client.user.id;
        return messages.find(m => m.author.id === botId && m.embeds.length > 0 && m.embeds[0].author?.name === 'Player Absences') || null;
    } catch { return null; }
}

function dateToMs(str) {
    const [d, m, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d).getTime();
}

function groupIntoRanges(entries) {
    const sorted = [...entries].sort((a, b) => dateToMs(a.dateStr) - dateToMs(b.dateStr));
    const ranges = [];
    let i = 0;
    while (i < sorted.length) {
        let j = i + 1;
        while (j < sorted.length && dateToMs(sorted[j].dateStr) - dateToMs(sorted[j - 1].dateStr) === 86400000) j++;
        const group = sorted.slice(i, j);
        ranges.push({ start: group[0].dateStr, end: group[group.length - 1].dateStr, days: group.length, reason: group[0].reason });
        i = j;
    }
    return ranges;
}

async function buildAbsenceEmbed() {
    const { EmbedBuilder } = require('discord.js');
    const absences = await getAbsences();
    const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'Player Absences' }).setFooter({ text: 'Auto-updated' }).setTimestamp();

    if (!absences || absences.length === 0) {
        embed.setDescription(`${DIVIDER}\n✅  No absences reported. Everyone is available!\n${DIVIDER}`);
        return embed;
    }

    const grouped = {};
    for (const a of absences) {
        const key = String(a.discordTag);
        if (!grouped[key]) grouped[key] = { ign: a.ign, discordTag: a.discordTag, entries: [] };
        grouped[key].entries.push({ dateStr: String(a.date), reason: a.reason && a.reason !== 'N/A' ? a.reason : 'No reason given' });
    }

    // Count unique players, not total days
    const playerCount = Object.keys(grouped).length;
    const blocks = Object.values(grouped).map(({ ign, discordTag, entries }) => {
        const ranges = groupIntoRanges(entries);
        const lines = ranges.map(r => {
            if (r.days === 1) return `📅  ${r.start}  —  ${r.reason}`;
            return `📅  ${r.start}  →  ${r.end}  (${r.days} days)  —  ${r.reason}`;
        });
        return `💤  **${ign}**  ·  \`${discordTag}\`\n${lines.join('\n')}`;
    });

    let desc = `**${playerCount}** player${playerCount !== 1 ? 's' : ''} absent\n${DIVIDER}\n`;
    desc += blocks.join(`\n${DIVIDER}\n`) + `\n${DIVIDER}`;
    embed.setDescription(desc);
    return embed;
}

async function updateAbsenceMessage(guild, pingTeam = false) {
    const channel = guild.channels.cache.find(c => c.name === 'absences');
    if (!channel) return;
    const embed = await buildAbsenceEmbed();

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
        if (pingTeam) {
            const role = guild.roles.cache.find(r => r.name === 'TEAM');
            if (role) { const p = await channel.send({ content: `${role}` }); setTimeout(() => p.delete().catch(() => {}), 10_000); }
        }
        return;
    }

    const role = pingTeam ? guild.roles.cache.find(r => r.name === 'TEAM') : null;
    const sent = await channel.send({ content: role ? `${role}` : '', embeds: [embed] });
    saveMessageId(sent.id);
}

module.exports = { updateAbsenceMessage };
