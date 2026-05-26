const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addSchedule } = require('../../utils/excelManager');
const { buildTimezoneField, BASE_LABEL, BASE_OFFSET } = require('../../utils/managers/timezoneManager');
const { LOGO, DIVIDER, TYPE_COLORS, TYPE_EMOJIS, TYPE_LABELS, toUnixTimestamp, hasPerms } = require('../../utils/constants');
const { updateScheduleMessage } = require('../../utils/managers/scheduleManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-event')
        .setDescription('Add a new event to the schedule')
        .addStringOption(o => o.setName('type').setDescription('Type of event').setRequired(true)
            .addChoices({ name: 'Practice', value: 'Practice' }, { name: 'Official Match', value: 'Official Match' }, { name: 'Scrimmage', value: 'Scrimmage' }, { name: 'VOD Review', value: 'VOD Review' }))
        .addStringOption(o => o.setName('date').setDescription('Date (DD-MM-YY)').setRequired(true))
        .addStringOption(o => o.setName('time').setDescription('Time in Portugal (e.g. 14:00)').setRequired(true))
        .addStringOption(o => o.setName('opponent').setDescription('Opponent name').setRequired(false))
        .addStringOption(o => o.setName('notes').setDescription('Additional notes').setRequired(false)),

    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });

        const type = interaction.options.getString('type');
        const date = interaction.options.getString('date');
        const time = interaction.options.getString('time');
        const opponent = interaction.options.getString('opponent') || null;
        const notes = interaction.options.getString('notes') || null;

        if (!/^\d{2}-\d{2}-\d{2}$/.test(date)) return interaction.reply({ content: '❌ Invalid date. Use **DD-MM-YY** (e.g. `27-05-26`)', ephemeral: true });
        if (!/^\d{2}:\d{2}$/.test(time)) return interaction.reply({ content: '❌ Invalid time. Use **HH:MM** (e.g. `14:00`)', ephemeral: true });

        try {
            const id = await addSchedule(type, date, time, opponent || 'N/A', notes || 'N/A');
            const color = TYPE_COLORS[type] || TYPE_COLORS.default;
            const emoji = TYPE_EMOJIS[type] || '📅';
            const label = TYPE_LABELS[type] || type.toUpperCase();
            const unix = toUnixTimestamp(date, time);
            const ts = unix ? `<t:${unix}:R>` : '';
            const tzField = await buildTimezoneField(time);
            const isMatch = type === 'Official Match' || type === 'Scrimmage';
            const title = isMatch ? `v3xys vs ${opponent || 'TBD'}` : label;

            let desc = `${DIVIDER}\n📅  ${date}　　🕐  ${time} ${BASE_LABEL}　　${ts ? `⏳  ${ts}` : ''}\n`;
            if (isMatch && opponent) desc += `🆚  ${opponent}\n`;
            if (tzField) desc += `${DIVIDER}\n🌍  ${tzField.replace(/\n/g, '　·　')}\n`;
            if (notes) desc += `${DIVIDER}\n📝  ${notes}\n`;
            desc += DIVIDER;

            const embed = new EmbedBuilder().setColor(color).setAuthor({ name: `${emoji} ${label}` }).setTitle(title).setDescription(desc).setFooter({ text: `v3xys 💪  ·  ID: ${id}`, iconURL: LOGO }).setTimestamp();

            const scheduleChannel = interaction.guild.channels.cache.find(c => c.name === 'schedule');
            if (scheduleChannel) {
                const teamRole = interaction.guild.roles.cache.find(r => r.name === 'team');
                const sent = await scheduleChannel.send({ content: teamRole ? `${teamRole}` : '', embeds: [embed] });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            }

            await updateScheduleMessage(interaction.guild);
            await interaction.reply({ content: `✅ Event **${type}** on **${date}** at **${time}** added! (ID: \`${id}\`)`, ephemeral: true });
        } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
    }
};
