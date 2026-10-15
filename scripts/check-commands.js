// Smoke test: loads every slash command and checks it is well formed.
// Used by CI, and can be run locally with: npm run check
const path = require('path');
const { findCommandFiles } = require('../utils/commandFiles');

const ROOT = path.join(__dirname, '..');
const names = new Set();
let failed = false;

for (const file of findCommandFiles(path.join(ROOT, 'commands'))) {
    const relative = path.relative(ROOT, file);
    try {
        const command = require(file);
        if (!command.data || typeof command.execute !== 'function') {
            throw new Error('must export "data" and an "execute" function');
        }
        command.data.toJSON(); // throws if the command definition is invalid
        if (names.has(command.data.name)) throw new Error(`duplicate command name "${command.data.name}"`);
        names.add(command.data.name);
    } catch (err) {
        failed = true;
        console.error(`FAIL ${relative}: ${err.message}`);
    }
}

if (failed) process.exit(1);
console.log(`OK: ${names.size} commands loaded (${[...names].sort().join(', ')})`);
