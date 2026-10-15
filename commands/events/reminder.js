const { SlashCommandBuilder, ComponentType } = require('discord.js');
const { getSchedules } = require('../../utils/dbManager');
const {
    CHANNELS,
    NO_PERMS_MANAGER,
    hasPerms,
    findChannel,
    teamMention,
    normalizeDate,
} = require('../../utils/constants');
const { buildEventEmbed, eventSelect } = require('../../utils/embeds');
const { EPHEMERAL, ephemeral, safeReply, isTimeout } = require('../../utils/reply');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Manually send a reminder for an event')
        .setDefaultMemberPermissions(0),

    async execute(interaction) {
        if (!hasPerms(interaction)) return safeReply(interaction, ephemeral(NO_PERMS_MANAGER));
        const schedules = getSchedules();
        if (schedules.length === 0) return safeReply(interaction, ephemeral('📭 No events scheduled.'));

        const message = await interaction.reply({
            content: '⚠️ **Select the event to send a reminder for:**',
            components: [eventSelect('reminder_select', 'Select event to remind...', schedules)],
            flags: EPHEMERAL,
        });

        let selection;
        try {
            selection = await message.awaitMessageComponent({
                componentType: ComponentType.StringSelect,
                time: 30_000,
            });
        } catch (err) {
            if (!isTimeout(err)) throw err;
            return interaction.editReply({ content: '⏱️ Timed out.', components: [] });
        }

        const event = schedules.find((e) => String(e.id) === selection.values[0]);
        if (!event) return selection.update({ content: '❌ Event not found.', components: [] });

        const channel = findChannel(interaction.guild, CHANNELS.reminders);
        if (!channel) return selection.update({ content: '❌ #reminders channel not found.', components: [] });

        // Not deleted automatically, so there are no "ghost pings"
        const embed = buildEventEmbed(event, { authorPrefix: '⚠️ REMINDER  ·  ' });
        await channel.send({ ...teamMention(interaction.guild), embeds: [embed] });
        await selection.update({
            content: `✅ Reminder sent for **${event.type}** on **${normalizeDate(event.date)}**.`,
            components: [],
        });
    },
};
