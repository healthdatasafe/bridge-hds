import { pryv } from 'hds-lib';
declare const Connection: typeof pryv.Connection;
/**
 * get the active bridge connection
 */
declare function bridgeConnection(): InstanceType<typeof Connection>;
/**
 * Init the bridgeAccount
 */
declare function init(): Promise<void>;
/**
 * Util to get the streamId of active users
 */
declare function getActiveUserStreamId(): string;
/**
 * Util to get the user parent streamId
 */
declare function getUserParentStreamId(): string;
/**
 * Util to get the streamId of a partnerUserId
 */
declare function streamIdForUserId(partnerUserId: string): string;
/**
 * Log error to the bridge account
 */
declare function logErrorOnBridgeAccount(message: string, errorObject?: unknown): Promise<unknown>;
/**
 * Log a successfull synchronization
 */
declare function logSyncStatus(partnerUserId: string, time?: number | null, content?: unknown): Promise<unknown>;
/**
 * Retreive errors on the bridge account
 */
declare function getErrorsOnBridgeAccount(parameters?: Record<string, unknown>): Promise<unknown>;
export { init, bridgeConnection, streamIdForUserId, getUserParentStreamId, getActiveUserStreamId, logErrorOnBridgeAccount, getErrorsOnBridgeAccount, logSyncStatus };
//# sourceMappingURL=bridgeAccount.d.ts.map