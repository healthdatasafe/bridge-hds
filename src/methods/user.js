const { bridgeConnection, streamIdForUserId } = require('../lib/bridgeAccount');
const { unkownRessource } = require('../errors');

module.exports = {
  status
};

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
  const result = await bridgeConnection().api(apiCalls);
  if (result[0]?.error?.id === 'unknown-referenced-resource') unkownRessource('Unkown user', { userId: partnerUserId });
  return result;
}
