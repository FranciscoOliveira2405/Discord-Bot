const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DIVIDER, NO_PERMS_MANAGER, hasPerms } = require('../../utils/constants');
const { ephemeral, safeReply } = require('../../utils/reply');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock this channel')
        .setDefaultMemberPermissions(0),

    async execute(interaction) {
        if (!hasPerms(interaction)) return safeReply(interaction, ephemeral(NO_PERMS_MANAGER));
        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null,
            });
        } catch (err) {
            console.error(err);
            return safeReply(interaction, ephemeral('❌ Could not unlock channel.'));
        }
        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setAuthor({ name: 'CHANNEL UNLOCKED' })
            .setDescription(`${DIVIDER}\n🔓  This channel has been unlocked.\n${DIVIDER}`)
            .setFooter({ text: `Unlocked by ${interaction.user.tag}` })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
