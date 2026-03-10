import type { PluginBridge } from '../../../src/index.ts';
/**
 * You may need an init function to load information from the config
 * or others asynchronous tasks
 */
declare function init(p: PluginBridge): Promise<void>;
/**
 * Retreive the user, thransform data to events and create them
 * For this example we only add the streamId and the method "events.create"
 */
declare function newData(partnerUserId: string, data: Array<{
    type: string;
    content: unknown;
}>): Promise<any>;
export { init, newData };
//# sourceMappingURL=handleData.d.ts.map