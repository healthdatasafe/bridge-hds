/**
 * Crash-loop monitor for the cluster master.
 *
 * Pure controller — no `cluster` import, no direct timer/clock access. All side
 * effects are injected so it is fully unit-testable with a fake clock. `start.ts`
 * is thin glue that wires the real `cluster` events and effects into this.
 *
 * State machine: healthy → looping → (healthy | exited)
 *   - healthy → looping : the crash that trips `maxExits within windowMs`.
 *       Fires `onNoticeError` ONCE, arms the escalation timer (if exitOnCrashLoop).
 *   - looping → healthy : a respawned worker survives `healthyMs`.
 *       Clears escalation timer, resets backoff, clears exit history.
 *       A later loop is a NEW incident (new noticeError).
 *
 * Every counted crash while `looping` reforks with exponential backoff
 * (base·2^level, capped) instead of the immediate refork used while healthy.
 * Graceful exits (`exitedAfterDisconnect`) refork immediately and are never counted.
 */

export interface CrashLoopThresholds {
  /** number of crashes within `windowMs` that trips the loop */
  maxExits: number
  /** rolling window for counting crashes (ms) */
  windowMs: number
  /** first backoff delay; doubles each subsequent crash while looping (ms) */
  backoffBaseMs: number
  /** cap for the backoff delay (ms) */
  backoffCapMs: number
  /** a worker that survives this long resets the loop (ms) */
  healthyMs: number
  /** how long a loop must persist before master escalation (ms) */
  escalateAfterMs: number
}

export const CRASH_LOOP_DEFAULTS: CrashLoopThresholds = {
  maxExits: 5,
  windowMs: 30_000,
  backoffBaseMs: 1_000,
  backoffCapMs: 30_000,
  healthyMs: 60_000,
  escalateAfterMs: 300_000
};

/** Structured payload handed to the NR / escalation effects (flat primitives at the edge). */
export interface CrashLoopIncident {
  /** crash timestamps (ms) currently in the window, or accumulated total for escalation */
  exitHistory: number[]
  lastExitCode: number | null
  lastExitSignal: string | null
  /** crashes counted for this event */
  loopCount: number
  windowMs: number
}

type TimerHandle = unknown;

export interface CrashLoopMonitorOptions extends Partial<CrashLoopThresholds> {
  /** enable master `process.exit(1)` escalation (default false — opt-in per consumer) */
  exitOnCrashLoop: boolean
  /** monotonic-ish clock, ms */
  now: () => number
  /**
   * Schedule a one-shot timer; returns a handle for clearTimer.
   * `keepAlive` timers MUST keep the process alive (not unref'd): when every
   * worker is dead in a crash-loop, a pending refork/escalation timer is the
   * only thing on the event loop, and unref'ing it makes the master exit 0.
   * Non-keepAlive timers (per-worker healthy timers) may be unref'd — a live
   * worker's IPC handle already refs the loop while such a timer is armed.
   */
  setTimer: (fn: () => void, ms: number, keepAlive?: boolean) => TimerHandle
  /** cancel a timer created by setTimer */
  clearTimer: (handle: TimerHandle) => void
  /** fork exactly one replacement worker (glue calls cluster.fork() + workerForked) */
  onFork: () => void
  /** fired ONCE per incident when healthy → looping */
  onNoticeError: (incident: CrashLoopIncident) => void
  /** fired when a loop persists past escalateAfterMs (only if exitOnCrashLoop) */
  onEscalate: (incident: CrashLoopIncident) => void
  logger: { info: (m: string) => void, warn: (m: string) => void, error: (m: string) => void }
}

export interface CrashLoopMonitor {
  /** call after each successful cluster.fork(), with the worker's id */
  workerForked: (workerId: number) => void
  /** call from cluster.on('exit') */
  workerExited: (workerId: number, code: number | null, signal: string | null, exitedAfterDisconnect: boolean) => void
  /** stop reforking (SIGTERM/SIGINT) and clear all timers */
  shutdown: () => void
  /** clear all timers without setting the shutdown flag (test teardown) */
  stop: () => void
  /** current state — for tests/introspection */
  getState: () => 'healthy' | 'looping'
}

