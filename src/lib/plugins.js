const fs = require('fs');
const path = require('path');

module.exports = {
  initWithExpressApp
};

// load plugins
const plugins = loadPlugins();

async function initWithExpressApp (app) {
  for (const plugin of plugins) {
    await plugin.init(app);
  }
}

/**
 * Called once at start in sync Mode
 */
function loadPlugins () {
  const pluginDir = path.resolve(__dirname, '../../plugins');
  const pluginFolderNames = fs.readdirSync(pluginDir, { withFileTypes: true })
    .filter((dirent) => {
      if (process.env.NODE_ENV !== 'test' && dirent.name === 'sample-plugin') return false;
      return dirent.isDirectory();
    })
    .map((dirent) => path.resolve(pluginDir, dirent.name));

  const result = [];
  for (const plugin of pluginFolderNames) {
    const pluginPath = path.resolve(__dirname, 'plugins', plugin);
    result.push(require(pluginPath));
  }
  return result;
}
