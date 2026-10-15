const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig, DEPLOY_ENV } = require('../utils/config');
const { resolveZone } = require('../utils/managers/timezoneManager');

const ID = '123456789012345678';

test('loadConfig returns the values when everything is set', () => {
    const env = { TOKEN: ' abc ', CLIENT_ID: ID, GUILD_ID: ID };
    assert.deepEqual(loadConfig(DEPLOY_ENV, env), { TOKEN: 'abc', CLIENT_ID: ID, GUILD_ID: ID });
});

test('loadConfig lists the missing variables', () => {
    assert.throws(() => loadConfig(DEPLOY_ENV, { TOKEN: 'abc' }), /CLIENT_ID, GUILD_ID/);
    assert.throws(() => loadConfig(DEPLOY_ENV, { TOKEN: '  ', CLIENT_ID: ID, GUILD_ID: ID }), /TOKEN/);
});

test('loadConfig rejects IDs that are not Discord IDs', () => {
    assert.throws(() => loadConfig(DEPLOY_ENV, { TOKEN: 'abc', CLIENT_ID: 'my-app', GUILD_ID: ID }), /CLIENT_ID/);
});

test('resolveZone understands GMT offsets', () => {
    assert.deepEqual(resolveZone('gmt+2'), { kind: 'offset', offsetHours: 2, id: 'GMT+2' });
    assert.equal(resolveZone('GMT-3').offsetHours, -3);
    assert.equal(resolveZone('GMT+5:30').offsetHours, 5.5);
    assert.equal(resolveZone('GMT+5:30').id, 'GMT+5:30');
    assert.equal(resolveZone('GMT+0').offsetHours, 0);
});

test('resolveZone rejects invalid offsets', () => {
    assert.equal(resolveZone('GMT+99'), null);
    assert.equal(resolveZone('GMT-13'), null);
    assert.equal(resolveZone('GMT+2:99'), null);
    assert.equal(resolveZone('hello'), null);
    assert.equal(resolveZone('+01:00'), null);
});

test('resolveZone understands named zones', () => {
    assert.equal(resolveZone('Europe/Berlin').zone, 'Europe/Berlin');
    assert.equal(resolveZone('Not/AZone'), null);
});
