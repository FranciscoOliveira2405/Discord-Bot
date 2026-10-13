const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType, EmbedBuilder } = require('discord.js');
const { getSchedules } = require('../../utils/dbManager');
const { DIVIDER, TYPE_COLORS, TYPE_EMOJIS, TYPE_LABELS, toUnixTimestamp, normalizeDate, hasPerms } = require('../../utils/constants');
const { BASE_LABEL, buildTimezoneField } = require('../../utils/managers/timezoneManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Manually send a reminder for an event')
        .setDefaultMemberPermissions(0),

    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        const schedules = await getSchedules();
        if (!schedules || schedules.length === 0) return interaction.reply({ content: '📭 No events scheduled.', ephemeral: true });

        const options = schedules.slice(0, 25).map(e => {
            const emoji = TYPE_EMOJIS[e.type] || '📅';
            const dateStr = normalizeDate(e.date);
            return new StringSelectMenuOptionBuilder()
                .setLabel(`${e.type} — ${dateStr} at ${e.time}`.slice(0, 100))
                .setDescription(`ID: ${e.id}`.slice(0, 100))
                .setValue(String(e.id))
                .setEmoji(emoji);
        });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('reminder_select').setPlaceholder('Select event to remind...').addOptions(options)
        );
        const reply = await interaction.reply({ content: '⚠️ **Select the event to send a reminder for:**', components: [row], ephemeral: true });

        try {
            const c = await reply.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 });
            const event = schedules.find(e => String(e.id) === c.values[0]);
            if (!event) return c.update({ content: '❌ Event not found.', components: [] });

            const color = TYPE_COLORS[event.type] || TYPE_COLORS.default;
            const emoji = TYPE_EMOJIS[event.type] || '📅';
            const label = TYPE_LABELS[event.type] || String(event.type).toUpperCase();
            const isMatch = event.type === 'Official Match' || event.type === 'Scrimmage';
            const dateStr = normalizeDate(event.date);
            const timeStr = String(event.time);
            const unix = toUnixTimestamp(dateStr, timeStr);
            const ts = unix ? `<t:${unix}:R>` : '';
            const tzField = await buildTimezoneField(timeStr);
            const title = isMatch ? `You vs ${event.opponent && event.opponent !== 'N/A' ? event.opponent : 'TBD'}` : label;

            let desc = `${DIVIDER}\n📅  ${dateStr}　　🕐  ${timeStr} ${BASE_LABEL}　　${ts ? `⏳  ${ts}` : ''}\n`;
            if (isMatch && event.opponent && event.opponent !== 'N/A') desc += `🆚  ${event.opponent}\n`;
            if (tzField) desc += `${DIVIDER}\n🌍  ${tzField.replace(/\n/g, '　·　')}\n`;
            if (event.notes && event.notes !== 'N/A') desc += `${DIVIDER}\n📝  ${event.notes}\n`;
            desc += DIVIDER;

            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: `⚠️ REMINDER  ·  ${emoji} ${label}` })
                .setTitle(title)
                .setDescription(desc)
                .setFooter({ text: `ID: ${event.id}` })
                .setTimestamp();

            const remindersChannel = interaction.guild.channels.cache.find(ch => ch.name === 'reminders');
            if (!remindersChannel) return c.update({ content: '❌ #reminders channel not found.', components: [] });

            const teamRole = interaction.guild.roles.cache.find(r => r.name === 'TEAM');
            // No auto-delete — message stays permanently so no ghost pings
            await remindersChannel.send({ content: teamRole ? `${teamRole}` : '', embeds: [embed] });
            await c.update({ content: `✅ Reminder sent for **${event.type}** on **${dateStr}**.`, components: [] });
        } catch { await interaction.editReply({ content: '⏱️ Timed out.', components: [] }); }
    }
};
