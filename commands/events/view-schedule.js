const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getSchedules } = require('../../utils/excelManager');
const { DIVIDER, TYPE_COLORS, TYPE_EMOJIS, TYPE_LABELS, toUnixTimestamp, normalizeDate } = require('../../utils/constants');
const { BASE_LABEL, buildTimezoneField } = require('../../utils/managers/timezoneManager');

module.exports = {
    data: new SlashCommandBuilder().setName('view-schedule').setDescription('View all upcoming events'),

    async execute(interaction) {
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
                const title = isMatch ? `v3xys vs ${e.opponent && e.opponent !== 'N/A' ? e.opponent : 'TBD'}` : label;

                let desc = `${DIVIDER}\n📅  ${dateStr}　　🕐  ${timeStr} ${BASE_LABEL}　　${ts ? `⏳  ${ts}` : ''}\n`;
                if (isMatch && e.opponent && e.opponent !== 'N/A') desc += `🆚  ${e.opponent}\n`;
                if (tzField) desc += `${DIVIDER}\n🌍  ${tzField.replace(/\n/g, '　·　')}\n`;
                if (e.notes && e.notes !== 'N/A') desc += `${DIVIDER}\n📝  ${e.notes}\n`;
                desc += DIVIDER;

                return new EmbedBuilder()
                    .setColor(color)
                    .setAuthor({ name: `${emoji} ${label}` })
                    .setTitle(title)
                    .setDescription(desc)
                    .setFooter({ text: `ID: ${e.id}` });
            }));

            const sent = await interaction.reply({ embeds, ephemeral: false, fetchReply: true });
            setTimeout(() => sent.delete().catch(() => {}), 30_000);

        } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
    }
};
