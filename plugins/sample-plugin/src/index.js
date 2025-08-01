const PluginBridge = require('../../../src/lib/PluginBridge');

// list (in order) async methods to be called.
const initAsyncComponents = [
  require('./methods/handleData').init
];

class PluginSample extends PluginBridge {
  /**
   * @property {string} - a key unique for your plugin
   */
  get key () {
    return 'sample';
  }

  /**
   * returns the data items this plugin is going to create
   * From this permissions will be adjusted
   * @property {Array<string>} - array of itemKeys
   */
  get potentialCreatedItemKeys () {
    return ['body-weight'];
  }

  /**
   * Must be exposed, called once at boot.
   * Use this to declare your routes.
   * @param {Express.Application} app
   */
  async init (app) {
    await super.init(); // keep await super.init();
    if (process.env.NODE_ENV !== 'test') throw new Error('This plugin is only for test purposes');
    // initalize singletons & config
    for (const init of initAsyncComponents) await init(this);
    // initialize data route with plugin as reference to expose toolkit.
    const dataRoute = require('./routes/dataRoute')(this);
    app.use('/data/', dataRoute);
    this.logger.info('Test plugin loaded');
  }

  /**
 * Called each time a new user user is associated.
 * You may use this to create base streams for you app
 * @returns {Object} - serializable in JSON the result will be returned with the SUCCESS webhook
 */
  async newUserAssociated (partnerUserId, apiEndPoint) {
  // implement your code here
    return { dummy: 'Acknowledged by sample plugin' };
  }
}

module.exports = PluginSample;
