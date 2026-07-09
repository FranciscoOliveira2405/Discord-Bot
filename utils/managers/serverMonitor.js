const Gamedig = require('gamedig');
const path = require('path');
const fs = require('fs');

const SERVER_IP = '169.150.245.105';
const SERVER_PORT = 25958;
const CONNECT_STRING = 'connect 169.150.245.105:25958; password Kaiimybitch';
const CHECK_INTERVAL_MS = 60_000;

const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'serverState.json');

function loadState() {
    try { if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {}
    return { online: null, messageId: null };
}

function saveState(state) {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8'); } catch (e) { console.error('Failed to save server state:', e); }
}

async function queryServer() {
    try {
        const state = await Gamedig.query({ type: 'csgo', host: SERVER_IP, port: SERVER_PORT });
        return { online: true, players: state.players.length, maxPlayers: state.maxplayers || 14 };
    } catch {
        return { online: false };
    }
}

async function updateServerChannel(guild, serverInfo) {
    try {
        const channel = guild.channels.cache.find(c => c.name.includes('cs2-server'));
        if (!channel) return;

        const newName = serverInfo.online ? '🟢︱cs2-server' : '🔴︱cs2-server';
        if (channel.name !== newName) {
            await channel.setName(newName).catch(() => {});
        }

        const { EmbedBuilder } = require('discord.js');
        const state = loadState();

        const embed = serverInfo.online
            ? new EmbedBuilder()
                .setColor(0x2ECC71)
                .setAuthor({ name: '🟢 CS2 Server — Online' })
                .setDescription([
                    `**v3xys team server**`,
                    ``,
                    `👥  **Players:** ${serverInfo.players}/${serverInfo.maxPlayers}`,
                    ``,
                    `\`\`\`${CONNECT_STRING}\`\`\``,
                ].join('\n'))
                .setFooter({ text: 'Auto-updated' })
                .setTimestamp()
            : new EmbedBuilder()
                .setColor(0xE74C3C)
                .setAuthor({ name: '🔴 CS2 Server — Offline' })
                .setDescription([
                    `The server is currently **offline**.`,
                    ``,
                    `It will appear here automatically when it comes back online.`,
                ].join('\n'))
                .setFooter({ text: 'Auto-updated' })
                .setTimestamp();

        if (state.messageId) {
            try {
                const existing = await channel.messages.fetch(state.messageId);
                await existing.edit({ embeds: [embed] });
                return;
            } catch {}
        }

        const sent = await channel.send({ embeds: [embed] });
        state.messageId = sent.id;
        saveState(state);
    } catch (err) { console.error('Server monitor error:', err); }
}

function startServerMonitor(client) {
    console.log('✅ CS2 server monitor started');

    setInterval(async () => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild) return;
            const serverInfo = await queryServer();
            await updateServerChannel(guild, serverInfo);
        } catch (err) { console.error('Server monitor tick error:', err); }
    }, CHECK_INTERVAL_MS);

    setTimeout(async () => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild) return;
            const serverInfo = await queryServer();
            await updateServerChannel(guild, serverInfo);
        } catch {}
    }, 5000);
}

module.exports = { startServerMonitor };
