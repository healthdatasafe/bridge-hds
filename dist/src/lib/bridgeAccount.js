/**
 * Manage the bridge connection and interaction
 */
import boiler from '@pryv/boiler';
import { pryv } from 'hds-lib';
import { internalError, serviceError } from "../errors/index.js";
const { getConfig, getLogger } = boiler;
let _logger = null;
function logger() { return _logger || (_logger = getLogger('bridgeAccount')); }
const { Connection } = pryv;
/** the connection to pryv bridge account */
let _bridgeConnection = null;
/** Will prefix all users' streamsId  */
const PARENT_USER_STREAM_SUFFIX = '-users';
const settings = {
    mainStreamId: null,
    userParentStreamId: null,
    activeUsersStreamId: null,
    errorStreamId: null
};
/**
 * get the active bridge connection
 */
function bridgeConnection() {
    if (!_bridgeConnection)
        throw new Error('Init bridgeAccount first');
    return _bridgeConnection;
}
/**
 * Init the bridgeAccount
 */
async function init() {
    if (_bridgeConnection)
        return;
    const config = await getConfig();
    const bridgeApiEndPoint = config.get('bridgeApiEndPoint');
    _bridgeConnection = new Connection(bridgeApiEndPoint);
    // check that access is valid
    const info = await _bridgeConnection.accessInfo();
    if (info?.permissions[0]?.streamId !== settings.mainStreamId &&
        info?.permissions[0]?.level !== 'manage') {
        internalError(`Bridge does not have "manage" permissions on stream ${settings.mainStreamId}`, info);
    }
    settings.mainStreamId = config.get('service:bridgeAccountMainStreamId');
    settings.userParentStreamId = settings.mainStreamId + PARENT_USER_STREAM_SUFFIX;
    settings.activeUsersStreamId = settings.userParentStreamId + '-active';
    settings.errorStreamId = settings.mainStreamId + '-errors';
    await ensureBaseStreams();
}
/**
 * Util to get the streamId of active users
 */
function getActiveUserStreamId() {
    return settings.activeUsersStreamId;
}
/**
 * Util to get the user parent streamId
 */
function getUserParentStreamId() {
    return settings.userParentStreamId;
}
/**
 * Util to get the streamId of a partnerUserId
 */
function streamIdForUserId(partnerUserId) {
    // if partnerUserId is not streamId compliant .. make it lowercase and alpha only.
    return settings.userParentStreamId + '-' + partnerUserId;
}
/**
 * Ensure base structure is created
 */
async function ensureBaseStreams() {
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
    const unexpectedErrors = res.filter((r) => r.error && r.error.id !== 'item-already-exists');
    if (unexpectedErrors.length > 0) {
        serviceError('Failed creating base streams', unexpectedErrors);
    }
}
/**
 * Log error to the bridge account
 */
async function logErrorOnBridgeAccount(message, errorObject = {}) {
    const params = {
        type: 'error/message-object',
        streamIds: [settings.errorStreamId],
        content: {
            message,
            errorObject
        }
    };
    return await createSingleEvent(params, 'logging error');
}
/**
 * Log a successfull synchronization
 */
async function logSyncStatus(partnerUserId, time = null, content = null) {
    const userStreamId = streamIdForUserId(partnerUserId);
    const params = {
        type: 'sync-status/bridge',
        streamIds: [userStreamId],
        content
    };
    if (time != null)
        params.time = time;
    return await createSingleEvent(params, 'creating log status');
}
/**
 * Retreive errors on the bridge account
 */
async function getErrorsOnBridgeAccount(parameters = {}) {
    const params = Object.assign({
        streams: [settings.errorStreamId],
        types: ['error/message-object']
    }, parameters);
    const res = await _bridgeConnection.api([{
            method: 'events.get',
            params
        }]);
    if (res.error || !res[0]?.events) {
        return res;
    }
    return res[0].events;
}
/**
 * Helper - create a single event, returns it's content of an error
 */
async function createSingleEvent(params, messageOnError = 'creating event') {
    const apiCalls = [{
            method: 'events.create',
            params
        }];
    try {
        const res = await _bridgeConnection.api(apiCalls);
        if (res[0].error || !res[0].event) {
            logger().error(`Failed ${messageOnError} on bridge account result:`, res);
            return res;
        }
        return res[0]?.event;
    }
    catch (e) {
        logger().error(`Failed  ${messageOnError} on bridge account error:`, e);
        return e;
    }
}
export { init, bridgeConnection, streamIdForUserId, getUserParentStreamId, getActiveUserStreamId, logErrorOnBridgeAccount, getErrorsOnBridgeAccount, logSyncStatus };
//# sourceMappingURL=bridgeAccount.js.map