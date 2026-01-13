/**
 * Route for users using their own token
 * @type {Express.router}
 */
const router = require('express-promise-router')();

const errors = require('../errors/index.js');
const { checkAndGetUserApiEndpoint } = require('../lib/autorizationLib.js');
const user = require('../methods/user.js');

/**
 * GET /self/satus
 * Get the status of this user

 */
router.get('/status', async (req, res) => {
  const { accessInfo } = await checkAndGetUserApiEndpoint(req);
  if (accessInfo.type !== 'personal') errors.badRequest('ApiEndpoint access token must be "personal"');
  const status = await user.statusForHDSUsername(accessInfo.user.username, false);
  res.json({ accessInfo, status });
});

module.exports = router;
