const { SlashCommandBuilder } = require('discord.js');
const { hasPerms } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder().setName('slowmode').setDescription('Set slowmode on this channel')
        .addStringOption(o => o.setName('duration').setDescription('Slowmode duration').setRequired(true)
            .addChoices({ name: 'Off', value: '0' }, { name: '5 seconds', value: '5' }, { name: '10 seconds', value: '10' }, { name: '30 seconds', value: '30' }, { name: '1 minute', value: '60' }, { name: '5 minutes', value: '300' }, { name: '10 minutes', value: '600' })),
    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        const seconds = parseInt(interaction.options.getString('duration'));
        try {
            await interaction.channel.setRateLimitPerUser(seconds);
            const msg = seconds === 0 ? '✅ Slowmode **disabled**.' : `✅ Slowmode set to **${seconds >= 60 ? `${seconds / 60} minute${seconds / 60 !== 1 ? 's' : ''}` : `${seconds} seconds`}**.`;
            const reply = await interaction.reply({ content: msg, ephemeral: false, fetchReply: true });
            setTimeout(() => reply.delete().catch(() => {}), 30_000);
        } catch (err) { console.error(err); await interaction.reply({ content: '❌ Could not set slowmode.', ephemeral: true }); }
    }
};
