const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { addAbsence, removeAbsenceById, getRoster, getAbsencesByTag, getAbsenceByTagAndDate } = require('../../utils/dbManager');
const { updateAbsenceMessage } = require('../../utils/managers/absenceManager');
const { DIVIDER, hasTeamPerms } = require('../../utils/constants');

function parseDate(str) {
    const [d, m, y] = str.split('/').map(Number);
    if (!d || !m || !y) return null;
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

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

function isValidDate(str) {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(str) && parseDate(str) !== null;
}

function dateToMs(str) {
    const [d, m, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d).getTime();
}

// Group absences into consecutive date ranges for the remove selector
function groupAbsencesIntoRanges(absences) {
    const sorted = [...absences].sort((a, b) => dateToMs(a.date) - dateToMs(b.date));
    const ranges = [];
    let i = 0;
    while (i < sorted.length) {
        let j = i + 1;
        while (j < sorted.length && dateToMs(sorted[j].date) - dateToMs(sorted[j - 1].date) === 86400000) j++;
        const group = sorted.slice(i, j);
        ranges.push({
            ids: group.map(a => a.id),
            start: group[0].date,
            end: group[group.length - 1].date,
            days: group.length,
            reason: group[0].reason
        });
        i = j;
    }
    return ranges;
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

            let dates = [];
            const rangeMatch = dateInput.match(/^(\d{2}\/\d{2}\/\d{4})-(\d{2}\/\d{2}\/\d{4})$/);
            if (rangeMatch) {
                if (!isValidDate(rangeMatch[1]) || !isValidDate(rangeMatch[2])) return interaction.reply({ content: '❌ Invalid date in range.', ephemeral: true });
                dates = getDateRange(rangeMatch[1], rangeMatch[2]);
                if (!dates) return interaction.reply({ content: '❌ End date must be after start date.', ephemeral: true });
                if (dates.length > 30) return interaction.reply({ content: '❌ Range too long. Maximum 30 days at once.', ephemeral: true });
            } else {
                if (!isValidDate(dateInput)) return interaction.reply({ content: '❌ Invalid date. Use **DD/MM/YYYY** or **DD/MM/YYYY-DD/MM/YYYY**', ephemeral: true });
                dates = [dateInput];
            }

            let ign = user.username;
            try { const roster = await getRoster(); const f = roster.find(p => p.discordTag === user.tag); if (f) ign = f.ign; } catch {}

            try {
                let added = 0, skipped = 0;
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

                const ranges = groupAbsencesIntoRanges(absences);

                // Single range with 1 day — remove directly
                if (ranges.length === 1 && ranges[0].days === 1) {
                    await removeAbsenceById(ranges[0].ids[0]);
                    await updateAbsenceMessage(interaction.guild, false);
                    let desc = `${DIVIDER}\n👤  \`${user.tag}\`'s absence on **${ranges[0].start}** removed.\n${DIVIDER}`;
                    const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'ABSENCE REMOVED' }).setDescription(desc).setFooter({ text: `Removed by ${interaction.user.tag}` }).setTimestamp();
                    const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                    setTimeout(() => sent.delete().catch(() => {}), 30_000);
                    return;
                }

                // Build select menu with ranges
                const options = [
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`Remove ALL absences (${absences.length} day${absences.length !== 1 ? 's' : ''})`)
                        .setValue('__all__')
                        .setEmoji('🗑️'),
                    ...ranges.slice(0, 24).map((r, idx) => {
                        const label = r.days === 1
                            ? `${r.start} — ${r.reason !== 'N/A' ? r.reason : 'No reason'}`
                            : `${r.start} → ${r.end} (${r.days} days) — ${r.reason !== 'N/A' ? r.reason : 'No reason'}`;
                        return new StringSelectMenuOptionBuilder()
                            .setLabel(label.slice(0, 100))
                            .setValue(String(idx));
                    })
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
                        const selectedRange = ranges[Number(c.values[0])];
                        for (const id of selectedRange.ids) await removeAbsenceById(id);
                        await updateAbsenceMessage(interaction.guild, false);
                        const rangeLabel = selectedRange.days === 1
                            ? `**${selectedRange.start}**`
                            : `**${selectedRange.start} → ${selectedRange.end}**`;
                        await c.update({ content: `✅ Absence${selectedRange.days > 1 ? 's' : ''} for ${rangeLabel} removed for **${user.tag}**.`, components: [] });
                    }
                } catch { await interaction.editReply({ content: '⏱️ Timed out.', components: [] }); }

            } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }
    }
};
