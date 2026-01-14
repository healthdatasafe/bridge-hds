process.env.NODE_ENV = 'test';
const { getConfig } = require('../../src/initBoiler')(`bridge:${process.pid}`);

const request = require('supertest');
const ShortUniqueId = require('short-unique-id');

const { getApp } = require('../../src/server');
const pryvService = require('../../src/lib/pryvService');
const { pryv, initHDSModel } = require('hds-lib');
const user = require('../../src/methods/user.js');
const { requiredPermissionsAndStreams } = require('../../src/lib/plugins.js');
require('../../src/lib/cache.js').init(true);

module.exports = {
  init,
  apiTest,
  configGet,
  pryvService,
  createUserAndPermissions,
  createOnboardedUser,
  partnerAuth,
  getApp
};

let app = null;
let config = null;

/**
 * Initalize the server, to be run once before the tests.
 * @returns {Promise<null>}
 */
async function init () {
  await initHDSModel();
  config = await getConfig();
  app = await getApp();
  await pryvService.init();
}

/**
 * Get a supertest Request boun to the server app
 * @param {AgentOptions|undefined} options to pass to supertest
 * @returns {TestAgent}
 */
function apiTest (options) {
  if (app === null) throw new Error('Call testServer.init() first');
  return request(app, options);
}

/**
 * Return partner auth Header
 */
function partnerAuth (key) {
  return { authorization: config.get('partnerAuthToken') };
}

/**
 * Shortcut for (await getConfig()).get()
 */
function configGet (key) {
  return config.get(key);
}

/**
 * Create userAccountAndPermission
 * @param {string} username
 * @param {Object} permissions - permission set (as per pryv api)
 * @param {string} [appId] - default: 'bridge-test-suite'
 * @param {string} [password] - if not provided will be 'pass{usernam}'
 * @param {string} [email] - if not provided will be '{usernam}@hds.bogus'
 * @param {Array} [streams] - streams to create
 * @returns {Object} username, personalApiEndpoint, appId, appApiEndpoint
 */
async function createUserAndPermissions (username, permissions, appId = 'bridge-test-suite', password, email, streams = []) {
  password = password || 'pass_' + username;
  email = email || username + '@hds.bogus';
  const newUser = await pryvService.createuser(username, password, email);
  const personalConnection = new pryv.Connection(newUser.apiEndpoint);
  // -- create streams
  const apiCallStreamCreate = streams.map(s => ({ method: 'streams.create', params: s }));
  await personalConnection.api(apiCallStreamCreate);

  // -- create access
  const accessRequest = {
    method: 'accesses.create',
    params: {
      type: 'app',
      name: appId,
      permissions
    }
  };
  const res = await personalConnection.api([accessRequest]);
  const appApiEndpoint = res[0].access?.apiEndpoint;

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
  const { permissions, streams } = requiredPermissionsAndStreams(configGet('service:userPermissionRequest'));
  const appId = configGet('service:appId');
  const result = await createUserAndPermissions(username, permissions, appId, null, null, streams);
  await user.addCredentialToBridgeAccount(partnerUserId, result.appApiEndpoint);
  result.partnerUserId = partnerUserId;
  return result;
}
