/* eslint-env mocha */
const { init: initTestServer, apiTest, partnerAuth } = require('../../../tests/helpers/testServer');
const assert = require('node:assert/strict');

describe('[PLTX] Plugin sample test', () => {
  before(async () => {
    await initTestServer();
  });

  it('[PLTP] POST /data/test', async () => {
    const result = await apiTest().post('/data/test').send({ hello: 'world' }).set(partnerAuth());
    assert.equal(result.status, 200);
    assert.equal(result.body, 'OK');
  });
});
