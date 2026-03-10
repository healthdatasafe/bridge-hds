/**
 * To be called first for any app launch.
 * consumerConfigDir: path to the consumer's config/ directory (with default-config.yml).
 * If not provided, uses lib-bridge-js's own config/ directory.
 */
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bridgeConfigDir = path.resolve(import.meta.dirname, '../config');
export default function initBoiler(appName, consumerConfigDir) {
    const extraConfigs = [];
    if (process.env.NODE_ENV === 'test') {
        const testConfig = path.resolve(consumerConfigDir || bridgeConfigDir, 'test-config.yml');
        extraConfigs.push({ scope: 'test-config', file: testConfig });
    }
    extraConfigs.push({
        pluginAsync: {
            load: async function (store) {
                const storageDir = store.get('storage:files:directory') || './storage';
                const baseDir = consumerConfigDir ? path.resolve(consumerConfigDir, '..') : path.resolve(import.meta.dirname, '..');
                const storageDirAbsolute = path.resolve(baseDir, storageDir);
                store.set('storage:files:directoryAbsolute', storageDirAbsolute);
                return 'plugin-fileDirectoryAbsolute'; // my name
            }
        }
    });
    // Use consumer's config dir if provided, with lib-bridge-js defaults as fallback
    const configDir = consumerConfigDir || bridgeConfigDir;
    const baseFilesDir = consumerConfigDir ? path.resolve(consumerConfigDir, '..') : path.resolve(import.meta.dirname, '..');
    const boiler = require('@pryv/boiler').init({
        appName,
        baseFilesDir,
        baseConfigDir: configDir,
        extraConfigs
    });
    return boiler;
}
// load debug $$ in test mode
if (process.env.NODE_ENV === 'test') {
    (async () => {
        await import("./lib/debug.js");
    })();
}
//# sourceMappingURL=initBoiler.js.map