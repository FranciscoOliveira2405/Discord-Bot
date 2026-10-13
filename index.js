require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startReminders } = require('./utils/managers/reminderManager');
const { updateScheduleMessage } = require('./utils/managers/scheduleManager');
const { updateAbsenceMessage } = require('./utils/managers/absenceManager');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

function loadCommands(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            loadCommands(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const command = require(fullPath);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: ${command.data.name}`);
            }
        }
    }
}

client.commands = new Collection();
loadCommands(path.join(__dirname, 'commands'));

client.once('ready', async () => {
    console.log(`\n🤖 Bot is online as ${client.user.tag}`);
    console.log(`📡 Connected to ${client.guilds.cache.size} server(s)`);
    startReminders(client);

    try {
        const guild = client.guilds.cache.first();
        if (guild) {
            await updateScheduleMessage(guild);
            await updateAbsenceMessage(guild, false);
            console.log('✅ Boards refreshed on startup');
        }
    } catch (err) {
        console.error('⚠️ Could not refresh boards on startup:', err);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(`❌ Error executing ${interaction.commandName}:`, err);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ There was an error executing this command.', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ There was an error executing this command.', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
