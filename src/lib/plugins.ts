import fs from 'fs';
import path from 'path';
import boiler from 'boiler';
import { initHDSModel, getHDSModel } from 'hds-lib';
import { bridgeConnection } from './bridgeAccount.ts';
import type PluginBridge from './PluginBridge.ts';
import type { Application } from 'express';

const { getLogger } = boiler;
let _logger: ReturnType<typeof getLogger> | null = null;
function logger () { return _logger || (_logger = getLogger('plugins')); }

let plugins: PluginBridge[] = [];

/**
 * Initialized plugins
 */
async function initWithExpressApp (app: Application): Promise<void> {
  await initHDSModel();
  plugins = await loadPluginsModules();
  for (const plugin of plugins) {
    await plugin.init(app, bridgeConnection);
    logger().info(`Loaded plugin: ${plugin.key}`);
  }
}

/**
 * Get plugin required permissions
 */
function requiredPermissionsAndStreams (existingPermissions: unknown[] = []): { permissions: any[]; streams: any[] } {
  // get the list of required Items
  const itemKeys = new Set<string>();
  for (const plugin of plugins) {
    plugin.potentialCreatedItemKeys.forEach(itemKey => itemKeys.add(itemKey));
  }
  //
  const itemKeysArray = [...itemKeys];
  const streams = getHDSModel().streams.getNecessaryListForItems(itemKeysArray);
  const permissions = getHDSModel().authorizations.forItemKeys(itemKeysArray, { defaultLevel: 'manage', preRequest: existingPermissions as any });
  return { permissions, streams };
}

/**
 * Announce new User to plugins
 */
async function advertiseNewUserToPlugins (partnerUserId: string, apiEndpoint: string): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  for (const plugin of plugins) {
    try { // do not fail but pass the error to the webhook
      const pluginResult = await plugin.newUserAssociated(partnerUserId, apiEndpoint);
      result[plugin.key] = pluginResult;
    } catch (e: any) {
      logger().error(e);
      result[plugin.key] = { error: e.message };
    }
  }
  return result;
}

/**
 * Called once at start - async for dynamic import
 */
async function loadPluginsModules (): Promise<PluginBridge[]> {
  const pluginDir = path.resolve(import.meta.dirname, '../../plugins');
  const pluginFolderNames = fs.readdirSync(pluginDir, { withFileTypes: true })
    .filter((dirent) => {
      if (process.env.NODE_ENV !== 'test' && dirent.name === 'sample-plugin') return false;
      return dirent.isDirectory();
    })
    .map((dirent) => path.resolve(pluginDir, dirent.name));

  const result: PluginBridge[] = [];
  for (const pluginFolderName of pluginFolderNames) {
    // ESM does not support directory imports — resolve entry point from package.json
    const pkg = JSON.parse(fs.readFileSync(path.join(pluginFolderName, 'package.json'), 'utf-8'));
    const entryPoint = path.join(pluginFolderName, pkg.main || 'index.js');
    const pluginModule = await import(entryPoint);
    const PluginClass = pluginModule.default || pluginModule;
    result.push(new PluginClass());
  }
  return result;
}

export { initWithExpressApp, advertiseNewUserToPlugins, requiredPermissionsAndStreams };
