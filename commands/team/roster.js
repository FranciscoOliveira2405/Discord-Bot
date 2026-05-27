const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { getRoster, addPlayer, updatePlayer, removePlayer } = require('../../utils/excelManager');
const { DIVIDER, ROLE_EMOJIS, ALL_ROLES, STATUS_INDICATORS, hasPerms } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roster').setDescription('Manage the v3xys roster')
        .addSubcommand(sub => sub.setName('view').setDescription('View the current roster'))
        .addSubcommand(sub => sub.setName('add').setDescription('Add a player')
            .addUserOption(o => o.setName('player').setDescription('Discord user').setRequired(true))
            .addStringOption(o => o.setName('ign').setDescription('In-game name').setRequired(true)))
        .addSubcommand(sub => sub.setName('update').setDescription('Update a player')
            .addUserOption(o => o.setName('player').setDescription('Discord user').setRequired(true))
            .addStringOption(o => o.setName('status').setDescription('New status').setRequired(false)
                .addChoices({ name: 'Active', value: 'Active' }, { name: 'Inactive', value: 'Inactive' }, { name: 'Substitute', value: 'Substitute' })))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove a player')
            .addUserOption(o => o.setName('player').setDescription('Discord user').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub !== 'view' && !hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });

        if (sub === 'view') {
            try {
                const roster = await getRoster();
                if (!roster || roster.length === 0) return interaction.reply({ content: '📭 Roster is empty.', ephemeral: true });
                const active = roster.filter(p => p.status === 'Active').length;
                const inactive = roster.filter(p => p.status === 'Inactive').length;
                const subs = roster.filter(p => p.status === 'Substitute').length;
                const rows = roster.map(p => {
                    const rolesArr = p.roles ? String(p.roles).split(',').map(r => r.trim()) : [];
                    const roleStr = rolesArr.map(r => `${ROLE_EMOJIS[r] || '🎮'} ${r}`).join('  ·  ');
                    const status = STATUS_INDICATORS[p.status] || '⚪ Unknown';
                    return `**${p.ign}**\n${roleStr}\n${status}  ·  \`${p.discordTag}\``;
                });
                let desc = `🟢 ${active} Active　🔴 ${inactive} Inactive　🟡 ${subs} Substitute\n${DIVIDER}\n`;
                desc += rows.join(`\n${DIVIDER}\n`) + `\n${DIVIDER}`;
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'Roster' }).setDescription(desc).setFooter({ text: `${roster.length} player${roster.length !== 1 ? 's' : ''}` }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); return interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }

        if (sub === 'add') {
            const player = interaction.options.getUser('player');
            const ign = interaction.options.getString('ign');
            const options = ALL_ROLES.map(r => new StringSelectMenuOptionBuilder().setLabel(r.name).setValue(r.value).setEmoji(ROLE_EMOJIS[r.value] || '🎮'));
            const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('roster_add_roles').setPlaceholder('Select one or more roles...').setMinValues(1).setMaxValues(ALL_ROLES.length).addOptions(options));
            const reply = await interaction.reply({ content: `👤 **Select roles for ${ign}:**`, components: [row], ephemeral: true });
            try {
                const c = await reply.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 });
                const selectedRoles = c.values.join(', ');
                await addPlayer(player.tag, ign, selectedRoles);
                const roleStr = c.values.map(r => `${ROLE_EMOJIS[r] || '🎮'} ${r}`).join('  ·  ');
                let desc = `${DIVIDER}\n👤  **${ign}**  ·  \`${player.tag}\`\n${roleStr}\n🟢 Active\n${DIVIDER}`;
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'PLAYER ADDED' }).setDescription(desc).setFooter({ text: `Added by ${interaction.user.tag}` }).setTimestamp();
                await c.update({ embeds: [embed], components: [] });
                setTimeout(() => interaction.deleteReply().catch(() => {}), 30_000);
            } catch { await interaction.editReply({ content: '⏱️ Timed out.', components: [] }); }
        }

        if (sub === 'update') {
            const player = interaction.options.getUser('player');
            const status = interaction.options.getString('status');
            const options = ALL_ROLES.map(r => new StringSelectMenuOptionBuilder().setLabel(r.name).setValue(r.value).setEmoji(ROLE_EMOJIS[r.value] || '🎮'));
            const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('roster_update_roles').setPlaceholder('Select new roles (or dismiss)...').setMinValues(0).setMaxValues(ALL_ROLES.length).addOptions(options));
            const reply = await interaction.reply({ content: `👤 **Select new roles for ${player.tag}** (or dismiss to only update status):`, components: [row], ephemeral: true });
            try {
                const c = await reply.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 30_000 });
                const newRoles = c.values.length > 0 ? c.values.join(', ') : null;
                const updated = await updatePlayer(player.tag, newRoles, status);
                if (!updated) return c.update({ content: `❌ **${player.tag}** not found.`, components: [] });
                let desc = `${DIVIDER}\n👤  \`${player.tag}\`\n`;
                if (newRoles) desc += `${newRoles.split(', ').map(r => `${ROLE_EMOJIS[r] || '🎮'} ${r}`).join('  ·  ')}\n`;
                if (status) desc += `${STATUS_INDICATORS[status] || status}\n`;
                desc += DIVIDER;
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'PLAYER UPDATED' }).setDescription(desc).setFooter({ text: `Updated by ${interaction.user.tag}` }).setTimestamp();
                await c.update({ embeds: [embed], components: [] });
                setTimeout(() => interaction.deleteReply().catch(() => {}), 30_000);
            } catch {
                if (status) {
                    const updated = await updatePlayer(player.tag, null, status);
                    if (!updated) return interaction.editReply({ content: `❌ **${player.tag}** not found.`, components: [] });
                    let desc = `${DIVIDER}\n👤  \`${player.tag}\`\n${STATUS_INDICATORS[status] || status}\n${DIVIDER}`;
                    const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'PLAYER UPDATED' }).setDescription(desc).setFooter({ text: `Updated by ${interaction.user.tag}` }).setTimestamp();
                    await interaction.editReply({ embeds: [embed], components: [] });
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 30_000);
                } else { await interaction.editReply({ content: '⏱️ Timed out.', components: [] }); }
            }
        }

        if (sub === 'remove') {
            const player = interaction.options.getUser('player');
            try {
                const removed = await removePlayer(player.tag);
                if (!removed) return interaction.reply({ content: `❌ **${player.tag}** not found.`, ephemeral: true });
                let desc = `${DIVIDER}\n👤  \`${player.tag}\` has been removed.\n${DIVIDER}`;
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'PLAYER REMOVED' }).setDescription(desc).setFooter({ text: `Removed by ${interaction.user.tag}` }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); return interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }
    }
};
