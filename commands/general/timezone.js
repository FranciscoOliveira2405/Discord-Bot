const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addTimezone, removeTimezone, getTimezones } = require('../../utils/excelManager');
const { BASE_LABEL, BASE_OFFSET, parseOffset } = require('../../utils/managers/timezoneManager');
const { LOGO, DIVIDER, hasPerms } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder().setName('timezone').setDescription('Manage timezones')
        .addSubcommand(sub => sub.setName('add').setDescription('Add a timezone')
            .addStringOption(o => o.setName('label').setDescription('Name (e.g. Brazil)').setRequired(true))
            .addStringOption(o => o.setName('offset').setDescription('GMT offset (e.g. GMT-3)').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove a timezone')
            .addStringOption(o => o.setName('label').setDescription('Label to remove').setRequired(true)))
        .addSubcommand(sub => sub.setName('view').setDescription('View all timezones')),
    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const label = interaction.options.getString('label');
            const offsetStr = interaction.options.getString('offset').toUpperCase();
            if (parseOffset(offsetStr) === null) return interaction.reply({ content: `❌ Invalid offset. Use \`GMT+0\`, \`GMT-3\` etc.`, ephemeral: true });
            try {
                const added = await addTimezone(label, offsetStr);
                if (!added) return interaction.reply({ content: `⚠️ **${offsetStr}** already exists.`, ephemeral: true });
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'TIMEZONES — ADDED', iconURL: LOGO }).setDescription(`${DIVIDER}\n🏷️  **${label}**  ·  \`${offsetStr}\`\n${DIVIDER}\n📌  Base: **${BASE_LABEL}**  ·  \`GMT+${BASE_OFFSET}\`\n${DIVIDER}`).setFooter({ text: 'v3xys 💪', iconURL: LOGO }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }

        if (sub === 'remove') {
            const label = interaction.options.getString('label');
            try {
                const tzs = await getTimezones();
                const found = tzs.find(t => t.label.toLowerCase() === label.toLowerCase());
                if (!found) return interaction.reply({ content: `❌ **${label}** not found.`, ephemeral: true });
                await removeTimezone(found.tz);
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'TIMEZONES — REMOVED', iconURL: LOGO }).setDescription(`${DIVIDER}\n🏷️  **${found.label}**  ·  \`${found.tz}\` removed.\n${DIVIDER}`).setFooter({ text: `Base: ${BASE_LABEL} GMT+${BASE_OFFSET}  ·  v3xys 💪`, iconURL: LOGO }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }

        if (sub === 'view') {
            try {
                const tzs = await getTimezones();
                let desc = `${DIVIDER}\n📌  **${BASE_LABEL}**  ·  \`GMT+${BASE_OFFSET}\`  *(base)*\n`;
                if (tzs && tzs.length > 0) { desc += `${DIVIDER}\n` + tzs.map(t => `🌍  **${t.label}**  ·  \`${t.tz}\``).join('\n') + '\n'; }
                else { desc += `${DIVIDER}\n> No extra timezones. Use \`/timezone add\`.\n`; }
                desc += DIVIDER;
                const total = (tzs?.length || 0) + 1;
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'v3xys — Active Timezones', iconURL: LOGO }).setDescription(desc).setFooter({ text: `${total} timezone${total !== 1 ? 's' : ''}  ·  v3xys 💪`, iconURL: LOGO }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }
    }
};
