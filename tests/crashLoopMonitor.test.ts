/**
 * Unit tests for the cluster crash-loop monitor (pure controller, fake clock).
 * No real `cluster`, no sinon — a hand-rolled deterministic clock drives the timers.
 */
import assert from 'node:assert/strict';
import { createCrashLoopMonitor, CRASH_LOOP_DEFAULTS, type CrashLoopIncident, type CrashLoopMonitorOptions } from '../src/lib/crashLoopMonitor.ts';

interface FakeTimer { id: number, fn: () => void, at: number }

class FakeClock {
  time = 0;
  private seq = 0;
  private timers: FakeTimer[] = [];

  now = (): number => this.time;

  // third arg (keepAlive) is a real-timer ref/unref hint — irrelevant to the fake clock.
  setTimer = (fn: () => void, ms: number, _keepAlive?: boolean): number => {
    const id = ++this.seq;
    this.timers.push({ id, fn, at: this.time + ms });
    return id;
  };

  clearTimer = (handle: unknown): void => {
    this.timers = this.timers.filter((x) => x.id !== handle);
  };

  /** fire the single earliest pending timer; returns the time it fired at (or null). */
  runNext (): number | null {
    if (this.timers.length === 0) return null;
    let next = this.timers[0]!;
    for (const x of this.timers) {
      if (x.at < next.at || (x.at === next.at && x.id < next.id)) next = x;
    }
    this.timers = this.timers.filter((x) => x.id !== next.id);
    this.time = next.at;
    next.fn();
    return this.time;
  }

  /** advance to now+ms, firing every timer due along the way. */
  advance (ms: number): void {
    const target = this.time + ms;
    let guard = 0;
    while (this.timers.some((x) => x.at <= target)) {
      if (++guard > 10_000) throw new Error('fake clock runaway');
      this.runNext();
    }
    this.time = target;
  }

  pendingCount (): number { return this.timers.length; }
}

interface Harness {
  clock: FakeClock
  monitor: ReturnType<typeof createCrashLoopMonitor>
  events: { noticeErrors: CrashLoopIncident[], escalations: CrashLoopIncident[], forks: number, forkTimes: number[], lastForkedId: number }
  initialForks: (n: number) => void
  crashCurrent: (code?: number | null, signal?: string | null) => void
}

function makeHarness (overrides: Partial<CrashLoopMonitorOptions> = {}): Harness {
  const clock = new FakeClock();
  let idc = 0;
  const events = { noticeErrors: [] as CrashLoopIncident[], escalations: [] as CrashLoopIncident[], forks: 0, forkTimes: [] as number[], lastForkedId: 0 };

  const monitor: ReturnType<typeof createCrashLoopMonitor> = createCrashLoopMonitor({
    exitOnCrashLoop: false,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onFork: () => {
      events.forks++;
      events.forkTimes.push(clock.now());
      const id = ++idc;
      events.lastForkedId = id;
      monitor.workerForked(id);
    },
    onNoticeError: (i) => events.noticeErrors.push(i),
    onEscalate: (i) => events.escalations.push(i),
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    ...overrides
  });

  return {
    clock,
    monitor,
    events,
    initialForks: (n: number) => {
      for (let i = 0; i < n; i++) {
        const id = ++idc;
        events.lastForkedId = id;
        monitor.workerForked(id);
      }
    },
    crashCurrent: (code = 1, signal = null) => {
      monitor.workerExited(events.lastForkedId, code, signal, false);
    }
  };
}

