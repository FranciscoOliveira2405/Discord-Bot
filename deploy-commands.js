const { REST, Routes } = require('discord.js');
const path = require('path');
const { loadConfig, DEPLOY_ENV } = require('./utils/config');
const { findCommandFiles } = require('./utils/commandFiles');

let config;
try {
    config = loadConfig(DEPLOY_ENV);
} catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
}

const commands = [];
for (const file of findCommandFiles(path.join(__dirname, 'commands'))) {
    const command = require(file);
    if (command.data) {
        commands.push(command.data.toJSON());
        console.log(`📦 Preparing command: ${command.data.name}`);
    }
}

const rest = new REST({ version: '10' }).setToken(config.TOKEN);

(async () => {
    try {
        console.log('\n🔄 Registering slash commands with Discord...');
        await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
        console.log('✅ All slash commands registered successfully!');
        console.log('🤖 You can now start the bot with: npm start');
    } catch (err) {
        console.error('❌ Error registering commands:', err);
        process.exitCode = 1;
    }
})();
