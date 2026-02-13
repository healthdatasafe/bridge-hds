import boiler from 'boiler';
import { HDSService, initHDSModel } from 'hds-lib';
import ShortUniqueId from 'short-unique-id';
import { internalError } from '../errors/index.ts';

const { getConfig, getLogger } = boiler;
let _logger: ReturnType<typeof getLogger> | null = null;
function logger () { return _logger || (_logger = getLogger('pryvService')); }

const passwordGenerator = new ShortUniqueId({ dictionary: 'alphanum', length: 12 });

let serviceSingleton: InstanceType<typeof HDSService> | null = null;
let infosSingleton: any = null;
let config: any = null;

/**
 * Get current HDSService service
 */
function service (): InstanceType<typeof HDSService> {
  if (serviceSingleton == null) throw new Error('Init pryvService first');
  return serviceSingleton;
}

/**
 * Initialize Pryv service from config and creates a singleton
 * accessible via service()
 */
async function init (): Promise<unknown> {
  if (infosSingleton) return infosSingleton;
  config = (await getConfig()).get('service');
  if (!config.appId) throw new Error('Cannot find appId in config');
  try {
    serviceSingleton = new HDSService(config.serviceInfoURL);
    infosSingleton = await serviceSingleton.info();
    await initHDSModel();
    return infosSingleton;
  } catch (err: any) {
    internalError('Failed connecting to service instance ' + err.message, config);
  }
  return null;
}

interface CreateUserResult {
  apiEndpoint: string;
  username: string;
  password: string;
}

/**
 * Create a user on Pryv.io
 */
async function createuser (username: string | null, password: string | null, email: string | null): Promise<CreateUserResult> {
  const host = await getHost();
  password = password || passwordGenerator.rnd();
  username = username || getNewUserId('u');
  email = email || username + '@hds.bogus';
  try {
    // create user
    const res = await fetch(host + 'users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appId: config.appId,
        username,
        password,
        email,
        invitationtoken: 'enjoy',
        languageCode: 'en',
        referer: 'none'
      })
    });
    const resBody = await res.json() as any;
    if (resBody.apiEndpoint == null) throw new Error('Cannot find apiEndpoint in response');
    return { apiEndpoint: resBody.apiEndpoint, username: resBody.username, password };
  } catch (e: any) {
    logger().error('Failed creating user ', e.message);
    throw new Error('Failed creating user ' + host + 'users');
  }
}

/**
 * Utility to check if a user exists on a Pryv pltafom
 */
async function userExists (userId: string): Promise<boolean> {
  const userExistsRes = await (await fetch(infosSingleton.register + userId + '/check_username')).json() as any;
  if (typeof userExistsRes.reserved === 'undefined') throw Error('Pryv invalid user exists response ' + JSON.stringify(userExistsRes));
  return userExistsRes.reserved;
}

/**
 * Not really usefull for Open-Pryv.io kept if entreprise version becoms availble
 */
async function getHost (): Promise<string> {
  // get available hosting
  const hostings = await (await fetch(infosSingleton.register + 'hostings')).json() as any;
  let hostingCandidate: any = null;
  findOneHostingKey(hostings, 'N');
  function findOneHostingKey (o: any, parentKey: string): void {
    for (const key of Object.keys(o)) {
      if (parentKey === 'hostings') {
        const hosting = o[key];
        if (hosting.available) {
          hostingCandidate = hosting;
        }
        return;
      }
      if (typeof o[key] !== 'string') {
        findOneHostingKey(o[key], key);
      }
    }
  }
  if (hostingCandidate == null) throw Error('Cannot find hosting in: ' + JSON.stringify(hostings));
  return hostingCandidate.availableCore;
}

const userIdGenerator = new ShortUniqueId({ dictionary: 'alphanum_lower', length: 7 });
function getNewUserId (startWith = 'x'): string {
  const id = startWith + userIdGenerator.rnd();
  return id;
}

export { init, userExists, createuser, service };
