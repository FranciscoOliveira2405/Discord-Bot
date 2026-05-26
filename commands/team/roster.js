const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRoster, addPlayer, updatePlayer, removePlayer } = require('../../utils/excelManager');
const { LOGO, DIVIDER, ROLE_EMOJIS, ALL_ROLES, STATUS_INDICATORS, hasPerms } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roster')
        .setDescription('Manage the v3xys roster')
        .addSubcommand(sub => sub.setName('view').setDescription('View the current roster'))
        .addSubcommand(sub => sub.setName('add').setDescription('Add a player')
            .addUserOption(o => o.setName('player').setDescription('Discord user').setRequired(true))
            .addStringOption(o => o.setName('ign').setDescription('In-game name').setRequired(true))
            .addStringOption(o => o.setName('t-role').setDescription('T Side role').setRequired(true).addChoices(...ALL_ROLES))
            .addStringOption(o => o.setName('ct-role').setDescription('CT Side role').setRequired(true).addChoices(...ALL_ROLES)))
        .addSubcommand(sub => sub.setName('update').setDescription('Update a player')
            .addUserOption(o => o.setName('player').setDescription('Discord user').setRequired(true))
            .addStringOption(o => o.setName('t-role').setDescription('New T Side role').setRequired(false).addChoices(...ALL_ROLES))
            .addStringOption(o => o.setName('ct-role').setDescription('New CT Side role').setRequired(false).addChoices(...ALL_ROLES))
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
                if (!roster || roster.length === 0) return interaction.reply({ content: '📭 Roster is empty. Use `/roster add`.', ephemeral: true });

                const active = roster.filter(p => p.status === 'Active').length;
                const inactive = roster.filter(p => p.status === 'Inactive').length;
                const subs = roster.filter(p => p.status === 'Substitute').length;

                const rows = roster.map(p => {
                    const tEmoji = ROLE_EMOJIS[p.tRole] || '🎮';
                    const ctEmoji = ROLE_EMOJIS[p.ctRole] || '🎮';
                    const status = STATUS_INDICATORS[p.status] || '⚪ Unknown';
                    return `**${p.ign}**\nT: ${tEmoji}  ${p.tRole}\nCT: ${ctEmoji}  ${p.ctRole}\n${status}  ·  \`${p.discordTag}\``;
                });

                let desc = `🟢 ${active} Active　🔴 ${inactive} Inactive　🟡 ${subs} Substitute\n${DIVIDER}\n`;
                desc += rows.join(`\n${DIVIDER}\n`) + `\n${DIVIDER}`;

                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'v3xys — Roster', iconURL: LOGO }).setDescription(desc).setFooter({ text: `v3xys 💪  ·  ${roster.length} player${roster.length !== 1 ? 's' : ''}`, iconURL: LOGO }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); return interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }

        if (sub === 'add') {
            const player = interaction.options.getUser('player');
            const ign = interaction.options.getString('ign');
            const tRole = interaction.options.getString('t-role');
            const ctRole = interaction.options.getString('ct-role');
            try {
                await addPlayer(player.tag, ign, tRole, ctRole);
                const tEmoji = ROLE_EMOJIS[tRole] || '🎮';
                const ctEmoji = ROLE_EMOJIS[ctRole] || '🎮';
                let desc = `${DIVIDER}\n👤  **${ign}**  ·  \`${player.tag}\`\nT: ${tEmoji}  ${tRole}\nCT: ${ctEmoji}  ${ctRole}\n🟢 Active\n${DIVIDER}`;
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'ROSTER — PLAYER ADDED', iconURL: LOGO }).setDescription(desc).setFooter({ text: 'v3xys 💪', iconURL: LOGO }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); return interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }

        if (sub === 'update') {
            const player = interaction.options.getUser('player');
            const tRole = interaction.options.getString('t-role');
            const ctRole = interaction.options.getString('ct-role');
            const status = interaction.options.getString('status');
            if (!tRole && !ctRole && !status) return interaction.reply({ content: '❌ Provide at least one field to update.', ephemeral: true });
            try {
                const updated = await updatePlayer(player.tag, tRole, ctRole, status);
                if (!updated) return interaction.reply({ content: `❌ **${player.tag}** not found.`, ephemeral: true });
                let desc = `${DIVIDER}\n👤  \`${player.tag}\`\n`;
                if (tRole) desc += `T: ${ROLE_EMOJIS[tRole] || '🎮'}  ${tRole}\n`;
                if (ctRole) desc += `CT: ${ROLE_EMOJIS[ctRole] || '🎮'}  ${ctRole}\n`;
                if (status) desc += `${STATUS_INDICATORS[status] || status}\n`;
                desc += DIVIDER;
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'ROSTER — PLAYER UPDATED', iconURL: LOGO }).setDescription(desc).setFooter({ text: 'v3xys 💪', iconURL: LOGO }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); return interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }

        if (sub === 'remove') {
            const player = interaction.options.getUser('player');
            try {
                const removed = await removePlayer(player.tag);
                if (!removed) return interaction.reply({ content: `❌ **${player.tag}** not found.`, ephemeral: true });
                let desc = `${DIVIDER}\n👤  \`${player.tag}\` has been removed.\n${DIVIDER}`;
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'ROSTER — PLAYER REMOVED', iconURL: LOGO }).setDescription(desc).setFooter({ text: 'v3xys 💪', iconURL: LOGO }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); return interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }
    }
};
