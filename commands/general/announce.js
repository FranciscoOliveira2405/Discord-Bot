const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DIVIDER, hasPerms } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement to #announcements')
        .setDefaultMemberPermissions(0)
        .addStringOption(o => o.setName('message').setDescription('The message').setRequired(true)),

    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        const message = interaction.options.getString('message');
        try {
            const ch = interaction.guild.channels.cache.find(c => c.name === 'announcements');
            if (!ch) return interaction.reply({ content: '❌ #announcements channel not found.', ephemeral: true });
            const teamRole = interaction.guild.roles.cache.find(r => r.name === 'TEAM');
            const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'Announcement' }).setDescription(`${DIVIDER}\n${message}\n${DIVIDER}`).setFooter({ text: `📣 ${interaction.user.tag}` }).setTimestamp();
            await ch.send({ content: teamRole ? `${teamRole}` : '', embeds: [embed] });
            await interaction.reply({ content: `✅ Announcement sent!`, ephemeral: true });
        } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
    }
};
