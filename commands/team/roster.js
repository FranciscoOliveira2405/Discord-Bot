const {
    SlashCommandBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ComponentType,
} = require('discord.js');
const { getRoster, addPlayer, updatePlayer, removePlayer } = require('../../utils/dbManager');
const {
    DIVIDER,
    ROLE_EMOJIS,
    ALL_ROLES,
    STATUS_INDICATORS,
    NO_PERMS_MANAGER,
    NO_PERMS_TEAM,
    hasPerms,
    hasTeamPerms,
} = require('../../utils/constants');
const { EPHEMERAL, ephemeral, safeReply, replyThenDelete, isTimeout } = require('../../utils/reply');

const STATUS_ORDER = { Main: 0, Subs: 1, Tryouts: 2, 'Stand-ins': 3 };

const roleLine = (roles) => roles.map((role) => `${ROLE_EMOJIS[role] || '🎮'} ${role}`).join('  ·  ');

const baseEmbed = (title, description, footer) =>
    new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: title })
        .setDescription(`${DIVIDER}\n${description}\n${DIVIDER}`)
        .setFooter({ text: footer })
        .setTimestamp();

function roleSelect(customId, placeholder, minValues) {
    const options = ALL_ROLES.map((role) =>
        new StringSelectMenuOptionBuilder()
            .setLabel(role.name)
            .setValue(role.value)
            .setEmoji(ROLE_EMOJIS[role.value] || '🎮'),
    );
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .setMinValues(minValues)
            .setMaxValues(ALL_ROLES.length)
            .addOptions(options),
    );
}

async function viewRoster(interaction) {
    const roster = getRoster();
    if (roster.length === 0) return safeReply(interaction, ephemeral('📭 Roster is empty.'));

    const sorted = [...roster].sort((a, b) => (STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4));
    const count = (status) => roster.filter((p) => p.status === status).length;
    const rows = sorted.map((player) => {
        const roles = player.roles
            ? String(player.roles)
                  .split(',')
                  .map((r) => r.trim())
            : [];
        const status = STATUS_INDICATORS[player.status] || '⚪ Unknown';
        return `**${player.ign}**\n${roleLine(roles)}\n${status}  ·  \`${player.discordTag}\``;
    });
    const summary = `🟢 ${count('Main')} Main　🟡 ${count('Subs')} Subs　🔵 ${count('Tryouts')} Tryouts　⚪ ${count('Stand-ins')} Stand-ins`;

    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: 'Roster' })
        .setDescription(`${summary}\n${DIVIDER}\n${rows.join(`\n${DIVIDER}\n`)}\n${DIVIDER}`)
        .setFooter({ text: `${roster.length} player${roster.length !== 1 ? 's' : ''}` })
        .setTimestamp();
    await replyThenDelete(interaction, { embeds: [embed] });
}

async function addToRoster(interaction) {
    const player = interaction.options.getUser('player');
    const ign = interaction.options.getString('ign');
    const status = interaction.options.getString('status') || 'Main';
    if (!player) return safeReply(interaction, ephemeral('❌ Please provide a **player**.'));
    if (!ign) return safeReply(interaction, ephemeral('❌ Please provide an **IGN**.'));

    const message = await interaction.reply({
        content: `👤 **Select roles for ${ign}:**`,
        components: [roleSelect('roster_add_roles', 'Select one or more roles...', 1)],
        flags: EPHEMERAL,
    });
    let selection;
    try {
        selection = await message.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 });
    } catch (err) {
        if (!isTimeout(err)) throw err;
        return interaction.editReply({ content: '⏱️ Timed out.', components: [] });
    }

    addPlayer(player.id, player.tag, ign, selection.values.join(', '), status);
    const description = `👤  **${ign}**  ·  \`${player.tag}\`\n${roleLine(selection.values)}\n${STATUS_INDICATORS[status] || status}`;
    await selection.update({
        embeds: [baseEmbed('PLAYER ADDED', description, `Added by ${interaction.user.tag}`)],
        content: '',
        components: [],
    });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 30_000).unref();
}

