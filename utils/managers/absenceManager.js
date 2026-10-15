const { EmbedBuilder } = require('discord.js');
const { getAbsences } = require('../dbManager');
const { DIVIDER, CHANNELS } = require('../constants');
const { groupIntoRanges } = require('../ranges');
const { upsertBoard } = require('./boardManager');

const AUTHOR_NAME = 'Player Absences';

function buildAbsenceEmbed() {
    const absences = getAbsences();
    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: AUTHOR_NAME })
        .setFooter({ text: 'Auto-updated' })
        .setTimestamp();

    if (absences.length === 0) {
        return embed.setDescription(`${DIVIDER}\n✅  No absences reported. Everyone is available!\n${DIVIDER}`);
    }

    // One group per person (by Discord ID, or by tag for entries not linked yet)
    const players = new Map();
    for (const absence of absences) {
        const key = absence.discordId ?? absence.discordTag;
        if (!players.has(key)) players.set(key, { ign: absence.ign, discordTag: absence.discordTag, entries: [] });
        players.get(key).entries.push({
            date: String(absence.date),
            reason: absence.reason && absence.reason !== 'N/A' ? absence.reason : 'No reason given',
        });
    }

    const blocks = [...players.values()].map(({ ign, discordTag, entries }) => {
        const lines = groupIntoRanges(entries).map((range) =>
            range.days === 1
                ? `📅  ${range.start}  —  ${range.reason}`
                : `📅  ${range.start}  →  ${range.end}  (${range.days} days)  —  ${range.reason}`,
        );
        return `💤  **${ign}**  ·  \`${discordTag}\`\n${lines.join('\n')}`;
    });

    // Counts people, not days
    const count = `**${players.size}** player${players.size !== 1 ? 's' : ''} absent`;
    return embed.setDescription(`${count}\n${DIVIDER}\n${blocks.join(`\n${DIVIDER}\n`)}\n${DIVIDER}`);
}

async function updateAbsenceMessage(guild, pingTeam = false) {
    await upsertBoard(guild, {
        channelName: CHANNELS.absences,
        stateFile: 'absenceMessageId.json',
        authorName: AUTHOR_NAME,
        embed: buildAbsenceEmbed(),
        pingTeam,
    });
}

module.exports = { updateAbsenceMessage };
