const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { LOGO, DIVIDER, hasPerms } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder().setName('lock').setDescription('Lock this channel'),
    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
            const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'CHANNEL LOCKED', iconURL: LOGO }).setDescription(`${DIVIDER}\n🔒  This channel has been locked.\n${DIVIDER}`).setFooter({ text: `Locked by ${interaction.user.tag}  ·  v3xys 💪`, iconURL: LOGO }).setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } catch (err) { console.error(err); await interaction.reply({ content: '❌ Could not lock channel.', ephemeral: true }); }
    }
};
