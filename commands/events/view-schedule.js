const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getSchedules } = require('../../utils/excelManager');
const { LOGO, DIVIDER, TYPE_COLORS, TYPE_EMOJIS, TYPE_LABELS, toUnixTimestamp, normalizeDate } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder().setName('view-schedule').setDescription('View all upcoming events'),
    async execute(interaction) {
        try {
            const schedules = await getSchedules();
            if (!schedules || schedules.length === 0) { const s = await interaction.reply({ content: '📭 No events scheduled.', ephemeral: false, fetchReply: true }); setTimeout(() => s.delete().catch(() => {}), 30_000); return; }

            const header = new EmbedBuilder().setColor(TYPE_COLORS.default).setAuthor({ name: 'v3xys — Upcoming Schedule', iconURL: LOGO }).setDescription(`**${schedules.length}** event${schedules.length !== 1 ? 's' : ''} scheduled\n${DIVIDER}`).setTimestamp().setFooter({ text: 'v3xys 💪', iconURL: LOGO });

            const embeds = schedules.slice(0, 9).map(e => {
                const color = TYPE_COLORS[e.type] || TYPE_COLORS.default;
                const emoji = TYPE_EMOJIS[e.type] || '📅';
                const label = TYPE_LABELS[e.type] || String(e.type).toUpperCase();
                const isMatch = e.type === 'Official Match' || e.type === 'Scrimmage';
                const dateStr = normalizeDate(e.date);
                const unix = toUnixTimestamp(dateStr, String(e.time));
                const ts = unix ? `<t:${unix}:R>` : '';
                const title = isMatch ? `v3xys vs ${e.opponent && e.opponent !== 'N/A' ? e.opponent : 'TBD'}` : label;

                let desc = `${DIVIDER}\n📅  ${dateStr}　　🕐  ${String(e.time)}　　${ts ? `⏳  ${ts}` : ''}\n`;
                if (isMatch && e.opponent && e.opponent !== 'N/A') desc += `🆚  ${e.opponent}\n`;
                if (e.notes && e.notes !== 'N/A') desc += `${DIVIDER}\n📝  ${e.notes}\n`;
                desc += DIVIDER;
                return new EmbedBuilder().setColor(color).setAuthor({ name: `${emoji} ${label}` }).setTitle(title).setDescription(desc).setFooter({ text: `ID: ${e.id}`, iconURL: LOGO });
            });

            const sent = await interaction.reply({ embeds: [header, ...embeds], ephemeral: false, fetchReply: true });
            setTimeout(() => sent.delete().catch(() => {}), 30_000);
        } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
    }
};
