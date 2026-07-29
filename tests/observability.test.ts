import assert from 'assert';
import { EventEmitter } from 'events';
import type { Request, Response } from 'express';
import { observabilityTiming, type ObsHolder } from '../src/lib/observability.ts';

/**
 * Unit tests for the bridge telemetry middleware (plan 88). These exercise the
 * recording logic directly — no live pryv service — and pin the fence-critical
 * property: the method id is the route PATTERN, never a concrete path.
 */
describe('[OBS] observability middleware', () => {
  function fakeRes (statusCode: number): Response {
    const res = new EventEmitter() as unknown as Response;
    res.statusCode = statusCode;
    return res;
  }

  async function run (req: Partial<Request>, res: Response, holder: ObsHolder): Promise<void> {
    await new Promise<void>((resolve) => {
      observabilityTiming(holder)(req as Request, res, () => {
        (res as unknown as EventEmitter).emit('finish');
        resolve();
      });
    });
  }

  function stubHolder (calls: Array<[string, string]>, errs: string[] = []): ObsHolder {
    return {
      obs: {
        recordCall: (m, s, _d) => { calls.push([m, s]); },
        recordError: (c) => { errs.push(c); },
        flush: async () => {},
        stop: async () => {}
      }
    };
  }

  it('records the route PATTERN (a param stays `:id`, never a concrete value) + status class', async () => {
    const calls: Array<[string, string]> = [];
    await run(
      { method: 'GET', baseUrl: '/user', route: { path: '/:partnerUserId/status' } as Request['route'] },
      fakeRes(200), stubHolder(calls)
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.[0], 'GET /user/:partnerUserId/status');
    assert.equal(calls[0]?.[1], '2xx');
  });

  it('maps a >=400 response to a status class AND a framework error code', async () => {
    const calls: Array<[string, string]> = []; const errs: string[] = [];
    await run(
      { method: 'POST', baseUrl: '/user', route: { path: '/onboard/' } as Request['route'] },
      fakeRes(401), stubHolder(calls, errs)
    );
    assert.equal(calls[0]?.[1], '4xx');
    assert.equal(errs[0], 'UNAUTHORIZED');
  });

  it('skips an unmatched request (no req.route) — nothing to name as a method', async () => {
    const calls: Array<[string, string]> = [];
    await run({ method: 'GET', baseUrl: '', route: undefined }, fakeRes(404), stubHolder(calls));
    assert.equal(calls.length, 0);
  });

  it('is an inert no-op before the emitter is built (holder.obs === null)', async () => {
    await run({ method: 'GET', baseUrl: '', route: { path: '/status' } as Request['route'] }, fakeRes(200), { obs: null });
    // reaching here without throwing is the assertion
    assert.ok(true);
  });
});
