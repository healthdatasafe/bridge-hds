import initBoiler from './initBoiler.ts';
import cluster from 'cluster';
import os from 'os';
import * as server from './server.ts';

const { getConfig, getLogger } = initBoiler(`bridge:${process.pid}`);

const numCPUs = os.cpus().length;
const logger = getLogger('start');

(async () => {
  const config = await getConfig();
  if (cluster.isPrimary) {
    logger.info(`Master process ${process.pid} is running`);
    const configNumProcesses = config.get<number>('start:numProcesses') || numCPUs;
    const numProcesses = configNumProcesses < 0 ? Math.max(numCPUs + configNumProcesses, 1) : configNumProcesses;

    for (let i = 0; i < numProcesses; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker) => {
      logger.info(`Worker process ${worker.process.pid} died. Restarting...`);
      cluster.fork();
    });
  } else {
    await server.launch();
    logger.info(`Api is exposed on: ${config.get('baseURL')}`);
  }
})();
