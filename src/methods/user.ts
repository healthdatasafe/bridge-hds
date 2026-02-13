import { bridgeConnection, streamIdForUserId, getUserParentStreamId, getActiveUserStreamId } from '../lib/bridgeAccount.ts';
import { unkownRessource, serviceError, badRequest } from '../errors/index.ts';
import { pryv } from 'hds-lib';

interface UserInfo {
  active: boolean;
  partnerUserId: string;
  apiEndpoint: string;
  created: number;
  modified: number;
}

interface SyncStatusInfo {
  content: unknown;
  lastSync: number | undefined;
}

interface UserStatus {
  user: UserInfo;
  syncStatus: SyncStatusInfo;
}

interface StatusAndPryvConnection extends UserStatus {
  connection: InstanceType<typeof pryv.Connection>;
}

/**
 * Add user credentials to partner account
 */
async function addCredentialToBridgeAccount (partnerUserId: string, appApiEndpoint: string): Promise<unknown> {
  const streamUserId = streamIdForUserId(partnerUserId);
  const apiCalls = [{
    method: 'streams.create',
    params: { id: streamUserId, parentId: getUserParentStreamId(), name: partnerUserId }
  }, {
    method: 'events.create',
    params: { streamIds: [streamUserId, getActiveUserStreamId()], type: 'credentials/pryv-api-endpoint', content: appApiEndpoint }
  }];
  const result: any = await bridgeConnection().api(apiCalls as any);
  if (result[1]?.error?.id) throw serviceError('Failed add user credentials', result[1]);
  return result[1];
}

async function exists (partnerUserId: string): Promise<boolean> {
  const streamUserId = streamIdForUserId(partnerUserId);
  const apiCalls = [{
    method: 'events.get',
    params: { streams: [streamUserId], limit: 1, types: ['credentials/pryv-api-endpoint'] }
  }];
  const result: any = await bridgeConnection().api(apiCalls as any);
  if (result[0]?.error?.id === 'unknown-referenced-resource') return false;
  return true;
}

/**
 * Get user status
 */
async function status (partnerUserId: string, throwUnkown = true): Promise<UserStatus | null> {
  const streamUserId = streamIdForUserId(partnerUserId);
  const apiCalls = [{
    method: 'events.get',
    params: { streams: [streamUserId], limit: 1, types: ['credentials/pryv-api-endpoint'] }
  }, {
    method: 'events.get',
    params: { streams: [streamUserId], limit: 1, types: ['sync-status/bridge'] }
  }];
  const resultFromBC: any = await bridgeConnection().api(apiCalls as any);
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
  const result: UserStatus = {
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

async function setStatus (partnerUserId: string, active?: boolean): Promise<{ active: boolean }> {
  const streamUserId = streamIdForUserId(partnerUserId);
  const apiCalls = [{
    method: 'events.get',
    params: { streams: [streamUserId], limit: 1, types: ['credentials/pryv-api-endpoint'] }
  }];
  const resultFromBC: any = await bridgeConnection().api(apiCalls as any);
  if (resultFromBC[0]?.error?.id === 'unknown-referenced-resource') unkownRessource('Unkown user', { userId: partnerUserId });
  const error = resultFromBC.error || resultFromBC[1]?.error;
  if (error) serviceError('Failed to get user status', error);
  const userEvent = resultFromBC[0].events[0];
  const currentStatus = userEvent.streamIds.includes(getActiveUserStreamId());
  if (currentStatus === active) return { active: currentStatus };

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
  const resultUpdate: any = await bridgeConnection().api(apiCallsUpdate as any);
  if (resultUpdate[0]?.error?.id === 'unknown-referenced-resource') unkownRessource('Unkown user', { userId: partnerUserId });
  const errorUpdate = resultUpdate.error || resultUpdate[0]?.error;
  if (errorUpdate) serviceError('Failed to get user status', errorUpdate);
  const newActiveStatus = resultUpdate[0].event.streamIds.includes(getActiveUserStreamId());
  return { active: newActiveStatus };
}

/**
 * Pryv API endpoint and status for the user
 */
async function getPryvConnectionAndStatus (partnerUserId: string, includesInactive = false): Promise<StatusAndPryvConnection> {
  const statusResult = await status(partnerUserId);
  if (!statusResult!.user.active && !includesInactive) {
    badRequest('Deactivated User', { userId: partnerUserId });
  }
  const connection = new pryv.Connection(statusResult!.user.apiEndpoint);
  return {
    ...statusResult!,
    connection
  };
}

/**
 * Get all users and their status
 */
async function getAllUsersApiEndpoints (forEachEvent: (event: unknown) => void): Promise<unknown> {
  const now = (new Date()).getTime() / 1000;
  const queryParams = { fromTime: 0, toTime: now, streams: [getUserParentStreamId()], types: ['credentials/pryv-api-endpoint'] };
  return await bridgeConnection().getEventsStreamed(queryParams, forEachEvent);
}

export {
  status,
  exists,
  addCredentialToBridgeAccount,
  getPryvConnectionAndStatus,
  setStatus,
  getAllUsersApiEndpoints
};
