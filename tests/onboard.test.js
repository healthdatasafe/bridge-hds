/* eslint-env mocha */
require('./helpers/testServer');
const assert = require('node:assert/strict');
const { init: initTestServer, apiTest } = require('./helpers/testServer');
const ShortUniqueId = require('short-unique-id');

describe('[ONBX] Onboarding Usrer', () => {
  const testRnd = (new ShortUniqueId({ dictionary: 'alphanum_lower', length: 8 })).rnd();

  before(async () => {
    await initTestServer();
  });

  it('[ONBU] POST /user/onboard', async () => {
    const requestBody = {
      partnerUserId: testRnd
    };
    const result = await apiTest().post('/user/onboard').send(requestBody);
    console.log(result.body);
    // -- todo
  });
});
