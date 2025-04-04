/* eslint-env mocha */
require('./helpers/testServer');
const assert = require('node:assert/strict');
const { init: initTestServer, apiTest, configGet, createUserAndPermissions, partnerAuth } = require('./helpers/testServer');
const { startHttpServerCapture } = require('./helpers/testWebServerCapture');
const ShortUniqueId = require('short-unique-id');
const pryv = require('pryv');

describe('[ONBX] Onboarding User', () => {
  const testRnd = (new ShortUniqueId({ dictionary: 'alphanum_lower', length: 8 })).rnd();
  let captureServer;
  before(async () => {
    await initTestServer();
    captureServer = await startHttpServerCapture();
  });

  after(async function () {
    this.timeout(2000);
    await captureServer.close();
  });

  it('[ONBU] POST /user/onboard', async function () {
    this.timeout(2000);
    // -- Phase 1 - start onboarding
    const partnerUserId = testRnd;
    const requestBody = {
      partnerUserId,
      redirectURLs: {
        success: 'https://success.domain',
        cancel: 'https://cancel.domain'
      },
      clientData: {
        test: 'Hello test'
      }
    };
    const resultOnboard = (await apiTest().post('/user/onboard').set(partnerAuth()).send(requestBody)).body;
    assert.equal(resultOnboard.type, 'authRequest');
    assert.ok(resultOnboard.onboardingSecret.length === 24);
    const onboardingSecret = resultOnboard.onboardingSecret;
    assert.ok(resultOnboard.redirectUserURL.startsWith('https://'));
    // resultOnboard.context is used for test and eventually to customize the process on client side
    const resultOnboardResponse = resultOnboard.context.responseBody;
    assert.equal(resultOnboardResponse.code, 201);
    const returnURL = configGet('baseURL') + '/user/onboard/finalize/' + partnerUserId;
    assert.equal(resultOnboardResponse.returnURL, returnURL);
    assert.deepEqual(resultOnboardResponse.requestedPermissions, configGet('service:userPermissionRequest'));
    assert.equal(resultOnboardResponse.requestingAppId, configGet('service:appId'));

    // -- Phase 2 - create user
    const hdsUserId = 'hds' + testRnd;
    const permissions = resultOnboardResponse.requestedPermissions;
    const appId = resultOnboardResponse.requestingAppId;
    const newUser = await createUserAndPermissions(hdsUserId, permissions, appId);

    // -- Phase 3 - simulate access change state
    const newState = {
      status: 'ACCEPTED',
      apiEndPoint: newUser.appApiEndpoint,
      username: newUser.username,
      token: pryv.utils.extractTokenAndAPIEndpoint(newUser.appApiEndpoint).token
    };
    const changeStateResponse = await fetch(resultOnboardResponse.poll, {
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
    const returnURLResponse = await apiTest().get(`/user/onboard/finalize/${partnerUserId}?prYvpoll=${resultOnboardResponse.poll}`);
    assert.equal(returnURLResponse.status, 302);
    assert.equal(returnURLResponse.headers.location, 'https://success.domain');

    // -- Finaly 1 - Check that webhook has been called properly
    const captured = captureServer.captured.pop();
    assert.equal(captured.method, 'GET');
    assert.equal(captured.url, `/?partnerUserId=${partnerUserId}&onboardingSecret=${onboardingSecret}&test=Hello+test&type=SUCCESS`);

    // -- Finaly 2 - Check that user is active
    const userStatusResponse = await apiTest().get(`/user/${partnerUserId}/status`).set(partnerAuth());
    assert.equal(userStatusResponse.body.user.active, true);
    assert.equal(userStatusResponse.body.user.apiEndpoint, newUser.appApiEndpoint);
  });
});
