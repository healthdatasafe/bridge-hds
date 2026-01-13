const errors = require('../errors/index.js');
const { pryv } = require('hds-lib');

module.exports = {
  checkAndGetUserApiEndpoint
};

/**
 * Check if an Authorization Header is a valid apiEnpoind
 * @param {string} req.headers.Authorization  APIEndpoint <...>
 */
async function checkAndGetUserApiEndpoint (req) {
  const authorization = req.headers.authorization;
  if (authorization == null) errors.badRequest('Missing Authorization header');
  const [type, apiEndPoint] = authorization.split(' ');
  if (type !== 'ApiEndpoint') errors.badRequest('Authorization type must be an apiEndpoint');
  const hdsConnection = new pryv.Connection(apiEndPoint);
  try {
    const accessInfo = await hdsConnection.accessInfo();
    return { accessInfo, hdsConnection };
  } catch (e) {
    errors.badRequest('Invalid apiEndpoint');
  }
}
