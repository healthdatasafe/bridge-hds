const { getConfig, getLogger } = require('./initBoiler')(`bridge:${process.pid}`)

const cluster = require('cluster')
const os = require('os')
const server = require('./server')
const numCPUs = os.cpus().length

const logger = getLogger('start');

(async () => {
  const config = await getConfig()
  if (cluster.isMaster) {
    logger.info(`Master process ${process.pid} is running`)
    const configNumProcesses = config.get('start:numProcesses') || numCPUs
    const numProcesses = configNumProcesses < 0 ? Math.max(numCPUs + configNumProcesses, 1) : configNumProcesses

    for (let i = 0; i < numProcesses; i++) {
      cluster.fork()
    }

    cluster.on('exit', (worker, code, signal) => {
      logger.info(`Worker process ${worker.process.pid} died. Restarting...`)
      cluster.fork()
    })
  } else {
    await server.launch()
    logger.info(`Api is exposed on: ${config.get('baseURL')}`)
  }
})()
