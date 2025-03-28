const { bridgeConnection, streamIdForUserId, USERS_STREAM_ID } = require('../lib/bridgeAccount');
const { unkownRessource, internalError } = require('../errors');

module.exports = {
  status,
  exists,
  addCredentialToBridgeAccount
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
    params: { id: streamUserId, parentId: USERS_STREAM_ID, name: partnerUserId }
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
 * @property {boolean} active
 * @property {number} [lastSync] - EPOCH time in seconds
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
