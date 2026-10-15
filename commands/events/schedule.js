const {
    SlashCommandBuilder,
    ComponentType,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const { addSchedule, removeSchedule, getSchedules, updateScheduleNotes } = require('../../utils/dbManager');
const { updateScheduleMessage } = require('../../utils/managers/scheduleManager');
const {
    CHANNELS,
    NO_PERMS_MANAGER,
    NO_PERMS_TEAM,
    hasPerms,
    hasTeamPerms,
    findChannel,
    teamMention,
    normalizeDate,
} = require('../../utils/constants');
const { isValidDate, isValidTime, lisbonToUnix, nowUnix } = require('../../utils/time');
const { buildEventEmbed, eventSelect } = require('../../utils/embeds');
const { EPHEMERAL, ephemeral, safeReply, deleteLater, replyThenDelete, isTimeout } = require('../../utils/reply');

// Posts a short-lived notice in #schedule
async function postNotice(guild, payload) {
    const channel = findChannel(guild, CHANNELS.schedule);
    if (channel) deleteLater(await channel.send(payload));
}

// Shows a select menu with every event and waits for the choice. Returns null if nobody answers.
async function pickEvent(interaction, { prompt, customId, placeholder, schedules, describe }) {
    const message = await interaction.reply({
        content: prompt,
        components: [eventSelect(customId, placeholder, schedules, describe)],
        flags: EPHEMERAL,
    });
    try {
        const selection = await message.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: 30_000,
        });
        return { selection, event: schedules.find((e) => String(e.id) === selection.values[0]) };
    } catch (err) {
        if (!isTimeout(err)) throw err;
        await interaction.editReply({ content: '⏱️ Timed out.', components: [] });
        return null;
    }
}

async function viewEvents(interaction) {
    const schedules = getSchedules();
    if (schedules.length === 0) return replyThenDelete(interaction, { content: '📭 No events scheduled.' });
    // Discord allows at most 10 embeds per message
    await replyThenDelete(interaction, { embeds: schedules.slice(0, 10).map((event) => buildEventEmbed(event)) });
}

async function addEvent(interaction) {
    const type = interaction.options.getString('type');
    const date = interaction.options.getString('date')?.trim();
    const time = interaction.options.getString('time')?.trim();
    const opponent = interaction.options.getString('opponent')?.trim() || null;
    const notes = interaction.options.getString('notes')?.trim() || null;

    if (!type) return safeReply(interaction, ephemeral('❌ Please provide a **type**.'));
    if (!date) return safeReply(interaction, ephemeral('❌ Please provide a **date** (DD/MM/YYYY).'));
    if (!time) return safeReply(interaction, ephemeral('❌ Please provide a **time** (HH:MM).'));
    if (!isValidDate(date)) {
        return safeReply(interaction, ephemeral('❌ Invalid date. Use **DD/MM/YYYY** (e.g. `27/05/2026`).'));
    }
    if (!isValidTime(time)) {
        return safeReply(interaction, ephemeral('❌ Invalid time. Use **HH:MM** on a 24 hour clock (e.g. `21:30`).'));
    }
    if (lisbonToUnix(date, time) <= nowUnix()) {
        return safeReply(interaction, ephemeral('❌ That date and time is already in the past.'));
    }

    const id = addSchedule(type, date, time, opponent, notes);
    const event = { id, type, date, time, opponent: opponent || 'N/A', notes: notes || 'N/A' };
    await postNotice(interaction.guild, {
        ...teamMention(interaction.guild),
        embeds: [buildEventEmbed(event, { timestamp: true })],
    });
    await updateScheduleMessage(interaction.guild);
    await safeReply(
        interaction,
        ephemeral(`✅ Event **${type}** on **${date}** at **${time}** added! (ID: \`${id}\`)`),
    );
}

async function removeEvent(interaction) {
    const schedules = getSchedules();
    if (schedules.length === 0) return safeReply(interaction, ephemeral('📭 No events to remove.'));

    const picked = await pickEvent(interaction, {
        prompt: '🗑️ **Select the event to remove:**',
        customId: 'schedule_remove',
        placeholder: 'Select event to remove...',
        schedules,
    });
    if (!picked) return;
    const { selection, event } = picked;

    if (!event || !removeSchedule(event.id))
        return selection.update({ content: '❌ Event not found.', components: [] });

    await postNotice(interaction.guild, {
        embeds: [buildEventEmbed(event, { authorSuffix: ' — REMOVED', showTimezones: false, timestamp: true })],
    });
    await updateScheduleMessage(interaction.guild);
    await selection.update({
        content: `✅ **${event.type}** on **${normalizeDate(event.date)}** removed.`,
        components: [],
    });
}

