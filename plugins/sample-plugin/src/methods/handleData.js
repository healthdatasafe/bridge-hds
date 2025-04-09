const { getConfig } = require('boiler');
const user = require('../../../../src/methods/user');
const { logSyncStatus } = require('../../../../src/lib/bridgeAccount');

const streamIds = {
  mainUserStreamId: null // this is the stream id on userAccount used to store the data
};

module.exports = {
  init,
  newData
};

/**
 * You may need an init function to load information from the config
 * or others asynchronous tasks
 * @returns {Promise<void>}
 */
async function init () {
  const config = await getConfig();
  // For this example the first stream of the userPermissionRequest service
  // is the one used to store the data
  const firsStream = config.get('service:userPermissionRequest')[0];
  streamIds.mainUserStreamId = firsStream.streamId;
}

/**
 * Retreive the user, thransform data to events and create them
 * For this example we only add the streamId and the method "events.create"
 * @param {string} partnerUserId
 * @param {Array<Object>} data Array of "Events like" data without streamId
 * @returns {Object} - result of the api call
 * @throws {Error} - if the user is not found, not active or the api call fails
 */
async function newData (partnerUserId, data) {
  // will throw error if the user is not found or not active
  const hdsUser = await user.getPryvConnectionAndStatus(partnerUserId);
  const apiCalls = [];
  // transform data to events
  for (const event of data) {
    apiCalls.push({
      method: 'events.create',
      params: {
        streamIds: [streamIds.mainUserStreamId],
        type: event.type,
        content: event.content
      }
    });
  }
  const result = await hdsUser.connection.api(apiCalls);
  // keep event modified time as syncTime (maybe different for your plugin)
  const syncTime = result[0].event.modified;
  const createdEventId = result[0].event.id;
  // log sync status on next tick
  process.nextTick(() => { logSyncStatus(partnerUserId, syncTime, { createdEventId }); });
  return result;
}
