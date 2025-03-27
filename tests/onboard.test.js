/* eslint-env mocha */
require('./helpers/testServer');
const assert = require('node:assert/strict');
const { init: initTestServer, apiTest, configGet, createUserAndPermissions } = require('./helpers/testServer');
const ShortUniqueId = require('short-unique-id');
const pryv = require('pryv');

describe('[ONBX] Onboarding User', () => {
  const testRnd = (new ShortUniqueId({ dictionary: 'alphanum_lower', length: 8 })).rnd();

  before(async () => {
    await initTestServer();
  });

  it('[ONBU] POST /user/onboard', async () => {
    // -- Phase 1 - start onboarding
    const partnerUserId = testRnd;
    const requestBody = { partnerUserId };
    const resultOnboard = (await apiTest().post('/user/onboard').send(requestBody)).body;
    assert.equal(resultOnboard.type, 'authRequest');
    assert.equal(resultOnboard.content.code, 201);
    const returnURL = configGet('baseURL') + '/user/onboard/finalize/' + partnerUserId;
    assert.equal(resultOnboard.content.returnURL, returnURL);
    assert.deepEqual(resultOnboard.content.requestedPermissions, configGet('pryv:permissions'));
    assert.equal(resultOnboard.content.requestingAppId, configGet('pryv:appId'));

    // -- Phase 2 - create user
    const hdsUserId = 'hds' + testRnd;
    const permissions = resultOnboard.content.requestedPermissions;
    const appId = resultOnboard.content.requestingAppId;
    const newUser = await createUserAndPermissions(hdsUserId, permissions, appId);

    // -- Phase 3 - simulate access change state
    const newState = {
      status: 'ACCEPTED',
      apiEndPoint: newUser.appApiEndpoint,
      username: newUser.username,
      token: pryv.utils.extractTokenAndAPIEndpoint(newUser.appApiEndpoint).token
    };
    const changeStateResponse = await fetch(resultOnboard.content.poll, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newState)
    });
    const changeSateBody = await changeStateResponse.json();
    assert.equal(changeSateBody.status, 'ACCEPTED');
    assert.equal(changeSateBody.apiEndpoint, newUser.appApiEndpoint);

    // -- Phase 4 - Trigger return URL
    const returnURLResponse = await apiTest().get('/user/onboard/finalize/' + partnerUserId + '?prYvpoll=' + resultOnboard.content.poll);
    console.log(returnURLResponse.body);
    // -- todo finalize flow
  });
});
