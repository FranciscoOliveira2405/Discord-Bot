const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType, EmbedBuilder } = require('discord.js');
const { getSchedules, updateScheduleNotes } = require('../../utils/excelManager');
const { LOGO, DIVIDER, TYPE_COLORS, TYPE_EMOJIS, TYPE_LABELS, normalizeDate, hasPerms } = require('../../utils/constants');
const { updateScheduleMessage } = require('../../utils/managers/scheduleManager');

module.exports = {
    data: new SlashCommandBuilder().setName('event-notes').setDescription('Add or update notes for an event'),
    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        const schedules = await getSchedules();
        if (!schedules || schedules.length === 0) return interaction.reply({ content: '📭 No events to add notes to.', ephemeral: true });

        const options = schedules.slice(0, 25).map(e => {
            const emoji = TYPE_EMOJIS[e.type] || '📅';
            const notes = e.notes && e.notes !== 'N/A' ? `Notes: ${String(e.notes).slice(0, 50)}` : 'No notes yet';
            return new StringSelectMenuOptionBuilder().setLabel(`${e.type} — ${normalizeDate(e.date)} at ${e.time}`.slice(0, 100)).setDescription(notes.slice(0, 100)).setValue(String(e.id)).setEmoji(emoji);
        });

        const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('event_notes').setPlaceholder('Select event...').addOptions(options));
        const reply = await interaction.reply({ content: '📝 **Select event to update notes:**', components: [row], ephemeral: true });

        try {
            const c = await reply.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 });
            const event = schedules.find(e => String(e.id) === c.values[0]);
            if (!event) return c.update({ content: '❌ Event not found.', components: [] });
            const dateStr = normalizeDate(event.date);

            await c.update({ content: `📝 **Type notes for: ${event.type} on ${dateStr} at ${event.time}**\n\nSend as a message. You have **60 seconds**.`, components: [] });

            const collector = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, max: 1, time: 60_000 });
            collector.on('collect', async msg => {
                const notes = msg.content.trim();
                msg.delete().catch(() => {});
                try {
                    const updated = await updateScheduleNotes(event.id, notes);
                    if (!updated) return interaction.followUp({ content: '❌ Event not found.', ephemeral: true });

                    const color = TYPE_COLORS[event.type] || TYPE_COLORS.default;
                    const emoji = TYPE_EMOJIS[event.type] || '📅';
                    const label = TYPE_LABELS[event.type] || String(event.type).toUpperCase();
                    let desc = `${DIVIDER}\n📅  ${dateStr}　　🕐  ${String(event.time)}\n${DIVIDER}\n📝  ${notes}\n${DIVIDER}`;
                    const embed = new EmbedBuilder().setColor(color).setAuthor({ name: `${emoji} ${label} — NOTES UPDATED` }).setDescription(desc).setFooter({ text: `v3xys 💪  ·  ID: ${event.id}`, iconURL: LOGO }).setTimestamp();

                    const ch = interaction.guild.channels.cache.find(c => c.name === 'schedule');
                    if (ch) { const s = await ch.send({ embeds: [embed] }); setTimeout(() => s.delete().catch(() => {}), 30_000); }
                    await updateScheduleMessage(interaction.guild);
                    await interaction.followUp({ content: `✅ Notes updated for **${event.type}** on **${dateStr}**.`, ephemeral: true });
                } catch (err) { console.error(err); await interaction.followUp({ content: '❌ Something went wrong.', ephemeral: true }); }
            });
            collector.on('end', c => { if (c.size === 0) interaction.followUp({ content: '⏱️ Timed out.', ephemeral: true }); });
        } catch { await interaction.editReply({ content: '⏱️ Timed out.', components: [] }); }
    }
};
