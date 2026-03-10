import boiler from '@pryv/boiler';
import * as errors from "../errors/index.js";
import * as user from "../methods/user.js";
import { logSyncStatus } from "./bridgeAccount.js";
const { getLogger, getConfig } = boiler;
/**
 * Utility to be extended by all plugins.
 * The main task is to centralize internals so the structure of
 * lib-bridge-js can be modified without affecting plugins.
 */
export default class PluginBridge {
    /**
     * Logger, you can call .info(..) .error(...) and .debug(..)
     */
    logger;
    /**
     * set of errors, most usefull are
     * assertFromPartner, unkownRessource, unauthorized, badRequest, internalError
     */
    errors;
    /**
     * returns the data items this plugin is going to create
     * From this permissions will be adjusted
     */
    get potentialCreatedItemKeys() {
        return [];
    }
    /**
     * private instance of config
     */
    #config = null;
    /**
     * private instance of bridgeConnectionGetter (form lib/bridgeAccount)
     */
    #bridgeConnectionGetter = null;
    constructor() {
        this.logger = getLogger('plugin:' + this.key);
        this.errors = errors;
    }
    /**
     * a key unique for your plugin
     */
    get key() {
        throw new Error('Must be implemented');
    }
    /**
     * connection to bridge managing account
     */
    get bridgeConnection() {
        return this.#bridgeConnectionGetter();
    }
    /**
     * Must be exposed, called once at boot.
     * Use this to declare your routes.
     */
    async init(app, bridgeConnectionGetter) {
        if (!app)
            throw new Error('Missing "app" param');
        if (!bridgeConnectionGetter)
            throw new Error('Missing "bridgeConnectionGetter" param');
        this.#config = await getConfig();
        this.#bridgeConnectionGetter = bridgeConnectionGetter;
        // perform async initaliazion tasks here
        // load your routes
        // when overriden call init.super()
    }
    /**
     * Called each time a new user user is associated.
     * You may use this to create base streams for you app
     */
    async newUserAssociated(partnerUserId, apiEndPoint) {
        throw new Error('Must be implemented');
        // returns something
    }
    // --------- toolkit ------------- //
    /**
     * Retreive configuration item
     */
    configGet(key) {
        return this.#config.get(key);
    }
    /**
     * Throws Unothorized if call is not comming from partner
     */
    assertFromPartner(req) {
        errors.assertFromPartner(req);
    }
    /**
     * From a partenerUserId get a pryvConnection and user status
     */
    async getPryvUserConnectionAndStatus(partnerUserId) {
        return user.getPryvConnectionAndStatus(partnerUserId);
    }
    /**
     * Log a successfull synchronization
     */
    async logSyncStatus(partnerUserId, time, content) {
        return logSyncStatus(partnerUserId, time, content);
    }
}
//# sourceMappingURL=PluginBridge.js.map