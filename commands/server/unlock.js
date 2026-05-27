const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DIVIDER, hasPerms } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock this channel')
        .setDefaultMemberPermissions(0),

    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
            const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'CHANNEL UNLOCKED' }).setDescription(`${DIVIDER}\n🔓  This channel has been unlocked.\n${DIVIDER}`).setFooter({ text: `Unlocked by ${interaction.user.tag}` }).setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } catch (err) { console.error(err); await interaction.reply({ content: '❌ Could not unlock channel.', ephemeral: true }); }
    }
};
