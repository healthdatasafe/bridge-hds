/**
 * Utility to be extended by all plugins.
 * The main task is to centralize internals so the structure of
 * bridge-hds can be modified without affecting plugins.
 */
class PluginBridge {
  /**
   * @property {string} - a key unique for your plugin
   */
  get key () {
    throw new Error('Must be implemented');
  }

  /**
  * Must be exposed, called once at boot.
  * Use this to declare your routes.
  * @param {Express.Application} app
  */
  async init (app) {
    // perform async initaliazion tasks here
    // load your routes
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
}

module.exports = PluginBridge;
