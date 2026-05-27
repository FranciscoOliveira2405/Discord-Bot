const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DIVIDER, hasPerms } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock this channel')
        .setDefaultMemberPermissions(0),

    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
            const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'CHANNEL LOCKED' }).setDescription(`${DIVIDER}\n🔒  This channel has been locked.\n${DIVIDER}`).setFooter({ text: `Locked by ${interaction.user.tag}` }).setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } catch (err) { console.error(err); await interaction.reply({ content: '❌ Could not lock channel.', ephemeral: true }); }
    }
};
