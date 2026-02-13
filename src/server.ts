import boiler from 'boiler';
import path from 'path';
import { createRequire } from 'module';
import express from 'express';
import type { Application } from 'express';
import cors from 'cors';

import { init as pryvServiceInit } from './lib/pryvService.ts';
import { init as bridgeAccountInit } from './lib/bridgeAccount.ts';
import { init as onboardInit } from './methods/onboard.ts';
import * as checkAuth from './middlewares/checkAuth.ts';
import * as plugins from './lib/plugins.ts';
import accountRouter from './routes/accountRoute.ts';
import userRouter from './routes/userRoute.ts';
import { expressErrorHandler } from './errors/index.ts';
import loggerMiddleware from './middlewares/logger.ts';

const { getLogger, getConfig } = boiler;
let _logger: ReturnType<typeof getLogger> | null = null;
function logger () { return _logger || (_logger = getLogger('server')); }

const require = createRequire(import.meta.url);

// list (in order) async methods to be called.
const initAsyncComponents = [
  pryvServiceInit,
  bridgeAccountInit,
  onboardInit,
  checkAuth.init
];

let app: Application | null = null;

/**
 * App is a singleton
 * getApp either initalize the application or return the active one
 */
async function getApp (): Promise<Application> {
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
  app.use('/static', express.static(path.resolve(import.meta.dirname, 'static')));
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
 */
async function launch (): Promise<Application> {
  const currentApp = await getApp();
  const config = await getConfig();
  const configServer = config.get<{ port?: number; host?: string }>('server');
  const port = configServer.port || 7432;
  if (process.env.BACKLOOP) {
    const https = await import('https');
    const { httpsOptionsPromise } = require('backloop.dev');
    const httpsOptions = await httpsOptionsPromise();
    https.createServer(httpsOptions, currentApp).listen(port);
    config.set('baseURL', 'https://mira.backloop.dev:' + port);
  } else {
    const host = configServer.host || '127.0.0.1';
    await new Promise<void>((resolve) => { currentApp.listen(port, host, resolve); });
    logger().info(`Listening ${host} on port ${port} in mode ${currentApp.get('env')}`);
  }
  return currentApp;
}
/* c8 ignore stop */

export { launch, getApp };
