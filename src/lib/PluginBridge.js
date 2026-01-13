const { getLogger, getConfig } = require('boiler');
const errors = require('../errors');
const user = require('../methods/user');
const { logSyncStatus } = require('./bridgeAccount');

/**
 * Utility to be extended by all plugins.
 * The main task is to centralize internals so the structure of
 * bridge-hds can be modified without affecting plugins.
 */
class PluginBridge {
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
   * @property {Array<string>} - array of itemKeys
   */
  get potentialCreatedItemKeys () {
    return [];
  }

  /**
   * private instance of config
   */
  #config;

  /**
   * private instance of bridgeConnectionGetter (form lib/bridgeAccount)
   */
  #bridgeConnectionGetter;

  constructor () {
    this.logger = getLogger('plugin:' + this.key);
    this.errors = errors;
  }

  /**
   * @property {string} - a key unique for your plugin
   */
  get key () {
    throw new Error('Must be implemented');
  }

  /**
   * @property {pryv.Connection} - connection to bridge managing account
   */
  get bridgeConnection () {
    return this.#bridgeConnectionGetter();
  }

  /**
  * Must be exposed, called once at boot.
  * Use this to declare your routes.
  * @param {Express.Application} app
  * @param {Function} bridgeConnectionGetter - to get the current pryv.Connection
  */
  async init (app, bridgeConnectionGetter) {
    if (!app) throw new Error('Missing "app" param');
    if (!bridgeConnectionGetter) throw new Error('Missing "bridgeConnectionGetter" param');
    this.#config = await getConfig();
    this.#bridgeConnectionGetter = bridgeConnectionGetter;
    // perform async initaliazion tasks here
    // load your routes
    // when overriden call init.super()
  }

  /**
   * Called each time a new user user is associated.
   * You may use this to create base streams for you app
   * @param {string} partnerUserId
   * @param {string} apiEndPoint
   * @returns {Object} - serializable in JSON the result will be returned with the SUCCESS webhook
   */
  async newUserAssociated (partnerUserId, apiEndPoint) {
    throw new Error('Must be implemented');
    // returns something
  }

  // --------- toolkit ------------- //

  /**
   * Make user accessible for plugin
   */

  /**
   * Retreive configuration item
   * @param {string} key - path seprated by ":"
   */
  configGet (key) {
    return this.#config.get(key);
  }

  /**
   * Throws Unothorized if call is not comming from partner
   * @param {Express.Request} req
   */
  assertFromPartner (req) {
    errors.assertFromPartner(req);
  }

  /**
   * From a partenerUserId get a pryvConnection and user status
   * @param {String} partnerUserId
   * @returns {StatusAndPryvConnection}
   */
  async getPryvUserConnectionAndStatus (partnerUserId) {
    return user.getPryvConnectionAndStatus(partnerUserId);
  }

  /**
   * Log a successfull synchronization
   * @param partnerUserId {string}
   * @param [time] {number} - EPOCH the time of the synchonization (if null now)
   * @param [content] {Object} - a meaningfull object for the plugin sync status
   */
  async logSyncStatus (partnerUserId, time, content) {
    return logSyncStatus(partnerUserId, time, content);
  }
}

module.exports = PluginBridge;
