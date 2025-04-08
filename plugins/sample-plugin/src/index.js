const { getLogger } = require('boiler');
const logger = getLogger('plugin-test');

const dataRoute = require('./routes/dataRoute');

// list (in order) async methods to be called.
const initAsyncComponents = [
  require('./methods/handleData').init
];

module.exports = {
  init,
  newUserAssociated
};

/**
 * Must be exposed, called once at boot.
 * Use this to declare your routes.
 * @param {Express.Application} app
 */
async function init (app) {
  if (process.env.NODE_ENV !== 'test') throw new Error('This plugin is only for test purposes');
  // initalize singletons & config
  for (const init of initAsyncComponents) await init();
  app.use('/data/', dataRoute);
  logger.info('Test plugin loaded');
}

/**
 * Called each time a new user user is associated.
 * You may use this to create base streams for you app
 * @returns {Object} - serializable in JSON the result will be returned with the SUCCESS webhook
 */
async function newUserAssociated (partnerUserId, apiEndPoint) {
  // implement your code here
  return { dummy: 'Acknowledged by sample plugin' };
}
