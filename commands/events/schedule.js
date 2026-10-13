const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType, EmbedBuilder } = require('discord.js');
const { addSchedule, removeSchedule, getSchedules, updateScheduleNotes } = require('../../utils/dbManager');
const { buildTimezoneField, BASE_LABEL } = require('../../utils/managers/timezoneManager');
const { updateScheduleMessage } = require('../../utils/managers/scheduleManager');
const { DIVIDER, TYPE_COLORS, TYPE_EMOJIS, TYPE_LABELS, toUnixTimestamp, hasPerms, hasTeamPerms, normalizeDate } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('schedule')
        .setDescription('Manage events')
        .addStringOption(o => o.setName('action').setDescription('What do you want to do?').setRequired(true)
            .addChoices(
                { name: '📅 View schedule', value: 'view' },
                { name: '➕ Add event', value: 'add' },
                { name: '🗑️ Remove event', value: 'remove' },
                { name: '📝 Edit notes', value: 'notes' },
            ))
        .addStringOption(o => o.setName('type').setDescription('Type of event (required for add)').setRequired(false)
            .addChoices(
                { name: 'Practice', value: 'Practice' },
                { name: 'Official Match', value: 'Official Match' },
                { name: 'Scrimmage', value: 'Scrimmage' },
                { name: 'VOD Review', value: 'VOD Review' },
            ))
        .addStringOption(o => o.setName('date').setDescription('Date DD/MM/YYYY (required for add)').setRequired(false))
        .addStringOption(o => o.setName('time').setDescription('Time HH:MM Portugal time (required for add)').setRequired(false))
        .addStringOption(o => o.setName('opponent').setDescription('Opponent name').setRequired(false))
        .addStringOption(o => o.setName('notes').setDescription('Notes').setRequired(false)),

    async execute(interaction) {
        const action = interaction.options.getString('action');

        if (action === 'view') {
            if (!hasTeamPerms(interaction)) return interaction.reply({ content: '❌ You need **@TEAM**, **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        } else {
            if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        }

        if (action === 'view') {
            try {
                const schedules = await getSchedules();
                if (!schedules || schedules.length === 0) {
                    const s = await interaction.reply({ content: '📭 No events scheduled.', ephemeral: false, fetchReply: true });
                    setTimeout(() => s.delete().catch(() => {}), 30_000);
                    return;
                }
                const embeds = await Promise.all(schedules.slice(0, 10).map(async e => {
                    const color = TYPE_COLORS[e.type] || TYPE_COLORS.default;
                    const emoji = TYPE_EMOJIS[e.type] || '📅';
                    const label = TYPE_LABELS[e.type] || String(e.type).toUpperCase();
                    const isMatch = e.type === 'Official Match' || e.type === 'Scrimmage';
                    const dateStr = normalizeDate(e.date);
                    const timeStr = String(e.time);
                    const unix = toUnixTimestamp(dateStr, timeStr);
                    const ts = unix ? `<t:${unix}:R>` : '';
                    const tzField = await buildTimezoneField(timeStr);
                    const title = isMatch ? `You vs ${e.opponent && e.opponent !== 'N/A' ? e.opponent : 'TBD'}` : label;
                    let desc = `${DIVIDER}\n📅  ${dateStr}　　🕐  ${timeStr} ${BASE_LABEL}　　${ts ? `⏳  ${ts}` : ''}\n`;
                    if (isMatch && e.opponent && e.opponent !== 'N/A') desc += `🆚  ${e.opponent}\n`;
                    if (tzField) desc += `${DIVIDER}\n🌍  ${tzField.replace(/\n/g, '　·　')}\n`;
                    if (e.notes && e.notes !== 'N/A') desc += `${DIVIDER}\n📝  ${e.notes}\n`;
                    desc += DIVIDER;
                    return new EmbedBuilder().setColor(color).setAuthor({ name: `${emoji} ${label}` }).setTitle(title).setDescription(desc).setFooter({ text: `ID: ${e.id}` });
                }));
                const sent = await interaction.reply({ embeds, ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }

        if (action === 'add') {
            const type = interaction.options.getString('type');
            const date = interaction.options.getString('date');
            const time = interaction.options.getString('time');
            const opponent = interaction.options.getString('opponent') || null;
            const notes = interaction.options.getString('notes') || null;

            if (!type) return interaction.reply({ content: '❌ Please provide a **type**.', ephemeral: true });
            if (!date) return interaction.reply({ content: '❌ Please provide a **date** (DD/MM/YYYY).', ephemeral: true });
            if (!time) return interaction.reply({ content: '❌ Please provide a **time** (HH:MM).', ephemeral: true });
            if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return interaction.reply({ content: '❌ Invalid date. Use **DD/MM/YYYY** (e.g. `27/05/2026`)', ephemeral: true });
            if (!/^\d{2}:\d{2}$/.test(time)) return interaction.reply({ content: '❌ Invalid time. Use **HH:MM**', ephemeral: true });

            try {
                const id = await addSchedule(type, date, time, opponent || 'N/A', notes || 'N/A');
                const color = TYPE_COLORS[type] || TYPE_COLORS.default;
                const emoji = TYPE_EMOJIS[type] || '📅';
                const label = TYPE_LABELS[type] || type.toUpperCase();
                const unix = toUnixTimestamp(date, time);
                const ts = unix ? `<t:${unix}:R>` : '';
                const tzField = await buildTimezoneField(time);
                const isMatch = type === 'Official Match' || type === 'Scrimmage';
                const title = isMatch ? `You vs ${opponent || 'TBD'}` : label;
                let desc = `${DIVIDER}\n📅  ${date}　　🕐  ${time} ${BASE_LABEL}　　${ts ? `⏳  ${ts}` : ''}\n`;
                if (isMatch && opponent) desc += `🆚  ${opponent}\n`;
                if (tzField) desc += `${DIVIDER}\n🌍  ${tzField.replace(/\n/g, '　·　')}\n`;
                if (notes) desc += `${DIVIDER}\n📝  ${notes}\n`;
                desc += DIVIDER;
                const embed = new EmbedBuilder().setColor(color).setAuthor({ name: `${emoji} ${label}` }).setTitle(title).setDescription(desc).setFooter({ text: `ID: ${id}` }).setTimestamp();
                const scheduleChannel = interaction.guild.channels.cache.find(c => c.name === 'schedule');
                if (scheduleChannel) {
                    const teamRole = interaction.guild.roles.cache.find(r => r.name === 'TEAM');
                    const sent = await scheduleChannel.send({ content: teamRole ? `${teamRole}` : '', embeds: [embed] });
                    setTimeout(() => sent.delete().catch(() => {}), 30_000);
                }
                await updateScheduleMessage(interaction.guild);
                await interaction.reply({ content: `✅ Event **${type}** on **${date}** at **${time}** added! (ID: \`${id}\`)`, ephemeral: true });
            } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }

        if (action === 'remove') {
            const schedules = await getSchedules();
            if (!schedules || schedules.length === 0) return interaction.reply({ content: '📭 No events to remove.', ephemeral: true });
            const options = schedules.slice(0, 25).map(e => {
                const emoji = TYPE_EMOJIS[e.type] || '📅';
                const dateStr = normalizeDate(e.date);
                return new StringSelectMenuOptionBuilder().setLabel(`${e.type} — ${dateStr} at ${e.time}`.slice(0, 100)).setDescription(`ID: ${e.id}`.slice(0, 100)).setValue(String(e.id)).setEmoji(emoji);
            });
            const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('schedule_remove').setPlaceholder('Select event to remove...').addOptions(options));
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
                    const embed = new EmbedBuilder().setColor(color).setAuthor({ name: `${emoji} ${label} — REMOVED` }).setDescription(desc).setFooter({ text: `ID: ${event.id}` }).setTimestamp();
                    const sent = await ch.send({ embeds: [embed] }); setTimeout(() => sent.delete().catch(() => {}), 30_000);
                }
                await updateScheduleMessage(interaction.guild);
                await c.update({ content: `✅ **${event?.type}** on **${dateStr}** removed.`, components: [] });
            } catch { await interaction.editReply({ content: '⏱️ Timed out.', components: [] }); }
        }

        if (action === 'notes') {
            const schedules = await getSchedules();
            if (!schedules || schedules.length === 0) return interaction.reply({ content: '📭 No events to add notes to.', ephemeral: true });
            const options = schedules.slice(0, 25).map(e => {
                const emoji = TYPE_EMOJIS[e.type] || '📅';
                const currentNotes = e.notes && e.notes !== 'N/A' ? `Notes: ${String(e.notes).slice(0, 50)}` : 'No notes yet';
                return new StringSelectMenuOptionBuilder().setLabel(`${e.type} — ${normalizeDate(e.date)} at ${e.time}`.slice(0, 100)).setDescription(currentNotes.slice(0, 100)).setValue(String(e.id)).setEmoji(emoji);
            });
            const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('schedule_notes').setPlaceholder('Select event...').addOptions(options));
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
                        const embed = new EmbedBuilder().setColor(color).setAuthor({ name: `${emoji} ${label} — NOTES UPDATED` }).setDescription(desc).setFooter({ text: `ID: ${event.id}` }).setTimestamp();
                        const ch = interaction.guild.channels.cache.find(c => c.name === 'schedule');
                        if (ch) { const s = await ch.send({ embeds: [embed] }); setTimeout(() => s.delete().catch(() => {}), 30_000); }
                        await updateScheduleMessage(interaction.guild);
                        await interaction.followUp({ content: `✅ Notes updated for **${event.type}** on **${dateStr}**.`, ephemeral: true });
                    } catch (err) { console.error(err); await interaction.followUp({ content: '❌ Something went wrong.', ephemeral: true }); }
                });
                collector.on('end', c => { if (c.size === 0) interaction.followUp({ content: '⏱️ Timed out.', ephemeral: true }); });
            } catch { await interaction.editReply({ content: '⏱️ Timed out.', components: [] }); }
        }
    }
};
