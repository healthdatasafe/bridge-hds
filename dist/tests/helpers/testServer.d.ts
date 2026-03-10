import request from 'supertest';
import { getApp } from '../../src/server.ts';
import * as pryvService from '../../src/lib/pryvService.ts';
import type PluginBridge from '../../src/lib/PluginBridge.ts';
/**
 * Initalize the server, to be run once before the tests.
 * @param plugin - plugin instance (defaults to sample-plugin for lib-bridge-js tests)
 * @param configDir - optional config directory (for consumer repos)
 */
declare function init(plugin?: PluginBridge, configDir?: string): Promise<void>;
/**
 * Get a supertest Request bound to the server app
 */
declare function apiTest(options?: Record<string, unknown>): import("supertest/lib/agent.js")<request.SuperTestStatic.Test>;
/**
 * Return partner auth Header
 */
declare function partnerAuth(key?: string): {
    authorization: string;
};
/**
 * Shortcut for (await getConfig()).get()
 */
declare function configGet<T = any>(key: string): T;
/**
 * Create userAccountAndPermission
 */
declare function createUserAndPermissions(username: string, permissions: Array<Record<string, unknown>>, appId?: string, password?: string | null, email?: string | null, streams?: Array<Record<string, unknown>>): Promise<{
    username: string;
    personalApiEndpoint: string;
    appId: string;
    appApiEndpoint: any;
}>;
/**
 * Create an onBoardeduser
 */
declare function createOnboardedUser(): Promise<{
    username: string;
    personalApiEndpoint: string;
    appId: string;
    appApiEndpoint: any;
} & {
    partnerUserId: string;
}>;
export { init, apiTest, configGet, pryvService, createUserAndPermissions, createOnboardedUser, partnerAuth, getApp };
//# sourceMappingURL=testServer.d.ts.map