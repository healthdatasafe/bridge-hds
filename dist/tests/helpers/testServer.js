import initBoiler from "../../src/initBoiler.js";
import request from 'supertest';
import ShortUniqueId from 'short-unique-id';
import { getApp } from "../../src/server.js";
import * as pryvService from "../../src/lib/pryvService.js";
import { pryv, initHDSModel } from 'hds-lib';
import * as user from "../../src/methods/user.js";
import { requiredPermissionsAndStreams } from "../../src/lib/plugins.js";
import SampleBridge from "../sample-bridge/index.js";
let app = null;
let config = null;
/**
 * Initalize the server, to be run once before the tests.
 * @param plugin - plugin instance (defaults to sample-plugin for lib-bridge-js tests)
 * @param configDir - optional config directory (for consumer repos)
 */
async function init(plugin, configDir) {
    const { getConfig } = initBoiler(`bridge:${process.pid}`, configDir);
    await initHDSModel();
    config = await getConfig();
    app = await getApp(plugin || new SampleBridge());
    await pryvService.init();
}
/**
 * Get a supertest Request bound to the server app
 */
function apiTest(options) {
    if (app === null)
        throw new Error('Call testServer.init() first');
    return request(app, options);
}
/**
 * Return partner auth Header
 */
function partnerAuth(key) {
    return { authorization: config.get('partnerAuthToken') };
}
/**
 * Shortcut for (await getConfig()).get()
 */
function configGet(key) {
    return config.get(key);
}
/**
 * Create userAccountAndPermission
 */
async function createUserAndPermissions(username, permissions, appId = 'bridge-test-suite', password, email, streams = []) {
    password = password || 'pass_' + username;
    email = email || username + '@hds.bogus';
    const newUser = await pryvService.createuser(username, password, email);
    const personalConnection = new pryv.Connection(newUser.apiEndpoint);
    // -- create streams
    const apiCallStreamCreate = streams.map(s => ({ method: 'streams.create', params: s }));
    await personalConnection.api(apiCallStreamCreate);
    // -- create access
    const accessRequest = {
        method: 'accesses.create',
        params: {
            type: 'app',
            name: appId,
            permissions
        }
    };
    const res = await personalConnection.api([accessRequest]);
    const appApiEndpoint = res[0]?.access?.apiEndpoint;
    const result = {
        username,
        personalApiEndpoint: newUser.apiEndpoint,
        appId,
        appApiEndpoint
    };
    return result;
}
/**
 * Create an onBoardeduser
 */
async function createOnboardedUser() {
    const partnerUserId = (new ShortUniqueId({ dictionary: 'alphanum_lower', length: 18 })).rnd();
    const username = (new ShortUniqueId({ dictionary: 'alphanum_lower', length: 8 })).rnd();
    const { permissions, streams } = requiredPermissionsAndStreams(configGet('service:userPermissionRequest'));
    const appId = configGet('service:appId');
    const result = await createUserAndPermissions(username, permissions, appId, null, null, streams);
    await user.addCredentialToBridgeAccount(partnerUserId, result.appApiEndpoint);
    result.partnerUserId = partnerUserId;
    return result;
}
export { init, apiTest, configGet, pryvService, createUserAndPermissions, createOnboardedUser, partnerAuth, getApp };
//# sourceMappingURL=testServer.js.map