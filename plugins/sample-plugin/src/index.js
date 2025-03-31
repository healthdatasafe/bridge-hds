const { getLogger } = require('boiler');
const logger = getLogger('plugin-test');

const dataRoute = require('./routes/dataRoute');

module.exports = {
  init
};

async function init (app) {
  if (process.env.NODE_ENV !== 'test') throw new Error('This plugin is only for test purposes');
  logger.info('Test plugin loaded');
  app.use('/data/', dataRoute);
}
