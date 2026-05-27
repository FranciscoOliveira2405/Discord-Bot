const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addAbsence, removeAbsence, getRoster } = require('../../utils/excelManager');
const { updateAbsenceMessage } = require('../../utils/managers/absenceManager');
const { DIVIDER, hasPerms } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('absent')
        .setDescription('Manage player absences')
        .addSubcommand(sub => sub.setName('add').setDescription('Mark a player absent')
            .addUserOption(o => o.setName('player').setDescription('Discord user').setRequired(true))
            .addStringOption(o => o.setName('date').setDescription('Date (DD-MM-YY)').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove an absence')
            .addUserOption(o => o.setName('player').setDescription('Discord user').setRequired(true))),

    async execute(interaction) {
        if (!hasPerms(interaction)) return interaction.reply({ content: '❌ You need **@OWNER** or **@MANAGERS** to use this.', ephemeral: true });
        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const user = interaction.options.getUser('player');
            const date = interaction.options.getString('date');
            const reason = interaction.options.getString('reason') || 'N/A';
            if (!/^\d{2}-\d{2}-\d{2}$/.test(date)) return interaction.reply({ content: '❌ Invalid date. Use **DD-MM-YY**', ephemeral: true });

            let ign = user.username;
            try { const roster = await getRoster(); const f = roster.find(p => p.discordTag === user.tag); if (f) ign = f.ign; } catch {}

            try {
                await addAbsence(user.tag, ign, reason, date);
                await updateAbsenceMessage(interaction.guild, true);
                let desc = `${DIVIDER}\n👤  **${ign}**  ·  \`${user.tag}\`\n📅  ${date}\n`;
                if (reason !== 'N/A') desc += `${DIVIDER}\n📝  ${reason}\n`;
                desc += DIVIDER;
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'ABSENCE RECORDED' }).setDescription(desc).setFooter({ text: `Added by ${interaction.user.tag}` }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }

        if (sub === 'remove') {
            const user = interaction.options.getUser('player');
            try {
                const removed = await removeAbsence(user.tag);
                if (!removed) return interaction.reply({ content: `❌ No absence found for **${user.tag}**.`, ephemeral: true });
                await updateAbsenceMessage(interaction.guild, false);
                let desc = `${DIVIDER}\n👤  \`${user.tag}\`'s absence removed.\n${DIVIDER}`;
                const embed = new EmbedBuilder().setColor(0xE74C3C).setAuthor({ name: 'ABSENCE REMOVED' }).setDescription(desc).setFooter({ text: `Removed by ${interaction.user.tag}` }).setTimestamp();
                const sent = await interaction.reply({ embeds: [embed], ephemeral: false, fetchReply: true });
                setTimeout(() => sent.delete().catch(() => {}), 30_000);
            } catch (err) { console.error(err); await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }); }
        }
    }
};
