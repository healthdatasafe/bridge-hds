import boiler from '@pryv/boiler';
import { initHDSModel, getHDSModel } from 'hds-lib';
import { bridgeConnection } from "./bridgeAccount.js";
const { getLogger } = boiler;
let _logger = null;
function logger() { return _logger || (_logger = getLogger('plugins')); }
let plugins = [];
/**
 * Initialize plugin(s) with the Express app.
 * @param app - Express application
 * @param plugin - Single plugin instance or array of plugins
 */
async function initWithExpressApp(app, plugin) {
    await initHDSModel();
    if (plugin) {
        plugins = Array.isArray(plugin) ? plugin : [plugin];
    }
    for (const p of plugins) {
        await p.init(app, bridgeConnection);
        logger().info(`Loaded plugin: ${p.key}`);
    }
}
/**
 * Get plugin required permissions
 */
function requiredPermissionsAndStreams(existingPermissions = []) {
    const itemKeys = new Set();
    for (const plugin of plugins) {
        plugin.potentialCreatedItemKeys.forEach(itemKey => itemKeys.add(itemKey));
    }
    const itemKeysArray = [...itemKeys];
    const streams = getHDSModel().streams.getNecessaryListForItems(itemKeysArray);
    const permissions = getHDSModel().authorizations.forItemKeys(itemKeysArray, { defaultLevel: 'manage', preRequest: existingPermissions });
    return { permissions, streams };
}
/**
 * Announce new User to plugins
 */
async function advertiseNewUserToPlugins(partnerUserId, apiEndpoint) {
    const result = {};
    for (const plugin of plugins) {
        try {
            const pluginResult = await plugin.newUserAssociated(partnerUserId, apiEndpoint);
            result[plugin.key] = pluginResult;
        }
        catch (e) {
            logger().error(e);
            result[plugin.key] = { error: e.message };
        }
    }
    return result;
}
export { initWithExpressApp, advertiseNewUserToPlugins, requiredPermissionsAndStreams };
//# sourceMappingURL=plugins.js.map