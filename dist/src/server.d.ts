import type { Application } from 'express';
import type PluginBridge from './lib/PluginBridge.ts';
/**
 * Create a configured Express app with the given plugin.
 * App is a singleton — subsequent calls return the same instance.
 */
declare function createBridgeApp(plugin?: PluginBridge): Promise<Application>;
/**
 * Launch a server instance with the given plugin.
 */
declare function launch(plugin?: PluginBridge): Promise<Application>;
declare const getApp: typeof createBridgeApp;
export { launch, createBridgeApp, getApp };
//# sourceMappingURL=server.d.ts.map