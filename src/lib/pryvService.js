const { getConfig, getLogger } = require('boiler');
const pryv = require('pryv');
const superagent = pryv.utils.superagent;

const ShortUniqueId = require('short-unique-id');
const { internalError } = require('../errors');
const passwordGenerator = new ShortUniqueId({ dictionary: 'alphanum', length: 12 });

const logger = getLogger('pryvService');

module.exports = {
  init,
  userExists,
  createuser,
  service
};

/**
 * @type {pryv.Service}
 */
let serviceSingleton;

/**
 * @type {ServiceInfo}
 */
let infosSingleton;
let config;

/**
 * Get current Pryv service
 * @returns {pryv.Service}
 */
function service () {
  if (serviceSingleton == null) throw new Error('Init pryvService first');
  return serviceSingleton;
}

/**
 * Initialize Pryv service from config and creates a singleton
 * accessible via service()
 * @returns {pryv.Service}
 */
async function init () {
  if (infosSingleton) return infosSingleton;
  config = (await getConfig()).get('pryv');
  if (!config.appId) throw new Error('Cannot find appId in config');
  try {
    serviceSingleton = new pryv.Service(config.serviceInfoUrl);
    infosSingleton = await serviceSingleton.info();
    return infosSingleton;
  } catch (err) {
    internalError('Failed connecting to Pryv instance', config);
  }
  return null;
}

/**
 * @typedef {Object} CreateUserResult
 * @property {string} apiEndpoint - a personal ApiEnpoint
 * @property {string} username - The username
 * @property {string} password - The password
 */

/**
 * Create a user on Pryv.io
 * @param {string} userId - desireg UserId for Prvy.io
 * @param {string} password
 * @param {string} email
 * @returns {CreateUserResult}
 */
async function createuser (username, password, email) {
  const host = await getHost();
  password = password || passwordGenerator.rnd();
  username = username || getNewUserId('u');
  email = email || username + '@hds.bogus';
  try {
    // create user
    const res = await pryv.utils.superagent.post(host + 'users')
      .send({
        appId: config.appId,
        username,
        password,
        email,
        invitationtoken: 'enjoy',
        languageCode: 'en',
        referer: 'none'
      });
    if (res.body.apiEndpoint == null) throw new Error('Cannot find apiEndpoint in response');
    return { apiEndpoint: res.body.apiEndpoint, username: res.body.username, password };
  } catch (e) {
    logger.error('Failed creating user ', e.message);
    throw new Error('Failed creating user ' + host + 'users');
  }
}

/**
 * Utility to check if a user exists on a Pryv pltafom
 * @param {string} userId
 * @returns {boolean}
 */
async function userExists (userId) {
  const userExists = (await superagent.get(infosSingleton.register + userId + '/check_username')).body;
  if (typeof userExists.reserved === 'undefined') throw Error('Pryv invalid user exists response ' + JSON.stringify(userExists));
  return userExists.reserved;
}

/**
 * Not really usefull for Open-Pryv.io kept if entreprise version becoms availble
 * @returns {string} first available hosting
 */
async function getHost () {
  // get available hosting
  const hostings = (await superagent.get(infosSingleton.register + 'hostings').set('accept', 'json')).body;
  let hostingCandidate = null;
  findOneHostingKey(hostings, 'N');
  function findOneHostingKey (o, parentKey) {
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
function getNewUserId (Model, startWith = 'x') {
  const id = startWith + userIdGenerator.rnd();
  return id;
}
