import { HDSService } from 'hds-lib';
/**
 * Get current HDSService service
 */
declare function service(): InstanceType<typeof HDSService>;
/**
 * Initialize Pryv service from config and creates a singleton
 * accessible via service()
 */
declare function init(): Promise<unknown>;
interface CreateUserResult {
    apiEndpoint: string;
    username: string;
    password: string;
}
/**
 * Create a user on Pryv.io
 */
declare function createuser(username: string | null, password: string | null, email: string | null): Promise<CreateUserResult>;
/**
 * Utility to check if a user exists on a Pryv pltafom
 */
declare function userExists(userId: string): Promise<boolean>;
export { init, userExists, createuser, service };
//# sourceMappingURL=pryvService.d.ts.map