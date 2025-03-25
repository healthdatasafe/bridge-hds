/* eslint-env mocha */
require('./helpers/testServer');
const assert = require('node:assert/strict');
const { init: initTestServer } = require('./helpers/testServer');
const ShortUniqueId = require('short-unique-id');

describe('[ONBX] Onboarding', () => {
  const testRnd = (new ShortUniqueId({ dictionary: 'alphanum_lower', length: 8 })).rnd();

  before(async () => {
    await initTestServer();
  });

  it('[ONBU] POST /user/onboard', async () => {
    assert.ok(testRnd);
    // -- todo
  });
});
