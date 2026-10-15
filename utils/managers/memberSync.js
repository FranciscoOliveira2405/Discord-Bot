const { syncMemberTags } = require('../dbManager');

// Links saved players and absences to their Discord ID and keeps their tags up to date.
// Needs the "Server Members Intent" to be enabled in the Discord Developer Portal.
async function syncMembers(guild) {
    const members = await guild.members.fetch();
    const { linked, refreshed } = syncMemberTags(
        [...members.values()].map((member) => ({
            id: member.id,
            tag: member.user.tag,
            username: member.user.username,
        })),
    );
    if (linked > 0 || refreshed > 0) {
        console.log(`👥 Member sync: ${linked} linked to a Discord ID, ${refreshed} tag(s) refreshed`);
    }
}

module.exports = { syncMembers };
