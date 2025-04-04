/* eslint-env mocha */
require('./helpers/testServer');
const assert = require('node:assert/strict');
const { init: initTestServer, apiTest, partnerAuth, createOnboardedUser } = require('./helpers/testServer');
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

  it('[USEA] GET /user/:userId:/status - Active User', async () => {
    const userInfos = await createOnboardedUser();
    const result = await apiTest().get(`/user/${userInfos.partnerUserId}/status`).set(partnerAuth());
    assert.equal(result.status, 200);
    const status = result.body;
    const expectedStatus = {
      user: {
        active: true,
        partnerUserId: userInfos.partnerUserId,
        apiEndpoint: userInfos.appApiEndpoint,
        created: status.user.created,
        modified: status.user.modified
      },
      syncStatus: { }
    };
    assert.deepEqual(status, expectedStatus);
  });

  it('[USEI] GET /user/:userId:/status - Inactive User', async () => {
    const userInfos = await createOnboardedUser();

    // deactivate the user
    const resultInactive = await apiTest().post(`/user/${userInfos.partnerUserId}/status`).set(partnerAuth()).send({ active: false });
    assert.equal(resultInactive.status, 200);
    assert.deepEqual(resultInactive.body, { active: false });

    // check the status
    const result = await apiTest().get(`/user/${userInfos.partnerUserId}/status`).set(partnerAuth());
    assert.equal(result.status, 200);
    const status = result.body;
    const expectedStatus = {
      user: {
        active: false,
        partnerUserId: userInfos.partnerUserId,
        apiEndpoint: userInfos.appApiEndpoint,
        created: status.user.created,
        modified: status.user.modified
      },
      syncStatus: { }
    };
    assert.deepEqual(status, expectedStatus);

    // -- to check error on post data
  });
});
