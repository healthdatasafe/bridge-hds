import type PluginBridge from './PluginBridge.ts';
import type { Application } from 'express';
/**
 * Initialize plugin(s) with the Express app.
 * @param app - Express application
 * @param plugin - Single plugin instance or array of plugins
 */
declare function initWithExpressApp(app: Application, plugin?: PluginBridge | PluginBridge[]): Promise<void>;
/**
 * Get plugin required permissions
 */
declare function requiredPermissionsAndStreams(existingPermissions?: unknown[]): {
    permissions: any[];
    streams: any[];
};
/**
 * Announce new User to plugins
 */
declare function advertiseNewUserToPlugins(partnerUserId: string, apiEndpoint: string): Promise<Record<string, unknown>>;
export { initWithExpressApp, advertiseNewUserToPlugins, requiredPermissionsAndStreams };
//# sourceMappingURL=plugins.d.ts.map