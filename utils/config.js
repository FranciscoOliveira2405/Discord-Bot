require('dotenv').config({ quiet: true });

const BOT_ENV = ['TOKEN', 'CLIENT_ID', 'GUILD_ID', 'OWNER_ROLE_ID', 'MANAGERS_ROLE_ID', 'TEAM_ROLE_ID'];
const DEPLOY_ENV = ['TOKEN', 'CLIENT_ID', 'GUILD_ID'];
const SNOWFLAKE = /^\d{17,20}$/;

// Checks that every required variable exists and that IDs look like Discord IDs.
// Throws an Error with a clear message instead of failing later in a confusing way.
function loadConfig(names = BOT_ENV, env = process.env) {
    const missing = names.filter((name) => !String(env[name] ?? '').trim());
    if (missing.length > 0) {
        throw new Error(
            `Missing environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and fill in your values.`,
        );
    }
    const invalid = names.filter((name) => name.endsWith('_ID') && !SNOWFLAKE.test(String(env[name]).trim()));
    if (invalid.length > 0) {
        throw new Error(`Invalid value for: ${invalid.join(', ')}. Discord IDs are numbers with 17 to 20 digits.`);
    }
    return Object.fromEntries(names.map((name) => [name, String(env[name]).trim()]));
}

function roleIds(env = process.env) {
    return {
        owner: String(env.OWNER_ROLE_ID ?? '').trim(),
        managers: String(env.MANAGERS_ROLE_ID ?? '').trim(),
        team: String(env.TEAM_ROLE_ID ?? '').trim(),
    };
}

// The bot is built for a single server (GUILD_ID).
function getMainGuild(client, env = process.env) {
    return client.guilds.cache.get(String(env.GUILD_ID ?? '').trim()) ?? null;
}

module.exports = { BOT_ENV, DEPLOY_ENV, loadConfig, roleIds, getMainGuild };
