/**
 * SampleBridge — demonstrates how to create a bridge using lib-bridge-js.
 * This follows the same pattern as bridge-chartneo.
 */
import { PluginBridge } from "../../src/index.js";
import { init as handleDataInit } from "./methods/handleData.js";
import dataRoute from "./routes/dataRoute.js";
export default class SampleBridge extends PluginBridge {
    get key() {
        return 'sample';
    }
    get potentialCreatedItemKeys() {
        return ['body-weight'];
    }
    async init(app, bridgeConnectionGetter) {
        await super.init(app, bridgeConnectionGetter);
        if (process.env.NODE_ENV !== 'test')
            throw new Error('SampleBridge is only for test purposes');
        await handleDataInit(this);
        app.use('/data/', dataRoute(this));
        this.logger.info('SampleBridge loaded');
    }
    async newUserAssociated(partnerUserId, apiEndPoint) {
        return { dummy: 'Acknowledged by SampleBridge' };
    }
}
//# sourceMappingURL=index.js.map