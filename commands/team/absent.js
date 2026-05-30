const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { addAbsence, removeAbsenceById, getRoster, getAbsencesByTag, getAbsenceByTagAndDate } = require('../../utils/dbManager');
const { updateAbsenceMessage } = require('../../utils/managers/absenceManager');
const { DIVIDER, hasTeamPerms } = require('../../utils/constants');

// Parse DD/MM/YYYY string into a Date object
function parseDate(str) {
    const [d, m, y] = str.split('/').map(Number);
    if (!d || !m || !y) return null;
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return null;
    return date;
}

// Format a Date object back to DD/MM/YYYY
function formatDate(date) {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

// Returns array of DD/MM/YYYY strings for a range (inclusive)
function getDateRange(startStr, endStr) {
    const start = parseDate(startStr);
    const end = parseDate(endStr);
    if (!start || !end || start > end) return null;
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
        dates.push(formatDate(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// Validate DD/MM/YYYY format
function isValidDate(str) {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(str) && parseDate(str) !== null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('absent')
        .setDescription('Manage player absences')
        .addSubcommand(sub => sub.setName('add').setDescription('Mark a player absent')
            .addUserOption(o => o.setName('player').setDescription('Discord user').setRequired(true))
            .addStringOption(o => o.setName('date').setDescription('Single date (DD/MM/YYYY) or range (DD/MM/YYYY-DD/MM/YYYY)').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove an absence')
            .addUserOption(o => o.setName('player').setDescription('Discord user').setRequired(true))),

    async execute(interaction) {
        if (!hasTeamPerms(interaction)) return interaction.reply({ content: '❌ You need **@TEAM**, **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const user = interaction.options.getUser('player');
            const dateInput = interaction.options.getString('date').trim();
            const reason = interaction.options.getString('reason') || 'N/A';

            // Detect range vs single date
            let dates = [];
            if (dateInput.includes('-') && dateInput.length > 10) {
                // Range: DD/MM/YYYY-DD/MM/YYYY
                const parts = dateInput.split('-');
                // Handle format like DD/MM/YYYY-DD/MM/YYYY (split on the dash between dates)
                // e.g. "01/06/2026-05/06/2026" → parts = ["01/06/2026", "05/06/2026"]
                const startStr = parts.slice(0, 3).join('-').replace(/\//g, '/');
                const endStr = parts.slice(3).join('-').replace(/\//g, '/');

                // Actually split on the dash that separates two DD/MM/YYYY dates
                const match = dateInput.match(/^(\d{2}\/\d{2}\/\d{4})-(\d{2}\/\d{2}\/\d{4})$/);
                if (!match) return interaction.reply({ content: '❌ Invalid format. Use **DD/MM/YYYY** or **DD/MM/YYYY-DD/MM/YYYY** (e.g. `01/06/2026-05/06/2026`)', ephemeral: true });

                const rangeStart = match[1];
                const rangeEnd = match[2];

                if (!isValidDate(rangeStart) || !isValidDate(rangeEnd)) return interaction.reply({ content: '❌ Invalid date in range.', ephemeral: true });

                dates = getDateRange(rangeStart, rangeEnd);
                if (!dates) return interaction.reply({ content: '❌ End date must be after start date.', ephemeral: true });
                if (dates.length > 30) return interaction.reply({ content: '❌ Range too long. Maximum 30 days at once.', ephemeral: true });
            } else {
                // Single date
                if (!isValidDate(dateInput)) return interaction.reply({ content: '❌ Invalid date. Use **DD/MM/YYYY** (e.g. `27/05/2026`)', ephemeral: true });
                dates = [dateInput];
            }

            let ign = user.username;
            try { const roster = await getRoster(); const f = roster.find(p => p.discordTag === user.tag); if (f) ign = f.ign; } catch {}

            try {
                let added = 0;
                let skipped = 0;
                for (const date of dates) {
                    const existing = await getAbsenceByTagAndDate(user.tag, date);
                    if (existing) { skipped++; continue; }
                    await addAbsence(user.tag, ign, reason, date);
                    added++;
                }

                if (added === 0) return interaction.reply({ content: `⚠️ **${user.tag}** is already marked absent for all selected dates.`, ephemeral: true });

                await updateAbsenceMessage(interaction.guild, true);

                const isRange = dates.length > 1;
                let desc = `${DIVIDER}\n👤  **${ign}**  ·  \`${user.tag}\`\n`;
                if (isRange) {
                    desc += `📅  ${dates[0]}  →  ${dates[dates.length - 1]}  (${added} day${added !== 1 ? 's' : ''})\n`;
                } else {
                    desc += `📅  ${dates[0]}\n`;
                }
                if (reason !== 'N/A') desc += `${DIVIDER}\n📝  ${reason}\n`;
                if (skipped > 0) desc += `${DIVIDER}\n⚠️  ${skipped} date${skipped !== 1 ? 's' : ''} already existed and were skipped.\n`;
                desc += DIVIDER;

                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'ABSENCE RECORDED' }).setDescription(desc).setFooter({ text: `Added by ${interaction.user.tag}` }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }

        if (sub === 'remove') {
            const user = interaction.options.getUser('player');
            try {
                const absences = await getAbsencesByTag(user.tag);
                if (!absences || absences.length === 0) return interaction.reply({ content: `❌ No absence found for **${user.tag}**.`, ephemeral: true });

                // Single absence — remove directly
                if (absences.length === 1) {
                    await removeAbsenceById(absences[0].id);
                    await updateAbsenceMessage(interaction.guild, false);
                    let desc = `${DIVIDER}\n👤  \`${user.tag}\`'s absence on **${absences[0].date}** removed.\n${DIVIDER}`;
                    const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'ABSENCE REMOVED' }).setDescription(desc).setFooter({ text: `Removed by ${interaction.user.tag}` }).setTimestamp();
                    const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                    setTimeout(() => sent.delete().catch(() => {}), 30_000);
                    return;
                }

                // Multiple absences — show selector including "Remove all" option
                const options = [
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`Remove ALL absences (${absences.length} dates)`)
                        .setValue('__all__')
                        .setEmoji('🗑️'),
                    ...absences.slice(0, 24).map(a =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`${a.date} — ${a.reason !== 'N/A' ? a.reason : 'No reason'}`.slice(0, 100))
                            .setValue(String(a.id))
                    )
                ];
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('absent_remove').setPlaceholder('Select absence to remove...').addOptions(options)
                );
                const reply = await interaction.reply({ content: `🗑️ **${user.tag}** has multiple absences. Select which one to remove:`, components: [row], ephemeral: true });
                try {
                    const c = await reply.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 });
                    if (c.values[0] === '__all__') {
                        for (const a of absences) await removeAbsenceById(a.id);
                        await updateAbsenceMessage(interaction.guild, false);
                        await c.update({ content: `✅ All absences removed for **${user.tag}**.`, components: [] });
                    } else {
                        const selected = absences.find(a => String(a.id) === c.values[0]);
                        await removeAbsenceById(Number(c.values[0]));
                        await updateAbsenceMessage(interaction.guild, false);
                        await c.update({ content: `✅ Absence on **${selected?.date}** removed for **${user.tag}**.`, components: [] });
                    }
                } catch { await interaction.editReply({ content: '⏱️ Timed out.', components: [] }); }

            } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }
    }
};
