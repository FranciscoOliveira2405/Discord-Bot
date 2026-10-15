const fs = require('fs');
const { dataPath } = require('../paths');
const { findChannel, teamMention } = require('../constants');
const { deleteLater } = require('../reply');

// A "board" is one embed the bot keeps up to date in a channel (schedule, absences).
// The message ID is stored in a small file so the same message is edited after a restart.

function readMessageId(file) {
    try {
        return JSON.parse(fs.readFileSync(dataPath(file), 'utf8')).messageId || null;
    } catch {
        return null;
    }
}

function writeMessageId(file, id) {
    try {
        fs.writeFileSync(dataPath(file), JSON.stringify({ messageId: id }), 'utf8');
    } catch (err) {
        console.error(`Failed to save ${file}:`, err);
    }
}

// Looks for an older board message in the channel (used if the stored ID was lost).
async function findBoardMessage(channel, authorName) {
    try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const botId = channel.guild.client.user.id;
        return (
            messages.find(
                (m) => m.author.id === botId && m.embeds.length > 0 && m.embeds[0].author?.name === authorName,
            ) ?? null
        );
    } catch {
        return null;
    }
}

// Edits the board message, or creates it if it does not exist yet.
async function upsertBoard(guild, { channelName, stateFile, authorName, embed, pingTeam = false }) {
    const channel = findChannel(guild, channelName);
    if (!channel) return;

    let message = null;
    const storedId = readMessageId(stateFile);
    if (storedId) message = await channel.messages.fetch(storedId).catch(() => null);
    if (!message) {
        message = await findBoardMessage(channel, authorName);
        if (message) writeMessageId(stateFile, message.id);
    }

    const mention = pingTeam ? teamMention(guild) : { content: '' };
    if (message) {
        await message.edit({ content: '', embeds: [embed] });
        if (pingTeam && mention.allowedMentions) {
            // A separate message that disappears quickly, so the board itself never pings
            deleteLater(await channel.send(mention), 10_000);
        }
        return;
    }

    const sent = await channel.send({ ...mention, embeds: [embed] });
    writeMessageId(stateFile, sent.id);
}

module.exports = { upsertBoard };
