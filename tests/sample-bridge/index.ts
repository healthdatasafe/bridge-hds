/**
 * SampleBridge — demonstrates how to create a bridge using lib-bridge-js.
 * This follows the same pattern as bridge-chartneo.
 */
import { PluginBridge } from '../../src/index.ts';
import { init as handleDataInit } from './methods/handleData.ts';
import dataRoute from './routes/dataRoute.ts';
import type { Application } from 'express';

export default class SampleBridge extends PluginBridge {
  override get key () {
    return 'sample';
  }

  override get potentialCreatedItemKeys () {
    return ['body-weight'];
  }

  override async init (app: Application, bridgeConnectionGetter: () => unknown) {
    await super.init(app, bridgeConnectionGetter);
    if (process.env.NODE_ENV !== 'test') throw new Error('SampleBridge is only for test purposes');
    await handleDataInit(this);
    app.use('/data/', dataRoute(this));
    this.logger.info('SampleBridge loaded');
  }

  override async newUserAssociated (partnerUserId: string, apiEndPoint: string) {
    return { dummy: 'Acknowledged by SampleBridge' };
  }
}