async function updateRoster(interaction) {
    const player = interaction.options.getUser('player');
    const status = interaction.options.getString('status');
    if (!player) return safeReply(interaction, ephemeral('❌ Please provide a **player**.'));

    const message = await interaction.reply({
        content: `👤 **Select new roles for ${player.tag}** (or dismiss to only update status):`,
        components: [roleSelect('roster_update_roles', 'Select new roles (or dismiss)...', 0)],
        flags: EPHEMERAL,
    });

    let selection = null;
    try {
        selection = await message.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 });
    } catch (err) {
        if (!isTimeout(err)) throw err;
        // Nobody picked roles: only the status is updated, if one was given
        if (!status) return interaction.editReply({ content: '⏱️ Timed out.', components: [] });
    }

    const newRoles = selection && selection.values.length > 0 ? selection.values.join(', ') : null;
    if (!updatePlayer(player.id, player.tag, newRoles, status)) {
        const notFound = { content: `❌ **${player.tag}** not found.`, components: [] };
        return selection ? selection.update(notFound) : interaction.editReply(notFound);
    }

    let description = `👤  \`${player.tag}\``;
    if (newRoles) description += `\n${roleLine(newRoles.split(', '))}`;
    if (status) description += `\n${STATUS_INDICATORS[status] || status}`;
    const reply = {
        embeds: [baseEmbed('PLAYER UPDATED', description, `Updated by ${interaction.user.tag}`)],
        content: '',
        components: [],
    };
    await (selection ? selection.update(reply) : interaction.editReply(reply));
    setTimeout(() => interaction.deleteReply().catch(() => {}), 30_000).unref();
}

async function removeFromRoster(interaction) {
    const player = interaction.options.getUser('player');
    if (!player) return safeReply(interaction, ephemeral('❌ Please provide a **player**.'));
    if (!removePlayer(player.id, player.tag)) {
        return safeReply(interaction, ephemeral(`❌ **${player.tag}** not found.`));
    }
    const embed = baseEmbed(
        'PLAYER REMOVED',
        `👤  \`${player.tag}\` has been removed.`,
        `Removed by ${interaction.user.tag}`,
    );
    await replyThenDelete(interaction, { embeds: [embed] });
}

const ACTIONS = { view: viewRoster, add: addToRoster, update: updateRoster, remove: removeFromRoster };

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roster')
        .setDescription('Manage the roster')
        .addStringOption((o) =>
            o
                .setName('action')
                .setDescription('What do you want to do?')
                .setRequired(true)
                .addChoices(
                    { name: '👥 View roster', value: 'view' },
                    { name: '➕ Add player', value: 'add' },
                    { name: '✏️ Update player', value: 'update' },
                    { name: '🗑️ Remove player', value: 'remove' },
                ),
        )
        .addUserOption((o) =>
            o.setName('player').setDescription('Discord user (required for add/update/remove)').setRequired(false),
        )
        .addStringOption((o) =>
            o.setName('ign').setDescription('In-game name (required for add)').setRequired(false).setMaxLength(32),
        )
        .addStringOption((o) =>
            o
                .setName('status')
                .setDescription('Player status')
                .setRequired(false)
                .addChoices(
                    { name: 'Main', value: 'Main' },
                    { name: 'Subs', value: 'Subs' },
                    { name: 'Tryouts', value: 'Tryouts' },
                    { name: 'Stand-ins', value: 'Stand-ins' },
                ),
        ),

    async execute(interaction) {
        const action = interaction.options.getString('action');
        if (action === 'view' ? !hasTeamPerms(interaction) : !hasPerms(interaction)) {
            return safeReply(interaction, ephemeral(action === 'view' ? NO_PERMS_TEAM : NO_PERMS_MANAGER));
        }
        await ACTIONS[action](interaction);
    },
};
