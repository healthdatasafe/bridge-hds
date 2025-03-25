const { getLogger, getConfig } = require('boiler');
const logger = getLogger('server');

const path = require('path');
const express = require('express');
const cors = require('cors');

const pryvService = require('./lib/pryvService');
const bridgeAccount = require('./lib/bridgeAccount');

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
  // init pryv service singleton
  await pryvService.init();
  // init bridge singleton
  await bridgeAccount.init();

  app = express();

  app.use(cors());
  app.use(express.json());

  // keep first
  app.use(loggerMiddleware);

  // static ressource are temporary until handled by externall apps.
  app.use('/static', express.static(path.resolve(__dirname, 'static')));

  app.use('/user', userRouter);

  // ------------ must be last ------- //
  app.use(expressErrorHandler);
  return app;
}

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

module.exports = { launch, getApp };
