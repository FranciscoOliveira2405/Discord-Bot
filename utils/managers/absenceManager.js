const { getAbsences } = require('../excelManager');
const { DIVIDER } = require('../constants');
const path = require('path');
const fs = require('fs');

const ABSENCE_MESSAGE_FILE = path.join(__dirname, '..', '..', 'data', 'absenceMessageId.json');

function loadMessageId() {
    try { if (fs.existsSync(ABSENCE_MESSAGE_FILE)) return JSON.parse(fs.readFileSync(ABSENCE_MESSAGE_FILE, 'utf8')).messageId || null; } catch {} return null;
}
function saveMessageId(id) { try { fs.writeFileSync(ABSENCE_MESSAGE_FILE, JSON.stringify({ messageId: id }), 'utf8'); } catch (e) { console.error('Failed to save absence msg ID:', e); } }

async function buildAbsenceEmbed() {
    const { EmbedBuilder } = require('discord.js');
    const absences = await getAbsences();
    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setAuthor({ name: 'Player Absences' })
        .setFooter({ text: 'Auto-updated' })
        .setTimestamp();

    if (!absences || absences.length === 0) {
        embed.setDescription(`${DIVIDER}\n✅  No absences reported. Everyone is available!\n${DIVIDER}`);
        return embed;
    }

    const grouped = {};
    for (const a of absences) {
        const key = String(a.discordTag);
        if (!grouped[key]) grouped[key] = { ign: a.ign, discordTag: a.discordTag, entries: [] };
        const dateStr = a.date ? (typeof a.date === 'object' ? a.date.toISOString().split('T')[0] : String(a.date)) : 'Unknown';
        grouped[key].entries.push({ dateStr, reason: a.reason && a.reason !== 'N/A' ? a.reason : 'No reason given' });
    }

    const total = absences.length;
    const blocks = Object.values(grouped).map(({ ign, discordTag, entries }) => {
        return `💤  **${ign}**  ·  \`${discordTag}\`\n${entries.map(e => `📅  ${e.dateStr}  —  ${e.reason}`).join('\n')}`;
    });

    let desc = `**${total}** absence${total !== 1 ? 's' : ''}\n${DIVIDER}\n`;
    desc += blocks.join(`\n${DIVIDER}\n`) + `\n${DIVIDER}`;
    embed.setDescription(desc);
    return embed;
}

async function updateAbsenceMessage(guild, pingTeam = false) {
    const channel = guild.channels.cache.find(c => c.name === 'absences');
    if (!channel) return;
    const embed = await buildAbsenceEmbed();
    const storedId = loadMessageId();
    if (storedId) {
        try {
            const existing = await channel.messages.fetch(storedId);
            await existing.edit({ content: '', embeds: [embed] });
            if (pingTeam) { const role = guild.roles.cache.find(r => r.name === 'team'); if (role) { const p = await channel.send({ content: `${role}` }); setTimeout(() => p.delete().catch(() => {}), 30_000); } }
            return;
        } catch {}
    }
    const role = pingTeam ? guild.roles.cache.find(r => r.name === 'team') : null;
    const sent = await channel.send({ content: role ? `${role}` : '', embeds: [embed] });
    saveMessageId(sent.id);
}

module.exports = { updateAbsenceMessage };
