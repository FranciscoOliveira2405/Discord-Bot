const { SlashCommandBuilder } = require('discord.js');
const { NO_PERMS_MANAGER, hasPerms } = require('../../utils/constants');
const { ephemeral, safeReply, replyThenDelete } = require('../../utils/reply');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Delete messages from this channel')
        .setDefaultMemberPermissions(0)
        .addIntegerOption((o) =>
            o
                .setName('amount')
                .setDescription('Number of messages (1-100)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100),
        ),

    async execute(interaction) {
        if (!hasPerms(interaction)) return safeReply(interaction, ephemeral(NO_PERMS_MANAGER));

        const amount = interaction.options.getInteger('amount') || 10;
        let deleted;
        try {
            deleted = await interaction.channel.bulkDelete(amount, true);
        } catch (err) {
            console.error(err);
            return safeReply(
                interaction,
                ephemeral('❌ Could not delete messages. Messages older than 14 days cannot be bulk deleted.'),
            );
        }
        await replyThenDelete(
            interaction,
            { content: `✅ Deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}.` },
            5_000,
        );
    },
};
