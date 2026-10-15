const { MessageFlags } = require('discord.js');

const EPHEMERAL = MessageFlags.Ephemeral;

// Reply that only the person who used the command can see.
function ephemeral(content) {
    return { content, flags: EPHEMERAL };
}

// Replies, or follows up if the interaction was already answered. Never throws.
async function safeReply(interaction, payload) {
    try {
        if (interaction.replied || interaction.deferred) return await interaction.followUp(payload);
        return await interaction.reply(payload);
    } catch (err) {
        console.error('Failed to reply to interaction:', err);
        return null;
    }
}

// Deletes a message after a delay without keeping the process alive.
function deleteLater(message, ms = 30_000) {
    setTimeout(() => message.delete().catch(() => {}), ms).unref();
}

// Public reply that removes itself after a delay.
async function replyThenDelete(interaction, payload, ms = 30_000) {
    await interaction.reply(payload);
    setTimeout(() => interaction.deleteReply().catch(() => {}), ms).unref();
}

// awaitMessageComponent / awaitModalSubmit reject with this error when nobody answers in time.
function isTimeout(err) {
    return err?.code === 'InteractionCollectorError';
}

module.exports = { EPHEMERAL, ephemeral, safeReply, deleteLater, replyThenDelete, isTimeout };
