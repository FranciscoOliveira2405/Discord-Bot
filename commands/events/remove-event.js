const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType, EmbedBuilder } = require('discord.js');
const { getSchedules, removeSchedule } = require('../../utils/excelManager');
const { LOGO, DIVIDER, TYPE_COLORS, TYPE_EMOJIS, TYPE_LABELS, normalizeDate, hasPerms } = require('../../utils/constants');
const { updateScheduleMessage } = require('../../utils/managers/scheduleManager');

module.exports = {
    data: new SlashCommandBuilder().setName('remove-event').setDescription('Remove an event from the schedule'),
    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        const schedules = await getSchedules();
        if (!schedules || schedules.length === 0) return interaction.reply({ content: '📭 No events to remove.', ephemeral: true });

        const options = schedules.slice(0, 25).map(e => {
            const emoji = TYPE_EMOJIS[e.type] || '📅';
            const dateStr = normalizeDate(e.date);
            const desc = e.opponent && e.opponent !== 'N/A' ? `vs ${e.opponent}` : `ID: ${e.id}`;
            return new StringSelectMenuOptionBuilder().setLabel(`${e.type} — ${dateStr} at ${e.time}`.slice(0, 100)).setDescription(desc.slice(0, 100)).setValue(String(e.id)).setEmoji(emoji);
        });

        const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('remove_event').setPlaceholder('Select event to remove...').addOptions(options));
        const reply = await interaction.reply({ content: '🗑️ **Select the event to remove:**', components: [row], ephemeral: true });

        try {
            const c = await reply.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 });
            const event = schedules.find(e => String(e.id) === c.values[0]);
            const removed = await removeSchedule(c.values[0]);
            if (!removed) return c.update({ content: '❌ Event not found.', components: [] });

            const color = event ? (TYPE_COLORS[event.type] || TYPE_COLORS.default) : TYPE_COLORS.default;
            const emoji = event ? (TYPE_EMOJIS[event.type] || '📅') : '📅';
            const label = event ? (TYPE_LABELS[event.type] || 'EVENT') : 'EVENT';
            const dateStr = event ? normalizeDate(event.date) : 'Unknown';

            const ch = interaction.guild.channels.cache.find(c => c.name === 'schedule');
            if (ch && event) {
                let desc = `${DIVIDER}\n📅  ${dateStr}　　🕐  ${String(event.time)}\n`;
                if (event.opponent && event.opponent !== 'N/A') desc += `🆚  ${event.opponent}\n`;
                desc += DIVIDER;
                const embed = new EmbedBuilder().setColor(color).setAuthor({ name: `${emoji} ${label} — REMOVED` }).setDescription(desc).setFooter({ text: `v3xys 💪  ·  ID: ${event.id}`, iconURL: LOGO }).setTimestamp();
                const sent = await ch.send({ embeds: [embed] }); setTimeout(() => sent.delete().catch(() => {}), 30_000);
            }
            await updateScheduleMessage(interaction.guild);
            await c.update({ content: `✅ **${event?.type}** on **${dateStr}** removed.`, components: [] });
        } catch { await interaction.editReply({ content: '⏱️ Timed out.', components: [] }); }
    }
};
