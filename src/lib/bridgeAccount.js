/**
 * Manage the bridge connection and interaction
 */
const { getConfig } = require('boiler');
const { Connection } = require('pryv');
const { internalError } = require('../errors');

/** @type {Connection} - the connection to pryv bridge account */
let _bridgeConnection;

/** Will prefix all users' streamsId  */
const PARENT_USER_STREAM_SUFFIX = '-users';

const settings = {
  mainStreamId: null,
  userParentStreamId: null,
  activeUsersStreamId: null
};

module.exports = {
  init,
  bridgeConnection,
  streamIdForUserId,
  getUserParentStreamId
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
  const config = await getConfig();
  const bridgeApiEndPoint = config.get('bridgeApiEndPoint');
  _bridgeConnection = new Connection(bridgeApiEndPoint);
  // check that access is valid
  const info = await _bridgeConnection.accessInfo();
  if (info?.permissions[0]?.streamId !== '*') {
    internalError('Bridge does not have master permissions', info);
  }
  settings.mainStreamId = config.get('service:bridgeAccountMainStreamId');
  settings.userParentStreamId = settings.mainStreamId + PARENT_USER_STREAM_SUFFIX;
  settings.activeUsersStreamId = settings.userParentStreamId + '-active';
  settings.errorStreamId = settings.mainStreamId + '-errors';
  await ensureBaseStreams();
}

/**
 * Util to get the streamId of a partnerUserId
 */
function getUserParentStreamId () {
  return settings.userParentStreamId;
}

/**
 * Util to get the streamId of a partnerUserId
 */
function streamIdForUserId (partnerUserId) {
  // if partnerUserId is not streamId compliant .. make it lowercase and alpha only.
  return settings.userParentStreamId + '-' + partnerUserId;
}

/**
 * Ensure base structure is created
 */
async function ensureBaseStreams () {
  const apiCalls = [{
    method: 'streams.create',
    params: { parentId: settings.mainStreamId, id: settings.userParentStreamId, name: 'Bridge Users' }
  }, {
    method: 'streams.create',
    params: { parentId: settings.mainStreamId, id: settings.activeUsersStreamId, name: 'Active Bridge Users' }
  }, {
    method: 'streams.create',
    params: { parentId: settings.mainStreamId, id: settings.errorStreamId, name: 'Bridge Errors' }
  }];
  const res = await _bridgeConnection.api(apiCalls);
  const unexpectedErrors = res.filter(r => r.error && r.error.id !== 'item-already-exists');
  if (unexpectedErrors.length > 0) {
    internalError('Failed creating base streams', unexpectedErrors);
  }
}
