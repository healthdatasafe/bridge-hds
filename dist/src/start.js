import initBoiler from "./initBoiler.js";
import cluster from 'cluster';
import os from 'os';
import * as server from "./server.js";
/**
 * Start the bridge with clustering.
 * @param plugin - Plugin instance to use (optional for backward compat)
 * @param configDir - Path to consumer's config/ directory (optional)
 */
export default async function startCluster(plugin, configDir) {
    const { getConfig, getLogger } = initBoiler(`bridge:${process.pid}`, configDir);
    const numCPUs = os.cpus().length;
    const logger = getLogger('start');
    const config = await getConfig();
    if (cluster.isPrimary) {
        logger.info(`Master process ${process.pid} is running`);
        const configNumProcesses = config.get('start:numProcesses') || numCPUs;
        const numProcesses = configNumProcesses < 0 ? Math.max(numCPUs + configNumProcesses, 1) : configNumProcesses;
        for (let i = 0; i < numProcesses; i++) {
            cluster.fork();
        }
        cluster.on('exit', (worker) => {
            logger.info(`Worker process ${worker.process.pid} died. Restarting...`);
            cluster.fork();
        });
    }
    else {
        await server.launch(plugin);
        logger.info(`Api is exposed on: ${config.get('baseURL')}`);
    }
}
// Legacy auto-run removed — consumers must call startCluster() explicitly from their own start.ts
//# sourceMappingURL=start.js.map