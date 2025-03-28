process.env.NODE_ENV = 'test';
const { getConfig, getLogger } = require('../../src/initBoiler')(`bridge:${process.pid}`);

const request = require('supertest');
const { getApp } = require('../../src/server');
const pryvService = require('../../src/lib/pryvService');
const pryv = require('pryv');

const logger = getLogger('testServer');

module.exports = {
  init,
  apiTest,
  configGet,
  pryvService,
  createUserAndPermissions,
  startHttpServerCapture
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

const http = require('http');
/**
 * Launch a small web server to capture eventual external calls
 * See test-suite [TESX] to see how it works.
 * @param {Object} params
 * @param {Number} params.port - port to use
 * @returns {Object} captured: the captures call, nextCalls: stack replies, close() - to close the server
 */
async function startHttpServerCapture (params) {
  const captured = [];
  const nextCalls = [];
  const port = params?.port || 8365;
  const host = '127.0.0.1';
  const server = http.createServer(onRequest);
  await require('util').promisify(server.listen).bind(server)(port, host);
  logger.info('Started webServerCapture on port: ' + port);

  async function close () {
    server.close();
    logger.info('Stoped webServerCapture on port: ' + port);
  }

  async function onRequest (req, res) {
    logger.info('WebServerCapture request: ' + req.url);
    try {
      const result = {
        method: req.method,
        url: req.url,
        headers: req.headers
      };
      // capture content
      if (req.method === 'POST') {
        const body = [];
        req
          .on('data', chunk => { body.push(chunk); })
          .on('end', () => {
            result.body = Buffer.concat(body).toString();
            captured.push(result);
          });
      } else {
        captured.push(result);
      }

      // handle response
      const response = nextCalls.pop() || {
        code: 200,
        headers: { },
        body: 'OK'
      };
      res.writeHead(response.code, response.headers);
      res.write(response.body);
      res.end();
    } catch (e) {
      console.log(e);
    }
    logger.info('WebServerCapture sent ');
  }

  return { captured, nextCalls, close };
}
