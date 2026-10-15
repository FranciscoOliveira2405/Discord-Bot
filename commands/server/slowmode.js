const { SlashCommandBuilder } = require('discord.js');
const { NO_PERMS_MANAGER, hasPerms } = require('../../utils/constants');
const { ephemeral, safeReply, replyThenDelete } = require('../../utils/reply');

function describe(seconds) {
    if (seconds === 0) return '✅ Slowmode **disabled**.';
    if (seconds < 60) return `✅ Slowmode set to **${seconds} seconds**.`;
    const minutes = seconds / 60;
    return `✅ Slowmode set to **${minutes} minute${minutes !== 1 ? 's' : ''}**.`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set slowmode on this channel')
        .setDefaultMemberPermissions(0)
        .addStringOption((o) =>
            o
                .setName('duration')
                .setDescription('Slowmode duration')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: '0' },
                    { name: '5 seconds', value: '5' },
                    { name: '10 seconds', value: '10' },
                    { name: '30 seconds', value: '30' },
                    { name: '1 minute', value: '60' },
                    { name: '5 minutes', value: '300' },
                    { name: '10 minutes', value: '600' },
                ),
        ),

    async execute(interaction) {
        if (!hasPerms(interaction)) return safeReply(interaction, ephemeral(NO_PERMS_MANAGER));

        const seconds = parseInt(interaction.options.getString('duration'), 10);
        try {
            await interaction.channel.setRateLimitPerUser(seconds);
        } catch (err) {
            console.error(err);
            return safeReply(interaction, ephemeral('❌ Could not set slowmode.'));
        }
        await replyThenDelete(interaction, { content: describe(seconds) });
    },
};
