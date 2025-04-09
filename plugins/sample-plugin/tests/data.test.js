/* eslint-env mocha */
const { getConfig } = require('boiler');
const { init: initTestServer, apiTest, partnerAuth, createOnboardedUser } = require('../../../tests/helpers/testServer');
const assert = require('node:assert/strict');

describe('[PLTX] Plugin sample test', () => {
  let mainStreamId = null;
  before(async () => {
    await initTestServer();
    // get the main streamId for the userPermissionRequest servic
    const config = await getConfig();
    const firsStream = config.get('service:userPermissionRequest')[0];
    mainStreamId = firsStream.streamId;
  });

  it('[PLTP] Create data POST /data/test/{userId}', async function () {
    this.timeout(3000);
    const userInfos = await createOnboardedUser();
    // -- Check OK on post data
    const newData = [{
      type: 'note/txt',
      content: 'Hello world'
    }];
    const resultEvents = await apiTest()
      .post(`/data/test/${userInfos.partnerUserId}`)
      .set(partnerAuth())
      .send(newData);

    assert.equal(resultEvents.body.length, 1);
    const event = resultEvents.body[0].event;
    assert.ok(event);
    assert.equal(event.type, 'note/txt');
    assert.equal(event.content, 'Hello world');
    assert.equal(event.streamId, mainStreamId);

    // -- Wait for status to be updated
    await new Promise((resolve) => setTimeout(resolve, 500));
    // -- Check sync status
    const statusRes = await apiTest()
      .get(`/user/${userInfos.partnerUserId}/status`)
      .set(partnerAuth());
    const syncStatus = statusRes.body.syncStatus;
    assert.equal(syncStatus.lastSync, event.modified);
    assert.deepEqual(syncStatus.content, { createdEventId: event.id });
  });

  it('[PLTA] Call the API POST /data/test/{userId}/api', async () => {
    const userInfos = await createOnboardedUser();
    // -- Check OK on simple api call
    const apiCalls = [{
      method: 'streams.get',
      params: {}
    }];
    const resultEvents = await apiTest()
      .post(`/data/test/${userInfos.partnerUserId}/api`)
      .set(partnerAuth())
      .send(apiCalls);

    assert.equal(resultEvents.body.length, 1);
    const streams = resultEvents.body[0].streams;
    assert.ok(streams);
    assert.equal(streams[0].id, mainStreamId);
  });
});