export function createCrashLoopMonitor (opts: CrashLoopMonitorOptions): CrashLoopMonitor {
  // Explicit per-field defaulting (not a spread) so functions in `opts` don't leak
  // into the thresholds and an explicit `undefined` override can't become NaN.
  const t: CrashLoopThresholds = {
    maxExits: opts.maxExits ?? CRASH_LOOP_DEFAULTS.maxExits,
    windowMs: opts.windowMs ?? CRASH_LOOP_DEFAULTS.windowMs,
    backoffBaseMs: opts.backoffBaseMs ?? CRASH_LOOP_DEFAULTS.backoffBaseMs,
    backoffCapMs: opts.backoffCapMs ?? CRASH_LOOP_DEFAULTS.backoffCapMs,
    healthyMs: opts.healthyMs ?? CRASH_LOOP_DEFAULTS.healthyMs,
    escalateAfterMs: opts.escalateAfterMs ?? CRASH_LOOP_DEFAULTS.escalateAfterMs
  };
  const { now, setTimer, clearTimer, onFork, onNoticeError, onEscalate, logger, exitOnCrashLoop } = opts;

  let state: 'healthy' | 'looping' = 'healthy';
  let crashTimes: number[] = [];
  let totalLoopCrashes = 0; // accumulated across the current incident (for escalation payload)
  let backoffLevel = 0;
  let escalationTimer: TimerHandle | null = null;
  const healthyTimers = new Map<number, TimerHandle>();
  const reforkTimers = new Set<TimerHandle>(); // pending delayed reforks (keepAlive)
  let shuttingDown = false;

  function armHealthyTimer (workerId: number): void {
    const handle = setTimer(() => onWorkerHealthy(workerId), t.healthyMs);
    healthyTimers.set(workerId, handle);
  }

  function clearHealthyTimer (workerId: number): void {
    const handle = healthyTimers.get(workerId);
    if (handle !== undefined) {
      clearTimer(handle);
      healthyTimers.delete(workerId);
    }
  }

  function clearEscalationTimer (): void {
    if (escalationTimer !== null) {
      clearTimer(escalationTimer);
      escalationTimer = null;
    }
  }

  function resetToHealthy (reason: string): void {
    if (state === 'looping') logger.info(`Cluster recovered (${reason}); crash-loop cleared`);
    state = 'healthy';
    crashTimes = [];
    totalLoopCrashes = 0;
    backoffLevel = 0;
    clearEscalationTimer();
  }

  function onWorkerHealthy (workerId: number): void {
    healthyTimers.delete(workerId);
    // Only meaningful while looping — a survivor proves the fleet recovered.
    // While already healthy, do NOT wipe crashTimes: that would erase another
    // slot's in-progress crash history and delay/split detection (window pruning
    // on each crash already handles stale entries).
    if (state === 'looping') resetToHealthy(`worker survived ${t.healthyMs}ms`);
  }

  function workerForked (workerId: number): void {
    armHealthyTimer(workerId);
  }

  function workerExited (workerId: number, code: number | null, signal: string | null, exitedAfterDisconnect: boolean): void {
    clearHealthyTimer(workerId);

    if (shuttingDown) return; // master is stopping — let workers die, don't fight the orchestrator

    // Graceful/intentional recycle: replace immediately, never count toward the loop.
    if (exitedAfterDisconnect) {
      logger.info(`Worker ${workerId} exited gracefully (code=${code}, signal=${signal}); reforking`);
      onFork();
      return;
    }

    const ts = now();
    crashTimes.push(ts);
    // prune outside the rolling window
    crashTimes = crashTimes.filter((x) => ts - x < t.windowMs);
    const countInWindow = crashTimes.length;

    // healthy → looping: the crash that trips the threshold
    if (state === 'healthy' && countInWindow >= t.maxExits) {
      state = 'looping';
      totalLoopCrashes = countInWindow;
      const incident: CrashLoopIncident = {
        exitHistory: [...crashTimes],
        lastExitCode: code,
        lastExitSignal: signal,
        loopCount: countInWindow,
        windowMs: t.windowMs
      };
      logger.error(`Cluster crash-loop detected: ${countInWindow} crashes in ${t.windowMs}ms (last code=${code}, signal=${signal})`);
      onNoticeError(incident);
      if (exitOnCrashLoop && escalationTimer === null) {
        // keepAlive: during a fleet-wide loop every worker may be dead — this
        // timer must keep the master alive so escalation actually fires.
        escalationTimer = setTimer(onEscalationTimeout, t.escalateAfterMs, true);
      }
    } else if (state === 'looping') {
      totalLoopCrashes++;
    }

    // schedule exactly one refork — delayed while looping, immediate while healthy
    let delay = 0;
    if (state === 'looping') {
      delay = Math.min(t.backoffBaseMs * Math.pow(2, backoffLevel), t.backoffCapMs);
      backoffLevel++;
    }
    if (delay > 0) {
      logger.warn(`Worker ${workerId} crashed (code=${code}, signal=${signal}); ${countInWindow} in window; reforking in ${delay}ms`);
      // keepAlive + tracked: if all workers are dead this is the only live handle,
      // and stop()/shutdown() must be able to cancel it so we don't refork mid-teardown.
      const handle = setTimer(() => { reforkTimers.delete(handle); onFork(); }, delay, true);
      reforkTimers.add(handle);
    } else {
      logger.info(`Worker ${workerId} died (code=${code}, signal=${signal}); restarting`);
      onFork();
    }
  }

  function onEscalationTimeout (): void {
    escalationTimer = null;
    const incident: CrashLoopIncident = {
      exitHistory: [...crashTimes],
      lastExitCode: null,
      lastExitSignal: null,
      loopCount: totalLoopCrashes,
      windowMs: t.windowMs
    };
    // We're giving up and the master is about to exit — cancel any pending backoff
    // refork so we don't spawn a short-lived worker during the escalation/flush window.
    for (const handle of reforkTimers) clearTimer(handle);
    reforkTimers.clear();
    logger.error(`Cluster crash-loop persisted past ${t.escalateAfterMs}ms (${totalLoopCrashes} crashes); escalating`);
    onEscalate(incident);
  }

  function stop (): void {
    for (const handle of healthyTimers.values()) clearTimer(handle);
    healthyTimers.clear();
    for (const handle of reforkTimers) clearTimer(handle);
    reforkTimers.clear();
    clearEscalationTimer();
  }

  function shutdown (): void {
    shuttingDown = true;
    stop();
  }

  return {
    workerForked,
    workerExited,
    shutdown,
    stop,
    getState: () => state
  };
}
