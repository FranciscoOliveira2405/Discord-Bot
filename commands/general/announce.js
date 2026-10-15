const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DIVIDER, CHANNELS, NO_PERMS_MANAGER, hasPerms, findChannel, teamMention } = require('../../utils/constants');
const { ephemeral, safeReply } = require('../../utils/reply');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement to #announcements')
        .setDefaultMemberPermissions(0)
        .addStringOption((o) =>
            o.setName('message').setDescription('The message').setRequired(true).setMaxLength(1800),
        ),

    async execute(interaction) {
        if (!hasPerms(interaction)) return safeReply(interaction, ephemeral(NO_PERMS_MANAGER));

        const channel = findChannel(interaction.guild, CHANNELS.announcements);
        if (!channel) return safeReply(interaction, ephemeral('❌ #announcements channel not found.'));

        const message = interaction.options.getString('message');
        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setAuthor({ name: 'Announcement' })
            .setDescription(`${DIVIDER}\n${message}\n${DIVIDER}`)
            .setFooter({ text: `📣 ${interaction.user.tag}` })
            .setTimestamp();

        await channel.send({ ...teamMention(interaction.guild), embeds: [embed] });
        await safeReply(interaction, ephemeral('✅ Announcement sent!'));
    },
};
