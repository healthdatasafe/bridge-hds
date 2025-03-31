process.env.NODE_ENV = 'test';
const { getConfig } = require('../../src/initBoiler')(`bridge:${process.pid}`);

const request = require('supertest');
const ShortUniqueId = require('short-unique-id');

const { getApp } = require('../../src/server');
const pryvService = require('../../src/lib/pryvService');
const pryv = require('pryv');
const user = require('../../src/methods/user.js');

module.exports = {
  init,
  apiTest,
  configGet,
  pryvService,
  createUserAndPermissions,
  createOnboardedUser,
  partnerAuth
};

let app = null;
let config = null;

/**
 * Initalize the server, to be run once before the tests.
 * @returns {Promise<null>}
 */
async function init () {
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
 * @returns {Object} username, personalApiEndpoint, appId, appApiEndpoint
 */
async function createUserAndPermissions (username, permissions, appId = 'bridge-test-suite', password, email) {
  password = password || 'pass_' + username;
  email = email || username + '@hds.bogus';
  const newUser = await pryvService.createuser(username, password, email);
  const personalConnection = new pryv.Connection(newUser.apiEndpoint);

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
  const permissions = configGet('service:userPermissionRequest');
  const appId = configGet('service:appId');
  const result = await createUserAndPermissions(username, permissions, appId);
  await user.addCredentialToBridgeAccount(partnerUserId, result.appApiEndpoint);
  result.partnerUserId = partnerUserId;
  return result;
}
