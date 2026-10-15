const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addTimezone, removeTimezone, getTimezones } = require('../../utils/dbManager');
const { BASE_LABEL, currentBaseGmt, resolveZone } = require('../../utils/managers/timezoneManager');
const { DIVIDER, NO_PERMS_MANAGER, hasPerms } = require('../../utils/constants');
const { updateScheduleMessage } = require('../../utils/managers/scheduleManager');
const { ephemeral, safeReply, replyThenDelete } = require('../../utils/reply');

const embed = (title, description, footer) =>
    new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: title })
        .setDescription(`${DIVIDER}\n${description}\n${DIVIDER}`)
        .setFooter({ text: footer })
        .setTimestamp();

const baseLine = () => `📌  Base: **${BASE_LABEL}**  ·  \`${currentBaseGmt()}\` *(Europe/Lisbon)*`;

async function addZone(interaction) {
    const label = interaction.options.getString('label').trim();
    const zone = resolveZone(interaction.options.getString('offset'));
    if (!zone) {
        return safeReply(
            interaction,
            ephemeral('❌ Invalid time zone. Use `GMT+2`, `GMT-3`, `GMT+5:30` or a name like `Europe/Berlin`.'),
        );
    }
    if (!addTimezone(label, zone.id)) return safeReply(interaction, ephemeral(`⚠️ **${zone.id}** already exists.`));

    await updateScheduleMessage(interaction.guild);
    const description = `🏷️  **${label}**  ·  \`${zone.id}\`\n${DIVIDER}\n${baseLine()}`;
    await replyThenDelete(interaction, {
        embeds: [embed('TIMEZONE ADDED', description, `Added by ${interaction.user.tag}`)],
    });
}

async function removeZone(interaction) {
    const label = interaction.options.getString('label').trim();
    const found = getTimezones().find((t) => t.label.toLowerCase() === label.toLowerCase());
    if (!found) return safeReply(interaction, ephemeral(`❌ **${label}** not found.`));

    removeTimezone(found.tz);
    await updateScheduleMessage(interaction.guild);
    await replyThenDelete(interaction, {
        embeds: [
            embed(
                'TIMEZONE REMOVED',
                `🏷️  **${found.label}**  ·  \`${found.tz}\` removed.`,
                `Removed by ${interaction.user.tag}`,
            ),
        ],
    });
}

async function viewZones(interaction) {
    const zones = getTimezones();
    let description = `📌  **${BASE_LABEL}**  ·  \`${currentBaseGmt()}\`  *(base)*\n${DIVIDER}\n`;
    description +=
        zones.length > 0
            ? zones.map((t) => `🌍  **${t.label}**  ·  \`${t.tz}\``).join('\n')
            : '> No extra timezones. Use `/timezone add`.';
    const total = zones.length + 1;
    await replyThenDelete(interaction, {
        embeds: [embed('Active Timezones', description, `${total} timezone${total !== 1 ? 's' : ''} configured`)],
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timezone')
        .setDescription('Manage timezones')
        .setDefaultMemberPermissions(0)
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Add a timezone')
                .addStringOption((o) =>
                    o.setName('label').setDescription('Name (e.g. Germany)').setRequired(true).setMaxLength(30),
                )
                .addStringOption((o) =>
                    o
                        .setName('offset')
                        .setDescription('GMT offset (e.g. GMT+2) or zone name (e.g. Europe/Berlin)')
                        .setRequired(true)
                        .setMaxLength(40),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('remove')
                .setDescription('Remove a timezone')
                .addStringOption((o) => o.setName('label').setDescription('Label to remove').setRequired(true)),
        )
        .addSubcommand((sub) => sub.setName('view').setDescription('View all timezones')),

    async execute(interaction) {
        if (!hasPerms(interaction)) return safeReply(interaction, ephemeral(NO_PERMS_MANAGER));
        const actions = { add: addZone, remove: removeZone, view: viewZones };
        await actions[interaction.options.getSubcommand()](interaction);
    },
};
