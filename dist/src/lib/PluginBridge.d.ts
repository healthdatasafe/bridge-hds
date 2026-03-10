import type { Logger } from '@pryv/boiler';
import type { Application } from 'express';
import * as errors from '../errors/index.ts';
/**
 * Utility to be extended by all plugins.
 * The main task is to centralize internals so the structure of
 * lib-bridge-js can be modified without affecting plugins.
 */
export default class PluginBridge {
    #private;
    /**
     * Logger, you can call .info(..) .error(...) and .debug(..)
     */
    logger: Logger;
    /**
     * set of errors, most usefull are
     * assertFromPartner, unkownRessource, unauthorized, badRequest, internalError
     */
    errors: typeof errors;
    /**
     * returns the data items this plugin is going to create
     * From this permissions will be adjusted
     */
    get potentialCreatedItemKeys(): string[];
    constructor();
    /**
     * a key unique for your plugin
     */
    get key(): string;
    /**
     * connection to bridge managing account
     */
    get bridgeConnection(): unknown;
    /**
     * Must be exposed, called once at boot.
     * Use this to declare your routes.
     */
    init(app: Application, bridgeConnectionGetter: () => unknown): Promise<void>;
    /**
     * Called each time a new user user is associated.
     * You may use this to create base streams for you app
     */
    newUserAssociated(partnerUserId: string, apiEndPoint: string): Promise<unknown>;
    /**
     * Retreive configuration item
     */
    configGet(key: string): any;
    /**
     * Throws Unothorized if call is not comming from partner
     */
    assertFromPartner(req: unknown): void;
    /**
     * From a partenerUserId get a pryvConnection and user status
     */
    getPryvUserConnectionAndStatus(partnerUserId: string): Promise<any>;
    /**
     * Log a successfull synchronization
     */
    logSyncStatus(partnerUserId: string, time: number | null, content: unknown): Promise<unknown>;
    /**
     * Store a value in the shared cluster cache.
     * Shared across all workers in cluster mode.
     */
    cacheSet(key: string, value: unknown, ttlMs?: number): Promise<void>;
    /**
     * Get a value from the shared cluster cache.
     */
    cacheGet<T = unknown>(key: string): Promise<T | undefined>;
    /**
     * Delete a value from the shared cluster cache.
     */
    cacheDel(key: string): Promise<void>;
}
//# sourceMappingURL=PluginBridge.d.ts.map