const fs = require('fs');
const path = require('path');

// Every .js file inside a folder, including sub folders.
function findCommandFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return findCommandFiles(fullPath);
        return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
    });
}

module.exports = { findCommandFiles };
