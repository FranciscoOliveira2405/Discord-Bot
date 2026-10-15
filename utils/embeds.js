const {
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
} = require('discord.js');
const { DIVIDER, TYPE_COLORS, TYPE_EMOJIS, TYPE_LABELS, normalizeDate } = require('./constants');
const { lisbonToUnix } = require('./time');
const { BASE_LABEL, buildTimezoneField } = require('./managers/timezoneManager');

const hasValue = (text) => Boolean(text) && text !== 'N/A';

// The embed used for an event everywhere: schedule view/add, reminders and removal notices.
function buildEventEmbed(
    event,
    { authorPrefix = '', authorSuffix = '', showTimezones = true, timestamp = false } = {},
) {
    const emoji = TYPE_EMOJIS[event.type] || '📅';
    const label = TYPE_LABELS[event.type] || String(event.type).toUpperCase();
    const isMatch = event.type === 'Official Match' || event.type === 'Scrimmage';
    const dateStr = normalizeDate(event.date);
    const timeStr = String(event.time);
    const unix = lisbonToUnix(dateStr, timeStr);

    let desc = `${DIVIDER}\n📅  ${dateStr}　　🕐  ${timeStr} ${BASE_LABEL}${unix ? `　　⏳  <t:${unix}:R>` : ''}\n`;
    if (isMatch && hasValue(event.opponent)) desc += `🆚  ${event.opponent}\n`;
    if (showTimezones) {
        const timezones = buildTimezoneField(timeStr, dateStr);
        if (timezones) desc += `${DIVIDER}\n🌍  ${timezones.replace(/\n/g, '　·　')}\n`;
    }
    if (hasValue(event.notes)) desc += `${DIVIDER}\n📝  ${event.notes}\n`;
    desc += DIVIDER;

    const embed = new EmbedBuilder()
        .setColor(TYPE_COLORS[event.type] || TYPE_COLORS.default)
        .setAuthor({ name: `${authorPrefix}${emoji} ${label}${authorSuffix}` })
        .setTitle(isMatch ? `You vs ${hasValue(event.opponent) ? event.opponent : 'TBD'}` : label)
        .setDescription(desc)
        .setFooter({ text: `ID: ${event.id}` });
    if (timestamp) embed.setTimestamp();
    return embed;
}

// Select menu listing events (Discord allows at most 25 options).
function eventSelect(customId, placeholder, schedules, describe = (event) => `ID: ${event.id}`) {
    const options = schedules.slice(0, 25).map((event) =>
        new StringSelectMenuOptionBuilder()
            .setLabel(`${event.type} — ${normalizeDate(event.date)} at ${event.time}`.slice(0, 100))
            .setDescription(describe(event).slice(0, 100))
            .setValue(String(event.id))
            .setEmoji(TYPE_EMOJIS[event.type] || '📅'),
    );
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).addOptions(options),
    );
}

module.exports = { buildEventEmbed, eventSelect };
