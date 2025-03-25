process.env.NODE_ENV = 'test';
require('../../src/initBoiler')(`dpe:${process.pid}`);

const request = require('supertest');
const { getApp } = require('../../src/server');

module.exports = {
  init,
  apiTest
};

let app = null;

/**
 * Initalize the server, to be run once before the tests.
 * @returns {Promise<null>}
 */
async function init () {
  app = await getApp();
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
