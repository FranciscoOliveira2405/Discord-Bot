const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DIVIDER, NO_PERMS_MANAGER, hasPerms } = require('../../utils/constants');
const { ephemeral, safeReply } = require('../../utils/reply');

module.exports = {
    data: new SlashCommandBuilder().setName('lock').setDescription('Lock this channel').setDefaultMemberPermissions(0),

    async execute(interaction) {
        if (!hasPerms(interaction)) return safeReply(interaction, ephemeral(NO_PERMS_MANAGER));
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false,
            });
        } catch (err) {
            console.error(err);
            return safeReply(interaction, ephemeral('❌ Could not lock channel.'));
        }
        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setAuthor({ name: 'CHANNEL LOCKED' })
            .setDescription(`${DIVIDER}\n🔒  This channel has been locked.\n${DIVIDER}`)
            .setFooter({ text: `Locked by ${interaction.user.tag}` })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
