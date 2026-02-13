const fs = require('fs')
const path = require('path')
const logger = require('boiler').getLogger('plugins')
const { initHDSModel, getHDSModel } = require('hds-lib')
const { bridgeConnection } = require('./bridgeAccount')

module.exports = {
  initWithExpressApp,
  advertiseNewUserToPlugins,
  requiredPermissionsAndStreams
}

// load plugins
const plugins = loadPluginsModules()

/**
 * Initialized plugins
 * @param {Express.Application} app
 */
async function initWithExpressApp (app) {
  await initHDSModel()
  for (const plugin of plugins) {
    await plugin.init(app, bridgeConnection)
    logger.info(`Loaded plugin: ${plugin.key}`)
  }
}

/**
 * Get plugin required permissions
 */
function requiredPermissionsAndStreams (existingPermissions = []) {
  // get the list of required Items
  const itemKeys = new Set()
  for (const plugin of plugins) {
    plugin.potentialCreatedItemKeys.forEach(itemKey => itemKeys.add(itemKey))
  }
  //
  const streams = getHDSModel().streams.getNecessaryListForItems(itemKeys)
  const permissions = getHDSModel().authorizations.forItemKeys(itemKeys, { defaultLevel: 'manage', preRequest: existingPermissions })
  return { permissions, streams }
}

/**
 * Announce new User to plugins
 * @param {Express.Application} app
 */
async function advertiseNewUserToPlugins (partnerUserId, apiEndpoint) {
  const result = {}
  for (const plugin of plugins) {
    try { // do not fail but pass the error to the webhook
      const pluginResult = await plugin.newUserAssociated(partnerUserId, apiEndpoint)
      result[plugin.key] = pluginResult
    } catch (e) {
      logger.error(e)
      result[plugin.key] = { error: e.message }
    }
  }
  return result
}

/**
 * Called once at start in sync Mode
 */
function loadPluginsModules () {
  const pluginDir = path.resolve(__dirname, '../../plugins')
  const pluginFolderNames = fs.readdirSync(pluginDir, { withFileTypes: true })
    .filter((dirent) => {
      if (process.env.NODE_ENV !== 'test' && dirent.name === 'sample-plugin') return false
      return dirent.isDirectory()
    })
    .map((dirent) => path.resolve(pluginDir, dirent.name))

  const result = []
  for (const pluginFolderName of pluginFolderNames) {
    const pluginPath = path.resolve(__dirname, 'plugins', pluginFolderName)
    const PluginClass = require(pluginPath)
    result.push(new PluginClass())
  }
  return result
}
