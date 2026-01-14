/* eslint-env mocha */
const assert = require('node:assert/strict');
const { init: initTestServer, apiTest, createOnboardedUser } = require('./helpers/testServer');

describe('[SELX] SELF', function () {
  this.timeout(5000);

  before(async () => {
    await initTestServer();
  });

  it('[SELA] GET /self/status', async () => {
    const userInfos = await createOnboardedUser();
    const result = await apiTest()
      .get('/self/status')
      .set({ authorization: 'ApiEndpoint ' + userInfos.personalApiEndpoint });
    assert.equal(result.body.accessInfo.user.username, userInfos.username);
    assert.equal(result.body.status.user.partnerUserId, userInfos.partnerUserId);
  });
});
