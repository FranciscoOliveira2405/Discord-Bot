const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const path = require('path');
const { loadConfig, getMainGuild } = require('./utils/config');
const { findCommandFiles } = require('./utils/commandFiles');
const { closeDb } = require('./utils/dbManager');
const { ephemeral, safeReply } = require('./utils/reply');
const { startReminders } = require('./utils/managers/reminderManager');
const { updateScheduleMessage } = require('./utils/managers/scheduleManager');
const { updateAbsenceMessage } = require('./utils/managers/absenceManager');
const { syncMembers } = require('./utils/managers/memberSync');

let config;
try {
    config = loadConfig();
} catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
}

const client = new Client({
    // Only what the bot needs. GuildMembers is used to link players to their Discord ID at startup.
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    // Nothing the users type can ping anyone. Pings are enabled explicitly for @TEAM only.
    allowedMentions: { parse: [], repliedUser: false },
});

client.commands = new Collection();
for (const file of findCommandFiles(path.join(__dirname, 'commands'))) {
    const command = require(file);
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    }
}

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`\n🤖 Bot is online as ${readyClient.user.tag}`);

    const guild = getMainGuild(readyClient);
    if (!guild) {
        console.error('❌ The bot is not in the server set in GUILD_ID. Invite it, then restart.');
        return;
    }

    startReminders(readyClient);

    try {
        await syncMembers(guild);
    } catch (err) {
        console.error('⚠️ Could not sync members (is the Server Members Intent enabled?):', err.message);
    }

    try {
        await updateScheduleMessage(guild);
        await updateAbsenceMessage(guild, false);
        console.log('✅ Boards refreshed on startup');
    } catch (err) {
        console.error('⚠️ Could not refresh boards on startup:', err);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.guildId !== config.GUILD_ID) {
        return safeReply(interaction, ephemeral('❌ This bot only works in its own server.'));
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(`❌ Error executing /${interaction.commandName}:`, err);
        await safeReply(interaction, ephemeral('❌ There was an error executing this command.'));
    }
});

client.on(Events.Error, (err) => console.error('Discord client error:', err));
process.on('unhandledRejection', (reason) => console.error('Unhandled promise rejection:', reason));
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1); // let the host restart the bot in a clean state
});

// Clean shutdown (Ctrl+C or the host stopping the process)
function shutdown(signal) {
    console.log(`\n${signal} received, shutting down...`);
    Promise.resolve(client.destroy()).finally(() => {
        closeDb();
        process.exit(0);
    });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

client.login(config.TOKEN).catch((err) => {
    console.error('❌ Could not log in. Check TOKEN in your .env file:', err.message);
    process.exit(1);
});
