require('dotenv').config();
const { REST } = require('@discordjs/rest');
const fs = require('fs');
const path = require('path');

const commands = [];

function loadCommands(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            loadCommands(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const command = require(fullPath);
            if (command.data) {
                commands.push(command.data.toJSON());
                console.log(`📦 Preparing command: ${command.data.name}`);
            }
        }
    }
}

loadCommands(path.join(__dirname, 'commands'));

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('\n🔄 Registering slash commands with Discord...');
        await rest.put(
            `/applications/${process.env.CLIENT_ID}/guilds/${process.env.GUILD_ID}/commands`,
            { body: commands }
        );
        console.log('✅ All slash commands registered successfully!');
        console.log('🤖 You can now run the bot with: node index.js');
    } catch (err) {
        console.error('❌ Error registering commands:', err);
    }
})();
