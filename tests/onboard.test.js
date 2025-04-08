/* eslint-env mocha */
require('./helpers/testServer');
const assert = require('node:assert/strict');
const { init: initTestServer, apiTest, configGet, createUserAndPermissions, partnerAuth, createOnboardedUser } = require('./helpers/testServer');
const { startHttpServerCapture } = require('./helpers/testWebServerCapture');
const ShortUniqueId = require('short-unique-id');
const pryv = require('pryv');

describe('[ONBX] Onboarding User with capture server on (Webhooks OK)', () => {
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
    this.timeout(3000);
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
    assert.equal(captured.path, '/');
    // keep plugins results to test idependently
    const capturedQuery = structuredClone(captured.query);
    const pluginsResults = JSON.parse(capturedQuery.pluginsResultJSON);
    delete capturedQuery.pluginsResultJSON;
    assert.deepEqual(capturedQuery, { partnerUserId, onboardingSecret, test: 'Hello test', type: 'SUCCESS' });
    assert.deepEqual(pluginsResults.sample, { dummy: 'Acknowledged by sample plugin' });

    // -- Finaly 2 - Check that user is active
    const userStatusResponse = await apiTest().get(`/user/${partnerUserId}/status`).set(partnerAuth());
    assert.equal(userStatusResponse.body.user.active, true);
    assert.equal(userStatusResponse.body.user.apiEndpoint, newUser.appApiEndpoint);
  });

  it('[ONBA] POST /user/onboard already exists', async function () {
    const userInfo = await createOnboardedUser();
    // start onboarding
    const partnerUserId = userInfo.partnerUserId;
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
    assert.equal(resultOnboard.type, 'userExists');
    assert.equal(resultOnboard.user.partnerUserId, partnerUserId);
    assert.equal(resultOnboard.user.active, true);
    assert.equal(resultOnboard.user.apiEndpoint, userInfo.appApiEndpoint);
  });

  it('[ONBR] POST /user/onboard/finalize redirect to error on unkown URL', async function () {
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
    await apiTest().post('/user/onboard').set(partnerAuth()).send(requestBody);

    // -- Phase 4 - Trigger finalize URL with wrong poll
    const returnURLResponse = await apiTest()
      .get(`/user/onboard/finalize/${partnerUserId}?prYvpoll=https://bogus`);
    assert.equal(returnURLResponse.status, 302);
    assert.equal(returnURLResponse.headers.location, 'https://error.domain?message=Failed%20finalizing%20onboarding.');
  });
});

describe('[ONBE] Onboarding User with failing Webhooks', () => {
  const testRnd = (new ShortUniqueId({ dictionary: 'alphanum_lower', length: 8 })).rnd();
  before(async () => {
    await initTestServer();
  });

  after(async function () {
    this.timeout(2000);
  });

  it('[ONBW] POST /user/onboard Failed WebHook', async function () {
    this.timeout(4000);
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
    const resultOnboardResponse = resultOnboard.context.responseBody;

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
    await fetch(resultOnboardResponse.poll, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newState)
    });

    // -- Phase 4 - Trigger return URL
    const returnURLResponse = await apiTest()
      .get(`/user/onboard/finalize/${partnerUserId}?prYvpoll=${resultOnboardResponse.poll}`);
    assert.equal(returnURLResponse.status, 302);
    assert.equal(returnURLResponse.headers.location, 'https://error.domain?message=Failed%20finalizing%20onboarding.');

    // -- Finaly 1 - Check that an error has been logged property on bridge Accounts
    await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1 sec .. error is sent async
    const errorLog = await apiTest()
      .get('/account/errors')
      .set(partnerAuth())
      .query({ limit: 1 });
    const errorEvent = errorLog.body[0];
    assert.equal(errorEvent.type, 'error/message-object');
    assert.equal(errorEvent.content.message, 'Failed finalizing onboarding');
    const expectedErrorObject = {
      partnerUserId,
      pollParam: errorEvent.content.errorObject.pollParam,
      innerErrorMessage: 'Failed contacting partner backend',
      innerErrorObject: {
        webhookCall: {
          whSettings: {
            url: 'http://127.0.0.1:8365/',
            method: 'GET',
            headers: { secret: 'toto' }
          },
          params: {
            partnerUserId,
            onboardingSecret: resultOnboard.onboardingSecret,
            test: 'Hello test',
            type: 'SUCCESS',
          }
        }
      }
    };

    const innerErrorObject = errorEvent.content.errorObject.innerErrorObject;
    const pluginResultsJSON = JSON.parse(innerErrorObject.webhookCall.params.pluginsResultJSON)
    // for test plugins just check sample and if no error
    for (const [key, value] of Object.entries(pluginResultsJSON)) {
      if (key === 'sample') {
        assert.deepEqual(value, { dummy: 'Acknowledged by sample plugin' });
      } else {
        assert.ok(value.error == null);
      }
    }
    expectedErrorObject.innerErrorObject.webhookCall.params.pluginsResultJSON = innerErrorObject.webhookCall.params.pluginsResultJSON;

    assert.deepEqual(errorEvent.content.errorObject, expectedErrorObject);

    // -- Finaly 2 - Check that user is active
    const userStatusResponse = await apiTest().get(`/user/${partnerUserId}/status`).set(partnerAuth());
    assert.equal(userStatusResponse.body.user.active, true);
    assert.equal(userStatusResponse.body.user.apiEndpoint, newUser.appApiEndpoint);
  });
});