describe('[CRLX] crashLoopMonitor', () => {
  it('[CRLP] trips at maxExits within window and fires exactly one noticeError', () => {
    const h = makeHarness();
    h.initialForks(1);
    // 4 crashes stay healthy (immediate reforks)
    for (let i = 0; i < 4; i++) {
      h.crashCurrent();
      assert.equal(h.monitor.getState(), 'healthy');
      assert.equal(h.events.noticeErrors.length, 0);
      h.clock.advance(100);
    }
    // 5th crash trips the loop
    h.crashCurrent();
    assert.equal(h.monitor.getState(), 'looping');
    assert.equal(h.events.noticeErrors.length, 1);

    const incident = h.events.noticeErrors[0]!;
    assert.equal(incident.loopCount, 5);
    assert.equal(incident.windowMs, CRASH_LOOP_DEFAULTS.windowMs);
    assert.equal(incident.lastExitCode, 1);
    assert.equal(incident.exitHistory.length, 5);
    assert.equal(h.events.escalations.length, 0); // exitOnCrashLoop=false never escalates
  });

  it('[CRLB] applies exponential backoff (1,2,4,8,16s) capped at 30s while looping, no repeat noticeError', () => {
    const h = makeHarness();
    h.initialForks(1);
    for (let i = 0; i < 4; i++) { h.crashCurrent(); h.clock.advance(100); }
    h.crashCurrent(); // 5th crash trips at t=400, no trailing advance so prev == trip time
    assert.equal(h.monitor.getState(), 'looping');
    assert.equal(h.events.noticeErrors.length, 1);

    const gaps: number[] = [];
    let prev = h.clock.now();
    for (let k = 0; k < 7; k++) {
      const forkAt = h.clock.runNext(); // fire the scheduled (delayed) refork
      assert.notEqual(forkAt, null);
      gaps.push(forkAt! - prev);
      prev = forkAt!;
      h.crashCurrent(); // crash the freshly-forked worker → schedules next backoff
    }
    assert.deepEqual(gaps, [1000, 2000, 4000, 8000, 16000, 30000, 30000]);
    assert.equal(h.events.noticeErrors.length, 1); // still one incident
    assert.equal(h.events.escalations.length, 0); // exitOnCrashLoop=false never escalates
  });

  it('[CRLM] a stable worker surviving healthyMs does NOT erase another slot’s in-window crashes (M1)', () => {
    // Direct unit test (no auto-fork harness, so ids never collide). A stable worker A
    // is forked at t=0; its healthy timer fires at t=60000. A churning slot logs 4 crashes
    // at t=45000..48000 (all inside the 30s window relative to a 5th crash at t=60000).
    // With the M1 bug, A's timer firing while healthy wiped crashTimes and the 5th crash
    // would NOT trip. Post-fix it must trip.
    const clock = new FakeClock();
    let noticeCount = 0;
    const monitor = createCrashLoopMonitor({
      exitOnCrashLoop: false,
      now: clock.now,
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      onFork: () => {}, // drive forks/exits explicitly; no auto-registration
      onNoticeError: () => { noticeCount++; },
      onEscalate: () => {},
      logger: { info: () => {}, warn: () => {}, error: () => {} }
    });

    monitor.workerForked(1); // A — healthy timer at t=60000
    clock.advance(45_000);
    for (let i = 0; i < 4; i++) { monitor.workerExited(100 + i, 1, null, false); clock.advance(1_000); } // 45k..48k, t=49k
    assert.equal(monitor.getState(), 'healthy');
    clock.advance(11_000); // → t=60000: A survives; its timer fires while healthy (must be a no-op for crashTimes)
    assert.equal(monitor.getState(), 'healthy');
    monitor.workerExited(200, 1, null, false); // 5th crash within window → must trip
    assert.equal(monitor.getState(), 'looping');
    assert.equal(noticeCount, 1);
  });

  it('[CRLH] stop() cancels a pending backoff refork (H1)', () => {
    const h = makeHarness();
    h.initialForks(1);
    for (let i = 0; i < 4; i++) { h.crashCurrent(); h.clock.advance(100); }
    h.crashCurrent(); // trip → a 1s backoff refork is now pending
    assert.equal(h.monitor.getState(), 'looping');
    assert.equal(h.clock.pendingCount() > 0, true);
    const forksBefore = h.events.forks;
    h.monitor.stop();
    assert.equal(h.clock.pendingCount(), 0); // backoff refork timer cancelled too
    h.clock.advance(60_000);
    assert.equal(h.events.forks, forksBefore); // no refork fired after stop
  });

  it('[CRLR] a worker surviving healthyMs resets to healthy; a later loop is a new incident', () => {
    const h = makeHarness();
    h.initialForks(1);
    for (let i = 0; i < 5; i++) { h.crashCurrent(); h.clock.advance(100); }
    assert.equal(h.monitor.getState(), 'looping');

    // let the next refork happen, then leave that worker alive past healthyMs
    h.clock.runNext();
    h.clock.advance(CRASH_LOOP_DEFAULTS.healthyMs + 1);
    assert.equal(h.monitor.getState(), 'healthy');

    // a fresh loop = a second noticeError
    for (let i = 0; i < 5; i++) { h.crashCurrent(); h.clock.advance(100); }
    assert.equal(h.monitor.getState(), 'looping');
    assert.equal(h.events.noticeErrors.length, 2);
  });

  it('[CRLG] graceful exits (exitedAfterDisconnect) never count toward the loop', () => {
    const h = makeHarness();
    h.initialForks(1);
    for (let i = 0; i < 10; i++) {
      h.monitor.workerExited(h.events.lastForkedId, 0, null, true);
    }
    assert.equal(h.monitor.getState(), 'healthy');
    assert.equal(h.events.noticeErrors.length, 0);
    assert.equal(h.events.forks, 10); // each graceful exit reforked immediately
  });

  it('[CRLE] escalates via onEscalate after escalateAfterMs when exitOnCrashLoop=true', () => {
    const h = makeHarness({ exitOnCrashLoop: true, escalateAfterMs: 10_000 });
    h.initialForks(1);
    for (let i = 0; i < 5; i++) { h.crashCurrent(); h.clock.advance(100); }
    assert.equal(h.monitor.getState(), 'looping');
    assert.equal(h.events.escalations.length, 0);

    // stay looping past the escalation deadline
    h.clock.advance(10_000);
    assert.equal(h.events.escalations.length, 1);
    assert.equal(h.events.escalations[0]!.loopCount >= 5, true);
  });

  it('[CRLN] recovery before escalateAfterMs cancels the escalation', () => {
    const h = makeHarness({ exitOnCrashLoop: true, escalateAfterMs: 120_000 });
    h.initialForks(1);
    for (let i = 0; i < 5; i++) { h.crashCurrent(); h.clock.advance(100); }
    assert.equal(h.monitor.getState(), 'looping');

    h.clock.runNext(); // refork
    h.clock.advance(CRASH_LOOP_DEFAULTS.healthyMs + 1); // recover before 120s
    assert.equal(h.monitor.getState(), 'healthy');

    h.clock.advance(200_000); // well past the old escalation deadline
    assert.equal(h.events.escalations.length, 0);
  });

  it('[CRLS] shutdown() suppresses reforks and clears timers', () => {
    const h = makeHarness();
    h.initialForks(2);
    const forksBefore = h.events.forks;
    h.monitor.shutdown();
    h.monitor.workerExited(1, 1, null, false);
    h.monitor.workerExited(2, 1, null, false);
    assert.equal(h.events.forks, forksBefore); // no reforks after shutdown
    assert.equal(h.clock.pendingCount(), 0); // all timers cleared
  });
});
