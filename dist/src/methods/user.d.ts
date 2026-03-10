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
declare function addCredentialToBridgeAccount(partnerUserId: string, appApiEndpoint: string): Promise<unknown>;
declare function exists(partnerUserId: string): Promise<boolean>;
/**
 * Get user status
 */
declare function status(partnerUserId: string, throwUnkown?: boolean): Promise<UserStatus | null>;
declare function setStatus(partnerUserId: string, active?: boolean): Promise<{
    active: boolean;
}>;
/**
 * Pryv API endpoint and status for the user
 */
declare function getPryvConnectionAndStatus(partnerUserId: string, includesInactive?: boolean): Promise<StatusAndPryvConnection>;
/**
 * Get all users and their status
 */
declare function getAllUsersApiEndpoints(forEachEvent: (event: unknown) => void): Promise<unknown>;
export { status, exists, addCredentialToBridgeAccount, getPryvConnectionAndStatus, setStatus, getAllUsersApiEndpoints };
//# sourceMappingURL=user.d.ts.map