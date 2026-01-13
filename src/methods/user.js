const { bridgeConnection, streamIdForPartnerUserId, getPartnerUserParentStreamId, getActiveUserStreamId, streamIdForHDSUsername, getHDSUserParentStreamId, partnerUserIdFromStreamIds } = require('../lib/bridgeAccount');
const { unkownRessource, serviceError, badRequest } = require('../errors');
const { pryv } = require('hds-lib');

module.exports = {
  statusForPartnerUserId,
  statusForHDSUsername,
  exists,
  addCredentialToBridgeAccount,
  getPryvConnectionAndStatus,
  setStatusForPartnerUserId,
  getAllUsersApiEndpoints
};

/**
 * Add user credentials to partner account
 * @param {string} partnerUserId
 * @param {string} appApiEndpoint
 * @returns {Event} - the created event content
 */
async function addCredentialToBridgeAccount (partnerUserId, appApiEndpoint) {
  // check apiEndpoint status for username
  const hdsConnection = new pryv.Connection(appApiEndpoint);
  const accessInfo = await hdsConnection.accessInfo();
  const hdsUsername = accessInfo?.user?.username;
  if (hdsUsername == null) throw serviceError('Failed getting username from accessInfo', { accessInfo });

  // create event
  const streamPartnerUserId = streamIdForPartnerUserId(partnerUserId);
  const streamHDSUsername = streamIdForHDSUsername(hdsUsername);
  const apiCalls = [{
    method: 'streams.create',
    params: { id: streamPartnerUserId, parentId: getPartnerUserParentStreamId(), name: partnerUserId }
  }, {
    method: 'streams.create',
    params: { id: streamHDSUsername, parentId: getHDSUserParentStreamId(), name: hdsUsername }
  }, {
    method: 'events.create',
    params: { streamIds: [streamPartnerUserId, streamHDSUsername, getActiveUserStreamId()], type: 'credentials/pryv-api-endpoint', content: appApiEndpoint }
  }];
  const result = await bridgeConnection().api(apiCalls);
  if (result[1]?.error?.id) throw serviceError('Failed add user credentials', result[1]);
  return result[1];
}

