// lib-bridge-js public API
export { default as PluginBridge } from "./lib/PluginBridge.js";
export { createBridgeApp, launch } from "./server.js";
export { default as startCluster } from "./start.js";
export { default as initBoiler } from "./initBoiler.js";
export * as errors from "./errors/index.js";
// Re-export essentials for consumers
export { initHDSModel, getHDSModel } from 'hds-lib';
export { default as Router } from 'express-promise-router';
// Utilities needed by consumers (testing, setup)
export { requiredPermissionsAndStreams } from "./lib/plugins.js";
export { init as initPryvService, createuser as createPryvUser } from "./lib/pryvService.js";
export { addCredentialToBridgeAccount } from "./methods/user.js";
// Test helpers — available via 'lib-bridge-js/test' (separate entry to avoid loading test deps in production)
// import * as testServer from 'lib-bridge-js/test';
//# sourceMappingURL=index.js.map