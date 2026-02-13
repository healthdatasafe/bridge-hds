import PluginBridge from '../../../src/lib/PluginBridge.ts';
import { init as handleDataInit } from './methods/handleData.ts';
import type { Application } from 'express';

export default class PluginSample extends PluginBridge {
  /**
   * @property {string} - a key unique for your plugin
   */
  override get key () {
    return 'sample';
  }

  /**
   * returns the data items this plugin is going to create
   * From this permissions will be adjusted
   * @property {Array<string>} - array of itemKeys
   */
  override get potentialCreatedItemKeys () {
    return ['body-weight'];
  }

  /**
   * Must be exposed, called once at boot.
   * Use this to declare your routes.
   */
  override async init (app: Application, bridgeConnectionGetter: () => unknown) {
    await super.init(app, bridgeConnectionGetter); // keep await super.init();
    if (process.env.NODE_ENV !== 'test') throw new Error('This plugin is only for test purposes');
    // initalize singletons & config
    await handleDataInit(this);
    // initialize data route with plugin as reference to expose toolkit.
    const dataRouteModule: any = await import('./routes/dataRoute.ts');
    const dataRoute = dataRouteModule.default;
    app.use('/data/', dataRoute(this));
    this.logger.info('Test plugin loaded');
  }

  /**
   * Called each time a new user user is associated.
   * You may use this to create base streams for you app
   * @returns {Object} - serializable in JSON the result will be returned with the SUCCESS webhook
   */
  override async newUserAssociated (partnerUserId: string, apiEndPoint: string) {
    // implement your code here
    return { dummy: 'Acknowledged by sample plugin' };
  }
}
