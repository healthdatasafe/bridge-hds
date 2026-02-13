import initBoiler from '../../src/initBoiler.ts';
import request from 'supertest';
import ShortUniqueId from 'short-unique-id';
import { getApp } from '../../src/server.ts';
import * as pryvService from '../../src/lib/pryvService.ts';
import { pryv, initHDSModel } from 'hds-lib';
import * as user from '../../src/methods/user.ts';
import { requiredPermissionsAndStreams } from '../../src/lib/plugins.ts';
import type { Application } from 'express';
import type { Config } from 'boiler';

const { getConfig } = initBoiler(`bridge:${process.pid}`);

let app: Application | null = null;
let config: Config | null = null;

/**
 * Initalize the server, to be run once before the tests.
 */
async function init (): Promise<void> {
  await initHDSModel();
  config = await getConfig();
  app = await getApp();
  await pryvService.init();
}

/**
 * Get a supertest Request bound to the server app
 */
function apiTest (options?: Record<string, unknown>) {
  if (app === null) throw new Error('Call testServer.init() first');
  return request(app, options);
}

/**
 * Return partner auth Header
 */
function partnerAuth (key?: string) {
  return { authorization: config!.get<string>('partnerAuthToken') };
}

/**
 * Shortcut for (await getConfig()).get()
 */
function configGet<T = any> (key: string): T {
  return config!.get<T>(key);
}

/**
 * Create userAccountAndPermission
 */
async function createUserAndPermissions (
  username: string,
  permissions: Array<Record<string, unknown>>,
  appId: string = 'bridge-test-suite',
  password?: string | null,
  email?: string | null,
  streams: Array<Record<string, unknown>> = []
) {
  password = password || 'pass_' + username;
  email = email || username + '@hds.bogus';
  const newUser = await pryvService.createuser(username, password, email);
  const personalConnection = new pryv.Connection(newUser.apiEndpoint);
  // -- create streams
  const apiCallStreamCreate = streams.map(s => ({ method: 'streams.create', params: s }));
  await personalConnection.api(apiCallStreamCreate as any);

  // -- create access
  const accessRequest = {
    method: 'accesses.create',
    params: {
      type: 'app',
      name: appId,
      permissions
    }
  };
  const res: any = await personalConnection.api([accessRequest] as any);
  const appApiEndpoint = res[0]?.access?.apiEndpoint;

  const result = {
    username,
    personalApiEndpoint: newUser.apiEndpoint,
    appId,
    appApiEndpoint
  };

  return result;
}

/**
 * Create an onBoardeduser
 */
async function createOnboardedUser () {
  const partnerUserId = (new ShortUniqueId({ dictionary: 'alphanum_lower', length: 18 })).rnd();
  const username = (new ShortUniqueId({ dictionary: 'alphanum_lower', length: 8 })).rnd();
  const { permissions, streams } = requiredPermissionsAndStreams(configGet('service:userPermissionRequest') as unknown[]);
  const appId = configGet<string>('service:appId');
  const result = await createUserAndPermissions(username, permissions, appId, null, null, streams);
  await user.addCredentialToBridgeAccount(partnerUserId, result.appApiEndpoint);
  (result as Record<string, unknown>).partnerUserId = partnerUserId;
  return result as typeof result & { partnerUserId: string };
}

export {
  init,
  apiTest,
  configGet,
  pryvService,
  createUserAndPermissions,
  createOnboardedUser,
  partnerAuth,
  getApp
};
