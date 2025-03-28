/**
 * Manage the bridge connection and interaction
 */
const { getConfig } = require('boiler');
const { Connection } = require('pryv');
const { internalError } = require('../errors');

/** @type {Connection} - the connection to pryv bridge account */
let _bridgeConnection;

/** Stream that contains all users's streams */
const USERS_STREAM_ID = 'users';
/** Will prefix all users' streamsId  */
const USER_STREAM_PREFIX = 'user-';

module.exports = {
  init,
  bridgeConnection,
  streamIdForUserId,
  USERS_STREAM_ID
};

/**
 * get the active bridge connection
 * @returns {Connection}
 */
function bridgeConnection () {
  return _bridgeConnection;
}

/**
 * Init the bridgeAccount
 */
async function init () {
  if (_bridgeConnection) return;
  const bridgeApiEndPoint = (await getConfig()).get('bridgeApiEndPoint');
  _bridgeConnection = new Connection(bridgeApiEndPoint);
  // check that access is valid
  const info = await _bridgeConnection.accessInfo();
  if (info?.permissions[0]?.streamId !== '*') {
    internalError('Bridge does not have master permissions', info);
  }
  await ensureBaseStreams();
}

/**
 * Util to get the streamId of a partnerUserId
 */
function streamIdForUserId (partnerUserId) {
  // if partnerUserId is not streamId compliant .. make it lowercase and alpha only.
  return USER_STREAM_PREFIX + partnerUserId;
}

/**
 * Ensure base structure is created
 */
async function ensureBaseStreams () {
  const apiCalls = [{
    method: 'streams.create',
    params: { id: USERS_STREAM_ID, name: 'Users' }
  }];
  await _bridgeConnection.api(apiCalls);
}
