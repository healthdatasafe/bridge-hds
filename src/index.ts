// bridge-hds public API
export { default as PluginBridge } from './lib/PluginBridge.ts';
export { createBridgeApp, launch } from './server.ts';
export { default as startCluster } from './start.ts';
export { default as initBoiler } from './initBoiler.ts';
export * as errors from './errors/index.ts';

// Re-export essentials for consumers
export { initHDSModel, getHDSModel } from 'hds-lib';
export { default as Router } from 'express-promise-router';

// Utilities needed by consumers (testing, setup)
export { requiredPermissionsAndStreams } from './lib/plugins.ts';
export { init as initPryvService, createuser as createPryvUser } from './lib/pryvService.ts';
export { addCredentialToBridgeAccount } from './methods/user.ts';

// Test helpers — reusable by consumer repos
export * as testServer from '../tests/helpers/testServer.ts';
