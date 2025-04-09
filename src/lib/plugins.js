const fs = require('fs');
const path = require('path');
const logger = require('boiler').getLogger('plugins');

module.exports = {
  initWithExpressApp,
  advertiseNewUserToPlugins
};

// load plugins
const plugins = loadPluginsModules();

/**
 * Initialized plugins
 * @param {Express.Application} app
 */
async function initWithExpressApp (app) {
  for (const plugin of plugins) {
    await plugin.init(app);
    logger.info(`Loaded plugin: ${plugin.key}`);
  }
}

/**
 * Announce new User to plugins
 * @param {Express.Application} app
 */
async function advertiseNewUserToPlugins (partnerUserId, apiEndpoint) {
  const result = {};
  for (const plugin of plugins) {
    try { // do not fail but pass the error to the webhook
      const pluginResult = await plugin.newUserAssociated(partnerUserId, apiEndpoint);
      result[plugin.key] = pluginResult;
    } catch (e) {
      logger.error(e);
      result[plugin.key] = { error: e.message };
    }
  }
  return result;
}

/**
 * Called once at start in sync Mode
 */
function loadPluginsModules () {
  const pluginDir = path.resolve(__dirname, '../../plugins');
  const pluginFolderNames = fs.readdirSync(pluginDir, { withFileTypes: true })
    .filter((dirent) => {
      if (process.env.NODE_ENV !== 'test' && dirent.name === 'sample-plugin') return false;
      return dirent.isDirectory();
    })
    .map((dirent) => path.resolve(pluginDir, dirent.name));

  const result = [];
  for (const pluginFolderName of pluginFolderNames) {
    const pluginPath = path.resolve(__dirname, 'plugins', pluginFolderName);
    const PluginClass = require(pluginPath);
    result.push(new PluginClass());
  }
  return result;
}
