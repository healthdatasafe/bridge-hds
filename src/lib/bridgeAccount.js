/**
 * Manage the bridge connection and interaction
 */
const { getConfig } = require('boiler');
const { Connection } = require('pryv');
const { internalError, unkownRessource } = require('../errors');

/** @type {Connection} - the connection to pryv bridge account */
let bridgeConnection;

module.exports = {
  init,
  userStatus
};

/** Stream that contains all users's streams */
const USERS_STREAM_ID = 'users';
/** Will prefix all users' streamsId  */
const USER_STREAM_PREFIX = 'user-';

/**
 * Init the bridgeAccount
 */
async function init () {
  if (bridgeConnection) return;
  const bridgeApiEndPoint = (await getConfig()).get('bridgeApiEndPoint');
  bridgeConnection = new Connection(bridgeApiEndPoint);
  // check that access is valid
  const info = await bridgeConnection.accessInfo();
  if (info?.permissions[0]?.streamId !== '*') {
    internalError('Brdige does not have master permissions', info);
  }
}

/**
 * Get user status
 */
async function userStatus (partnerUserId) {
  const streamUserId = streamIdForUserId(partnerUserId);
  const apiCalls = [{
    method: 'events.get',
    params: { streams: [streamUserId], limit: 1, types: ['credentials/pryv-api-endpoint'] }
  }, {
    method: 'events.get',
    params: { streams: [streamUserId], limit: 1, types: ['sync-status/bridge'] }
  }];
  const result = await bridgeConnection.api(apiCalls);
  if (result[0]?.error?.id === 'unknown-referenced-resource') unkownRessource('Unkown user', { userId: partnerUserId });
  return result;
}

/**
 * Util to get the streamId of a partnerUserId
 */
function streamIdForUserId (partnerUserId) {
  // if partnerUserId is not streamId compliant .. make it lowercase and alpha only.
  return USER_STREAM_PREFIX + partnerUserId;
}
