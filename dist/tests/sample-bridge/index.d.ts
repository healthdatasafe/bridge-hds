/**
 * SampleBridge — demonstrates how to create a bridge using lib-bridge-js.
 * This follows the same pattern as bridge-chartneo.
 */
import { PluginBridge } from '../../src/index.ts';
import type { Application } from 'express';
export default class SampleBridge extends PluginBridge {
    get key(): string;
    get potentialCreatedItemKeys(): string[];
    init(app: Application, bridgeConnectionGetter: () => unknown): Promise<void>;
    newUserAssociated(partnerUserId: string, apiEndPoint: string): Promise<{
        dummy: string;
    }>;
}
//# sourceMappingURL=index.d.ts.map