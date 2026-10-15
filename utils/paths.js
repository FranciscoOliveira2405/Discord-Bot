const fs = require('fs');
const path = require('path');

// Folder where the database and the board message IDs are stored.
// Can be moved with the BOT_DATA_DIR environment variable (useful for tests and Docker volumes).
function dataDir() {
    const dir = process.env.BOT_DATA_DIR ? path.resolve(process.env.BOT_DATA_DIR) : path.join(__dirname, '..', 'data');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function dataPath(file) {
    return path.join(dataDir(), file);
}

module.exports = { dataDir, dataPath };
