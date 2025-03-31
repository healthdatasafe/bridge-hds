/* eslint-env mocha */
require('./helpers/testServer');
const assert = require('node:assert/strict');
const { init: initTestServer, apiTest, partnerAuth } = require('./helpers/testServer');
const ShortUniqueId = require('short-unique-id');

describe('[USEX] Users', () => {
  const testRnd = (new ShortUniqueId({ dictionary: 'alphanum_lower', length: 8 })).rnd();

  before(async () => {
    await initTestServer();
  });

  it('[USEU] GET /user/:userId:/status - Unkown User', async () => {
    const result = await apiTest().get(`/user/${testRnd}/status`).set(partnerAuth());
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, {
      error: 'Ressource not found: Unkown user',
      errorObject: { userId: testRnd }
    });
  });
});