async function exists (partnerUserId) {
  const streamUserId = streamIdForPartnerUserId(partnerUserId);
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
 * @param {string} partnerUserId
 * @param {boolean} [throwUnkown=true] - if truethrow an error, otherwise return null
 * @returns {UserStatus|null}
 * @throws 404 Unkown User
 */
async function statusForPartnerUserId (partnerUserId, throwUnkown = true) {
  const streamUserId = streamIdForPartnerUserId(partnerUserId);
  const apiCalls = [{
    method: 'events.get',
    params: { streams: [streamUserId], limit: 1, types: ['credentials/pryv-api-endpoint'] }
  }, {
    method: 'events.get',
    params: { streams: [streamUserId], limit: 1, types: ['sync-status/bridge'] }
  }];
  const resultFromBC = await bridgeConnection().api(apiCalls);
  if (resultFromBC[0]?.error?.id === 'unknown-referenced-resource') {
    if (throwUnkown) {
      unkownRessource('Unkown user', { userId: partnerUserId });
    }
    return null;
  }
  const error = resultFromBC.error || resultFromBC[1]?.error || resultFromBC[1]?.error;
  if (error) serviceError('Failed to get user status', error);
  const userEvent = resultFromBC[0].events[0];
  const syncEvent = resultFromBC[1].events[0];
  if (userEvent == null) {
    if (throwUnkown) {
      unkownRessource('Unkown user', { userId: partnerUserId });
    }
    return null;
  }
  const result = {
    user: {
      active: userEvent.streamIds.includes(getActiveUserStreamId()),
      partnerUserId,
      apiEndpoint: userEvent.content,
      created: userEvent.created,
      modified: userEvent.modified
    },
    syncStatus: {
      content: syncEvent?.content,
      lastSync: syncEvent?.time
    }
  };
  return result;
}

/**
 * Get user status
 * @param {string} hdsUsername
 * @param {boolean} [throwUnkown=true] - if truethrow an error, otherwise return null
 * @returns {UserStatus|null}
 * @throws 404 Unkown User
 */
async function statusForHDSUsername (hdsUsername, throwUnkown = true) {
  const streamUsername = streamIdForHDSUsername(hdsUsername);
  const apiCalls = [{
    method: 'events.get',
    params: { streams: [streamUsername], limit: 1, types: ['credentials/pryv-api-endpoint'] }
  }];
  const resultFromBC = await bridgeConnection().api(apiCalls);
  if (resultFromBC[0]?.error?.id === 'unknown-referenced-resource') {
    if (throwUnkown) {
      unkownRessource('Unkown user', { username: hdsUsername });
    }
    return null;
  }
  const error = resultFromBC.error || resultFromBC[1]?.error || resultFromBC[1]?.error;
  if (error) serviceError('Failed to get user status', error);
  const userEvent = resultFromBC[0].events[0];
  if (userEvent == null) {
    if (throwUnkown) {
      unkownRessource('Unkown user', { userId: hdsUsername });
    }
    return null;
  }
  // get partnerUserId from streamId
  const partnerUserId = partnerUserIdFromStreamIds(userEvent.streamIds);

  const result = {
    user: {
      active: userEvent.streamIds.includes(getActiveUserStreamId()),
      partnerUserId,
      apiEndpoint: userEvent.content,
      created: userEvent.created,
      modified: userEvent.modified
    },
    syncStatus: { }
  };
  return result;
}

async function setStatusForPartnerUserId (partnerUserId, active) {
  const streamPartnerUserId = streamIdForPartnerUserId(partnerUserId);
  const apiCalls = [{
    method: 'events.get',
    params: { streams: [streamPartnerUserId], limit: 1, types: ['credentials/pryv-api-endpoint'] }
  }];
  const resultFromBC = await bridgeConnection().api(apiCalls);
  if (resultFromBC[0]?.error?.id === 'unknown-referenced-resource') unkownRessource('Unkown user', { userId: partnerUserId });
  const error = resultFromBC.error || resultFromBC[1]?.error;
  if (error) serviceError('Failed to get user status', error);
  const userEvent = resultFromBC[0].events[0];
  const currentStatus = userEvent.streamIds.includes(getActiveUserStreamId());
  if (currentStatus === active) return { active };

  // change streams
  const newStreamIds = [...userEvent.streamIds];
  if (active) {
    newStreamIds.push(getActiveUserStreamId());
  } else {
    const index = newStreamIds.indexOf(getActiveUserStreamId());
    if (index > -1) newStreamIds.splice(index, 1);
  }
  const apiCallsUpdate = [{
    method: 'events.update',
    params: {
      id: userEvent.id,
      update: {
        streamIds: newStreamIds
      }
    }
  }];
  const resultUpdate = await bridgeConnection().api(apiCallsUpdate);
  if (resultUpdate[0]?.error?.id === 'unknown-referenced-resource') unkownRessource('Unkown user', { userId: partnerUserId });
  const errorUpdate = resultUpdate.error || resultUpdate[0]?.error;
  if (errorUpdate) serviceError('Failed to get user status', errorUpdate);
  const newActiveStatus = resultUpdate[0].event.streamIds.includes(getActiveUserStreamId());
  return { active: newActiveStatus };
}

/**
 * @typedef {Object} StatusAndPryvConnection
 * @augments UserStatus
 * @property {connection} connection
 */

/**
 * Pryv API endpoint and status for the user
 * @param {string} partnerUserId
 * @param {boolean} [includesInactive=false] - if true, include inactive users
 * @returns {StatusAndPryvConnection}
 * @throws 404 Unkown User
 * @throws 400 Deactivated User - if includesInactive is false & user is deactivated
 */
async function getPryvConnectionAndStatus (partnerUserId, includesInactive = false) {
  const statusResult = await statusForPartnerUserId(partnerUserId);
  if (!statusResult.user.active && !includesInactive) {
    badRequest('Deactivated User', { userId: partnerUserId });
  }
  const connection = new pryv.Connection(statusResult.user.apiEndpoint);
  return {
    ...statusResult,
    connection
  };
}

/**
 * Get all users and their status
 * @param {callback} forEachEvent - called for Each event
 */
async function getAllUsersApiEndpoints (forEachEvent) {
  const now = (new Date()).getTime() / 1000;
  const queryParams = { fromTime: 0, toTime: now, streams: [getPartnerUserParentStreamId()], types: ['credentials/pryv-api-endpoint'] };
  return await bridgeConnection().getEventsStreamed(queryParams, forEachEvent);
}
