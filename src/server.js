const { getLogger, getConfig } = require('boiler');
const logger = getLogger('server');

const path = require('path');
const express = require('express');
const cors = require('cors');

const checkAuth = require('./middlewares/checkAuth');

// list (in order) async methods to be called.
const initAsyncComponents = [
  require('./lib/pryvService').init,
  require('./lib/bridgeAccount').init,
  require('./methods/onboard').init,
  checkAuth.init
];

const plugins = require('./lib/plugins');

const accountRouter = require('./routes/accountRoute');
const userRouter = require('./routes/userRoute');
const { expressErrorHandler } = require('./errors');
const loggerMiddleware = require('./middlewares/logger');

/**
 * @type {Express.Application}
 */
let app = null;

/**
 * App is a singleton
 * getApp either initalize the application or return the active one
 * @returns {Express.Application}
 */
async function getApp () {
  if (app != null) return app;
  // initalize singletons & configs
  for (const init of initAsyncComponents) {
    await init();
  }

  app = express();

  app.use(cors());
  app.use(express.json());

  // keep first
  app.use(loggerMiddleware);
  app.use(checkAuth.checkIfPartner);

  // static ressource are temporary until handled by externall apps.
  app.use('/static', express.static(path.resolve(__dirname, 'static')));
  app.use('/account', accountRouter);
  app.use('/user', userRouter);

  // init plugins
  await plugins.initWithExpressApp(app);

  // ------------ must be last ------- //
  app.use(expressErrorHandler);
  return app;
}

/* c8 ignore start - Cannot be tested with supertest */
/**
 * Launch a server instance
 * @returns {Express.Application}
 */
async function launch () {
  const app = await getApp();
  const configServer = (await getConfig()).get('server');
  const port = configServer.port || 7432;
  const host = configServer.host || '127.0.0.1';
  await app.listen(port, host);
  logger.info(`Listening ${host} on port ${port} in mode ${app.get('env')}`);
  return app;
}
/* c8 ignore start */

module.exports = { launch, getApp };