async function editNotes(interaction) {
    const schedules = getSchedules();
    if (schedules.length === 0) return safeReply(interaction, ephemeral('📭 No events to add notes to.'));

    const picked = await pickEvent(interaction, {
        prompt: '📝 **Select event to update notes:**',
        customId: 'schedule_notes',
        placeholder: 'Select event...',
        schedules,
        describe: (e) => (e.notes && e.notes !== 'N/A' ? `Notes: ${String(e.notes).slice(0, 50)}` : 'No notes yet'),
    });
    if (!picked) return;
    const { selection, event } = picked;
    if (!event) return selection.update({ content: '❌ Event not found.', components: [] });

    // A pop-up form: no need to read channel messages
    const hasNotes = event.notes && event.notes !== 'N/A';
    const modal = new ModalBuilder()
        .setCustomId(`schedule_notes_${event.id}`)
        .setTitle('Edit event notes')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('notes')
                    .setLabel(`${event.type} — ${normalizeDate(event.date)}`.slice(0, 45))
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(500)
                    .setRequired(false)
                    .setValue(hasNotes ? String(event.notes).slice(0, 500) : ''),
            ),
        );
    await selection.showModal(modal);

    let submitted;
    try {
        submitted = await selection.awaitModalSubmit({
            time: 120_000,
            filter: (i) => i.customId === modal.data.custom_id && i.user.id === interaction.user.id,
        });
    } catch (err) {
        if (!isTimeout(err)) throw err;
        return interaction.editReply({ content: '⏱️ Timed out.', components: [] });
    }

    const notes = submitted.fields.getTextInputValue('notes').trim() || 'N/A';
    if (!updateScheduleNotes(event.id, notes)) {
        return submitted.reply(ephemeral('❌ Event not found.'));
    }
    await postNotice(interaction.guild, {
        embeds: [
            buildEventEmbed(
                { ...event, notes },
                { authorSuffix: ' — NOTES UPDATED', showTimezones: false, timestamp: true },
            ),
        ],
    });
    await updateScheduleMessage(interaction.guild);
    await submitted.reply(ephemeral(`✅ Notes updated for **${event.type}** on **${normalizeDate(event.date)}**.`));
    await interaction.deleteReply().catch(() => {});
}

const ACTIONS = { view: viewEvents, add: addEvent, remove: removeEvent, notes: editNotes };

module.exports = {
    data: new SlashCommandBuilder()
        .setName('schedule')
        .setDescription('Manage events')
        .addStringOption((o) =>
            o
                .setName('action')
                .setDescription('What do you want to do?')
                .setRequired(true)
                .addChoices(
                    { name: '📅 View schedule', value: 'view' },
                    { name: '➕ Add event', value: 'add' },
                    { name: '🗑️ Remove event', value: 'remove' },
                    { name: '📝 Edit notes', value: 'notes' },
                ),
        )
        .addStringOption((o) =>
            o
                .setName('type')
                .setDescription('Type of event (required for add)')
                .setRequired(false)
                .addChoices(
                    { name: 'Practice', value: 'Practice' },
                    { name: 'Official Match', value: 'Official Match' },
                    { name: 'Scrimmage', value: 'Scrimmage' },
                    { name: 'VOD Review', value: 'VOD Review' },
                ),
        )
        .addStringOption((o) =>
            o.setName('date').setDescription('Date DD/MM/YYYY (required for add)').setRequired(false),
        )
        .addStringOption((o) =>
            o.setName('time').setDescription('Time HH:MM Portugal time (required for add)').setRequired(false),
        )
        .addStringOption((o) =>
            o.setName('opponent').setDescription('Opponent name').setRequired(false).setMaxLength(100),
        )
        .addStringOption((o) => o.setName('notes').setDescription('Notes').setRequired(false).setMaxLength(500)),

    async execute(interaction) {
        const action = interaction.options.getString('action');
        if (action === 'view' ? !hasTeamPerms(interaction) : !hasPerms(interaction)) {
            return safeReply(interaction, ephemeral(action === 'view' ? NO_PERMS_TEAM : NO_PERMS_MANAGER));
        }
        await ACTIONS[action](interaction);
    },
};
