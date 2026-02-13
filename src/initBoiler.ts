/**
 * To be called first for any app launch
 */
import path from 'path';
import { createRequire } from 'module';
import type { Boiler, Config, ExtraConfig } from 'boiler';

const require = createRequire(import.meta.url);

export default function initBoiler (appName: string): Boiler {
  const extraConfigs: ExtraConfig[] = [];
  if (process.env.NODE_ENV === 'test') {
    extraConfigs.push({
      scope: 'test-config',
      file: path.resolve(import.meta.dirname, '../config/test-config.yml')
    });
  }
  extraConfigs.push({
    pluginAsync: {
      load: async function (store: Config): Promise<string> {
        const storageDir = store.get<string>('storage:files:directory') || './storage';
        const storageDirAbsolute = path.resolve(import.meta.dirname, '..', storageDir);
        store.set('storage:files:directoryAbsolute', storageDirAbsolute);
        return 'plugin-fileDirectoryAbsolute'; // my name
      }
    }
  });
  const boiler = require('boiler').init({
    appName, // This will will be prefixed to any log messages
    baseFilesDir: path.resolve(import.meta.dirname, '..'), // use for file:// relative path if not give cwd() will be used
    baseConfigDir: path.resolve(import.meta.dirname, '../config'),
    extraConfigs
  }) as Boiler;
  return boiler;
}

// load debug $$ in test mode
if (process.env.NODE_ENV === 'test') {
  (async () => {
    await import('./lib/debug.ts');
  })();
}
