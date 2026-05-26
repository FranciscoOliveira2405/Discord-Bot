const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { LOGO, DIVIDER, hasPerms } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder().setName('announce').setDescription('Send an announcement')
        .addStringOption(o => o.setName('message').setDescription('The message').setRequired(true))
        .addRoleOption(o => o.setName('role').setDescription('Role to ping').setRequired(true)),
    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        const message = interaction.options.getString('message');
        const role = interaction.options.getRole('role');
        try {
            const ch = interaction.guild.channels.cache.find(c => c.name === 'announcements');
            if (!ch) return interaction.reply({ content: '❌ #announcements channel not found.', ephemeral: true });
            const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'v3xys — Announcement', iconURL: LOGO }).setDescription(`${DIVIDER}\n${message}\n${DIVIDER}`).setFooter({ text: `📣 ${interaction.user.tag}  ·  v3xys 💪`, iconURL: LOGO }).setTimestamp();
            await ch.send({ content: `${role}`, embeds: [embed] });
            await interaction.reply({ content: `✅ Announcement sent to ${ch}!`, ephemeral: true });
        } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
    }
};
