const {
    SlashCommandBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ComponentType,
} = require('discord.js');
const {
    addAbsences,
    removeAbsenceById,
    removeAbsencesByIds,
    getPlayer,
    getAbsencesFor,
} = require('../../utils/dbManager');
const { updateAbsenceMessage } = require('../../utils/managers/absenceManager');
const { DIVIDER, NO_PERMS_TEAM, hasTeamPerms } = require('../../utils/constants');
const { isValidDate, getDateRange } = require('../../utils/time');
const { groupIntoRanges } = require('../../utils/ranges');
const { EPHEMERAL, ephemeral, safeReply, replyThenDelete, isTimeout } = require('../../utils/reply');

const MAX_RANGE_DAYS = 30;
const RANGE_PATTERN = /^(\d{2}\/\d{2}\/\d{4})-(\d{2}\/\d{2}\/\d{4})$/;

const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`;

const absenceEmbed = (title, description, footer) =>
    new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: title })
        .setDescription(`${DIVIDER}\n${description}${DIVIDER}`)
        .setFooter({ text: footer })
        .setTimestamp();

async function addAbsence(interaction) {
    const user = interaction.options.getUser('player');
    const dateInput = interaction.options.getString('date').trim();
    const reason = interaction.options.getString('reason') || 'N/A';

    let dates;
    const range = RANGE_PATTERN.exec(dateInput);
    if (range) {
        if (!isValidDate(range[1]) || !isValidDate(range[2])) {
            return safeReply(interaction, ephemeral('❌ Invalid date in range.'));
        }
        dates = getDateRange(range[1], range[2]);
        if (!dates) return safeReply(interaction, ephemeral('❌ End date must be after start date.'));
        if (dates.length > MAX_RANGE_DAYS) {
            return safeReply(interaction, ephemeral(`❌ Range too long. Maximum ${MAX_RANGE_DAYS} days at once.`));
        }
    } else {
        if (!isValidDate(dateInput)) {
            return safeReply(
                interaction,
                ephemeral('❌ Invalid date. Use **DD/MM/YYYY** or **DD/MM/YYYY-DD/MM/YYYY**'),
            );
        }
        dates = [dateInput];
    }

    const ign = getPlayer(user.id, user.tag)?.ign ?? user.username;
    const { added, skipped } = addAbsences(user.id, user.tag, ign, reason, dates);
    if (added === 0) {
        return safeReply(interaction, ephemeral(`⚠️ **${user.tag}** is already marked absent for all selected dates.`));
    }
    await updateAbsenceMessage(interaction.guild, true);

    let description = `👤  **${ign}**  ·  \`${user.tag}\`\n`;
    description +=
        dates.length > 1
            ? `📅  ${dates[0]}  →  ${dates[dates.length - 1]}  (${plural(added, 'day')})\n`
            : `📅  ${dates[0]}\n`;
    if (reason !== 'N/A') description += `${DIVIDER}\n📝  ${reason}\n`;
    if (skipped > 0) description += `${DIVIDER}\n⚠️  ${plural(skipped, 'date')} already existed and were skipped.\n`;

    await replyThenDelete(interaction, {
        embeds: [absenceEmbed('ABSENCE RECORDED', description, `Added by ${interaction.user.tag}`)],
    });
}

async function removeAbsence(interaction) {
    const user = interaction.options.getUser('player');
    const absences = getAbsencesFor(user.id, user.tag);
    if (absences.length === 0) return safeReply(interaction, ephemeral(`❌ No absence found for **${user.tag}**.`));

    const ranges = groupIntoRanges(absences);

    // A single one day absence is removed right away
    if (ranges.length === 1 && ranges[0].days === 1) {
        removeAbsenceById(ranges[0].ids[0]);
        await updateAbsenceMessage(interaction.guild, false);
        const description = `👤  \`${user.tag}\`'s absence on **${ranges[0].start}** removed.\n`;
        return replyThenDelete(interaction, {
            embeds: [absenceEmbed('ABSENCE REMOVED', description, `Removed by ${interaction.user.tag}`)],
        });
    }

    const reasonOf = (range) => (range.reason !== 'N/A' ? range.reason : 'No reason');
    const options = [
        new StringSelectMenuOptionBuilder()
            .setLabel(`Remove ALL absences (${plural(absences.length, 'day')})`)
            .setValue('__all__')
            .setEmoji('🗑️'),
        // Discord allows 25 options, one is used above
        ...ranges.slice(0, 24).map((range, index) => {
            const label =
                range.days === 1
                    ? `${range.start} — ${reasonOf(range)}`
                    : `${range.start} → ${range.end} (${range.days} days) — ${reasonOf(range)}`;
            return new StringSelectMenuOptionBuilder().setLabel(label.slice(0, 100)).setValue(String(index));
        }),
    ];
    const message = await interaction.reply({
        content: `🗑️ **${user.tag}** has multiple absences. Select which one to remove:`,
        components: [
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('absent_remove')
                    .setPlaceholder('Select absence to remove...')
                    .addOptions(options),
            ),
        ],
        flags: EPHEMERAL,
    });

    let selection;
    try {
        selection = await message.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 });
    } catch (err) {
        if (!isTimeout(err)) throw err;
        return interaction.editReply({ content: '⏱️ Timed out.', components: [] });
    }

    if (selection.values[0] === '__all__') {
        removeAbsencesByIds(absences.map((absence) => absence.id));
        await updateAbsenceMessage(interaction.guild, false);
        return selection.update({ content: `✅ All absences removed for **${user.tag}**.`, components: [] });
    }

    const chosen = ranges[Number(selection.values[0])];
    removeAbsencesByIds(chosen.ids);
    await updateAbsenceMessage(interaction.guild, false);
    const label = chosen.days === 1 ? `**${chosen.start}**` : `**${chosen.start} → ${chosen.end}**`;
    await selection.update({
        content: `✅ Absence${chosen.days > 1 ? 's' : ''} for ${label} removed for **${user.tag}**.`,
        components: [],
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('absent')
        .setDescription('Manage player absences')
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Mark a player absent')
                .addUserOption((o) => o.setName('player').setDescription('Discord user').setRequired(true))
                .addStringOption((o) =>
                    o
                        .setName('date')
                        .setDescription('Single date (DD/MM/YYYY) or range (DD/MM/YYYY-DD/MM/YYYY)')
                        .setRequired(true),
                )
                .addStringOption((o) =>
                    o.setName('reason').setDescription('Reason').setRequired(false).setMaxLength(200),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Remove an absence')
                .addUserOption((o) => o.setName('player').setDescription('Discord user').setRequired(true)),
        ),

    async execute(interaction) {
        if (!hasTeamPerms(interaction)) return safeReply(interaction, ephemeral(NO_PERMS_TEAM));
        const sub = interaction.options.getSubcommand();
        await (sub === 'add' ? addAbsence : removeAbsence)(interaction);
    },
};
