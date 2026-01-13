/* eslint-env mocha */
const assert = require('node:assert/strict');
const { init: initTestServer, apiTest, partnerAuth, createOnboardedUser } = require('./helpers/testServer');
const ShortUniqueId = require('short-unique-id');
const { getConfig } = require('boiler');

describe('[SELX] SELF', function () {
  this.timeout(5000);
  const testRnd = (new ShortUniqueId({ dictionary: 'alphanum_lower', length: 8 })).rnd();
  let mainStreamId = null;

  before(async () => {
    await initTestServer();
    // get the main streamId for the userPermissionRequest servic
    const config = await getConfig();
    const firsStream = config.get('service:userPermissionRequest')[0];
    mainStreamId = firsStream.streamId;
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
