const { SlashCommandBuilder } = require('discord.js');
const { hasPerms } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Delete messages from this channel')
        .setDefaultMemberPermissions(0)
        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1-100)').setRequired(false).setMinValue(1).setMaxValue(100)),

    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        const amount = interaction.options.getInteger('amount') || 10;
        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            const reply = await interaction.reply({ content: `✅ Deleted **${deleted.size}** message${deleted.size !== 1 ? 's' : ''}.`, ephemeral: false, fetchReply: true });
            setTimeout(() => reply.delete().catch(() => {}), 5_000);
        } catch (err) { console.error(err); await interaction.reply({ content: '❌ Could not delete messages. Messages older than 14 days cannot be bulk deleted.', ephemeral: true }); }
    }
};
