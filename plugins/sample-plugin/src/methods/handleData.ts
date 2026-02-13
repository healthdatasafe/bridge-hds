import type PluginBridge from '../../../../src/lib/PluginBridge.ts';

/**
 * singleton of plugin
 */
let plugin: PluginBridge;

const pluginVersion = 0;

const streamIds: { mainUserStreamId: string | null } = {
  mainUserStreamId: null // this is the stream id on userAccount used to store the data
};

/**
 * You may need an init function to load information from the config
 * or others asynchronous tasks
 */
async function init (p: PluginBridge): Promise<void> {
  plugin = p;
  // For this example the first stream of the userPermissionRequest service
  // is the one used to store the data
  const firsStream = (plugin.configGet('service:userPermissionRequest') as any[])[0];
  streamIds.mainUserStreamId = firsStream.streamId;
}

/**
 * Retreive the user, thransform data to events and create them
 * For this example we only add the streamId and the method "events.create"
 */
async function newData (partnerUserId: string, data: Array<{ type: string; content: unknown }>) {
  // will throw error if the user is not found or not active
  const hdsUser = await plugin.getPryvUserConnectionAndStatus(partnerUserId);
  const apiCalls = [];
  // transform data to events
  for (const event of data) {
    apiCalls.push({
      method: 'events.create',
      params: {
        streamIds: [streamIds.mainUserStreamId],
        type: event.type,
        content: event.content
      }
    });
  }
  const result = await hdsUser.connection.api(apiCalls);
  // keep event modified time as syncTime (maybe different for your plugin)
  const syncTime = result[0].event.modified;
  const createdEventId = result[0].event.id;
  // log sync status on next tick
  process.nextTick(() => { plugin.logSyncStatus(partnerUserId, syncTime, { createdEventId, pluginVersion }); });
  return result;
}

export { init, newData };
