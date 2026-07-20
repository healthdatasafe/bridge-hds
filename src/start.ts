import initBoiler from './initBoiler.ts';
import cluster from 'cluster';
import os from 'os';
import { createRequire } from 'module';
import * as server from './server.ts';
import type PluginBridge from './lib/PluginBridge.ts';
import { initCacheMaster } from './lib/cache.ts';
import { createCrashLoopMonitor, type CrashLoopIncident } from './lib/crashLoopMonitor.ts';

const require = createRequire(import.meta.url);

/** Optionally-present New Relic agent (only installed on monitored bridge deploys). */
interface NewRelicAgent {
  noticeError: (error: Error, customAttributes?: Record<string, string | number | boolean>) => void
  shutdown: (opts: { collectPendingData?: boolean }, cb: () => void) => void
}

function loadNewRelic (): NewRelicAgent | null {
  try {
    return require('newrelic') as NewRelicAgent;
  } catch {
    return null; // not installed — non-monitored deploy
  }
}

function incidentAttrs (incident: CrashLoopIncident): Record<string, string | number> {
  return {
    exitHistory: JSON.stringify(incident.exitHistory),
    lastExitCode: incident.lastExitCode ?? -1,
    lastExitSignal: incident.lastExitSignal ?? 'none',
    loopCount: incident.loopCount,
    windowMs: incident.windowMs
  };
}

/**
 * Start the bridge with clustering.
 * @param plugin - Plugin instance to use (optional for backward compat)
 * @param configDir - Path to consumer's config/ directory (optional)
 */
export default async function startCluster (plugin?: PluginBridge, configDir?: string): Promise<void> {
  const { getConfig, getLogger } = initBoiler(`bridge:${process.pid}`, configDir);
  const numCPUs = os.cpus().length;
  const logger = getLogger('start');

  const config = await getConfig();
  if (cluster.isPrimary) {
    initCacheMaster();
    logger.info(`Master process ${process.pid} is running`);
    const configNumProcesses = config.get<number>('start:numProcesses') || numCPUs;
    const numProcesses = configNumProcesses < 0 ? Math.max(numCPUs + configNumProcesses, 1) : configNumProcesses;
    const exitOnCrashLoop = config.get<boolean>('start:exitOnCrashLoop') === true;

    const newrelic = loadNewRelic();

    const monitor = createCrashLoopMonitor({
      exitOnCrashLoop,
      now: () => Date.now(),
      setTimer: (fn, ms, keepAlive) => {
        const handle = setTimeout(fn, ms);
        // Healthy timers (keepAlive falsy) are unref'd — a live worker's IPC handle
        // already refs the loop. Refork/escalation timers (keepAlive true) must NOT
        // be unref'd: when the whole fleet is dead they are the only live handle, and
        // unref'ing them makes the master fall off the event loop and exit 0.
        if (keepAlive !== true) handle.unref();
        return handle;
      },
      clearTimer: (handle) => { clearTimeout(handle as NodeJS.Timeout); },
      onFork: () => {
        const worker = cluster.fork();
        monitor.workerForked(worker.id);
      },
      onNoticeError: (incident) => {
        if (newrelic == null) return;
        newrelic.noticeError(
          new Error(`Cluster crash-loop detected: ${incident.loopCount} crashes in ${incident.windowMs}ms`),
          incidentAttrs(incident)
        );
      },
      onEscalate: (incident) => {
        logger.error(`Crash-loop escalation: exiting master ${process.pid} so the orchestrator marks the app down`);
        const exit = (): void => process.exit(1);
        if (newrelic != null) {
          newrelic.noticeError(
            new Error(`Cluster crash-loop escalation: ${incident.loopCount} crashes, exiting master`),
            incidentAttrs(incident)
          );
          // hard fallback in case the agent's shutdown hangs — NOT unref'd, so the
          // process stays alive to flush then exits 1 (unref'ing risks a stray exit 0).
          setTimeout(exit, 5_000);
          newrelic.shutdown({ collectPendingData: true }, exit);
        } else {
          exit();
        }
      },
      logger: {
        info: (m) => logger.info(m),
        warn: (m) => logger.warn(m),
        error: (m) => logger.error(m)
      }
    });

    // Graceful termination on an intentional stop/restart. Registering a handler
    // overrides Node's default terminate, so we must actually tear down and exit:
    // stop reforking (cancels any pending backoff/escalation timer), forward the
    // signal to workers, then exit cleanly. `once` so a repeated signal can't re-enter.
    const onSignal = (signal: NodeJS.Signals): void => {
      const workers = cluster.workers ?? {};
      logger.info(`Master ${process.pid} received ${signal}; stopping ${Object.keys(workers).length} worker(s) and exiting`);
      monitor.shutdown();
      for (const worker of Object.values(workers)) worker?.process.kill(signal);
      process.exit(0);
    };
    process.once('SIGTERM', () => onSignal('SIGTERM'));
    process.once('SIGINT', () => onSignal('SIGINT'));

    for (let i = 0; i < numProcesses; i++) {
      const worker = cluster.fork();
      monitor.workerForked(worker.id);
    }

    cluster.on('exit', (worker, code, signal) => {
      monitor.workerExited(worker.id, code, signal, worker.exitedAfterDisconnect === true);
    });
  } else {
    await server.launch(plugin);
    logger.info(`Api is exposed on: ${config.get('baseURL')}`);
  }
}

// Legacy auto-run removed — consumers must call startCluster() explicitly from their own start.ts
