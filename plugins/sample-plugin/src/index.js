const { getLogger } = require('boiler');
const logger = getLogger('plugin-test');

const dataRoute = require('./routes/dataRoute');

// list (in order) async methods to be called.
const initAsyncComponents = [
  require('./methods/handleData').init
];

module.exports = {
  init
};

async function init (app) {
  if (process.env.NODE_ENV !== 'test') throw new Error('This plugin is only for test purposes');
  // initalize singletons & config
  for (const init of initAsyncComponents) await init();
  app.use('/data/', dataRoute);
  logger.info('Test plugin loaded');
}
