const { bridgeConnection, streamIdForUserId, getUserParentStreamId } = require('../lib/bridgeAccount');
const { unkownRessource, internalError } = require('../errors');
const pryv = require('pryv');

module.exports = {
  status,
  exists,
  addCredentialToBridgeAccount,
  getPryvConnectionAndStatus
};

/**
 * Add user credentials to partner account
 * @param {string} partnerUserId
 * @param {string} appApiEndpoint
 * @returns {Event} - the created event content
 */
async function addCredentialToBridgeAccount (partnerUserId, appApiEndpoint) {
  const streamUserId = streamIdForUserId(partnerUserId);
  const apiCalls = [{
    method: 'streams.create',
    params: { id: streamUserId, parentId: getUserParentStreamId(), name: partnerUserId }
  }, {
    method: 'events.create',
    params: { streamIds: [streamUserId], type: 'credentials/pryv-api-endpoint', content: appApiEndpoint }
  }];
  const result = await bridgeConnection().api(apiCalls);
  if (result[1]?.error?.id) throw internalError('Failed add user credentials', result[1]);
  return result[1];
}

async function exists (partnerUserId) {
  const streamUserId = streamIdForUserId(partnerUserId);
  const apiCalls = [{
    method: 'events.get',
    params: { streams: [streamUserId], limit: 1, types: ['credentials/pryv-api-endpoint'] }
  }];
  const result = await bridgeConnection().api(apiCalls);
  if (result[0]?.error?.id === 'unknown-referenced-resource') return false;
  return true;
}

/**
 * @typedef {UserStatus}
 * @property {Object} user
 * @property {boolean} user.active
 * @property {string} user.partnerUserId
 * @property {string} user.apiEndpoint
 * @property {number} user.created - EPOCH time in seconds
 * @property {number} user.modified - EPOCH time in seconds
 * @property {Object} [syncStatus]
 * @property {Object} syncStatus.content
 * @property {number} syncStatus.lastSync - EPOCH time in seconds
 */

/**
 * Get user status
 * @returns {UserStatus}
 * @throws 400 Unkown User
 */
async function status (partnerUserId) {
  const streamUserId = streamIdForUserId(partnerUserId);
  const apiCalls = [{
    method: 'events.get',
    params: { streams: [streamUserId], limit: 1, types: ['credentials/pryv-api-endpoint'] }
  }, {
    method: 'events.get',
    params: { streams: [streamUserId], limit: 1, types: ['sync-status/bridge'] }
  }];
  const resultFromBC = await bridgeConnection().api(apiCalls);
  if (resultFromBC[0]?.error?.id === 'unknown-referenced-resource') unkownRessource('Unkown user', { userId: partnerUserId });
  const userEvent = resultFromBC[0].events[0];
  const syncEvent = resultFromBC[1].events[0];
  const result = {
    user: {
      active: true,
      partnerUserId,
      apiEndpoint: userEvent.content,
      created: userEvent.created,
      modified: userEvent.modified
    },
    syncStatus: {
      content: syncEvent?.content,
      lastSync: syncEvent?.created
    }
  };
  return result;
}

/**
 * @typedef {Object} StatusAndPryvConnection
 * @augments UserStatus
 * @property {connection} connection
 */

/**
 * Pryv API endpoint and status for the user
 * @param {string} partnerUserId
 * @returns {StatusAndPryvConnection}
 */
async function getPryvConnectionAndStatus (partnerUserId) {
  const statusResult = await status(partnerUserId);
  const connection = new pryv.Connection(statusResult.user.apiEndpoint);
  return {
    ...statusResult,
    connection
  };
}
