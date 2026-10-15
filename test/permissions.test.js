const test = require('node:test');
const assert = require('node:assert/strict');

process.env.OWNER_ROLE_ID = '111111111111111111';
process.env.MANAGERS_ROLE_ID = '222222222222222222';
process.env.TEAM_ROLE_ID = '333333333333333333';

const { hasPerms, hasTeamPerms } = require('../utils/constants');

// A fake interaction whose member has the given roles (names are deliberately misleading)
const asMember = (roleIds) => ({
    member: { roles: { cache: new Map(roleIds.map((id) => [id, { id, name: 'OWNER' }])) } },
});

test('managers and owners have full permissions', () => {
    assert.equal(hasPerms(asMember(['111111111111111111'])), true);
    assert.equal(hasPerms(asMember(['222222222222222222'])), true);
});

test('team members only have team permissions', () => {
    const team = asMember(['333333333333333333']);
    assert.equal(hasPerms(team), false);
    assert.equal(hasTeamPerms(team), true);
});

test('a role that is merely NAMED "OWNER" gives nothing', () => {
    const impostor = asMember(['999999999999999999']); // role name is "OWNER", but the ID is not the real one
    assert.equal(hasPerms(impostor), false);
    assert.equal(hasTeamPerms(impostor), false);
});

test('missing member (for example a direct message) is denied', () => {
    assert.equal(hasPerms({ member: null }), false);
    assert.equal(hasTeamPerms({}), false);
});

test('works with the raw role list Discord sends for uncached members', () => {
    assert.equal(hasPerms({ member: { roles: ['222222222222222222'] } }), true);
});
