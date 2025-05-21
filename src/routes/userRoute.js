/**
 * @type {Express.router}
 */
const router = require('express-promise-router')();

const errors = require('../errors/index.js');
const onboard = require('../methods/onboard.js');
const user = require('../methods/user.js');

/**
 * Onboarding
 * body:
 *  - returnURL
 *  - partnerUserId
 * result: @see https://pryv.github.io/reference/#authenticate-your-app
 */
router.post('/onboard/', async (req, res) => {
  errors.assertFromPartner(req);
  const partnerUserId = req.body.partnerUserId;
  errors.assertValidPartnerUserId(partnerUserId);
  const redirectURLs = req.body.redirectURLs;
  if (!redirectURLs) errors.badRequest('redirectURLs missing');
  for (const key of ['success', 'cancel']) {
    errors.assertValidURL(redirectURLs[key], 'redirectURLs.' + key);
  }
  const webhookClientData = req.body.clientData || {};
  for (const key of ['onboardingSecret', 'partnerUserId', 'status', 'error', 'errorObject', 'type', 'errorObjectJSON', 'pluginResultJSON', 'pluginResult']) {
    if (webhookClientData[key]) errors.badRequest(`clientData.${key} is not  is a reserved key`);
  }

  const onboardingProcess = await onboard.initiate(partnerUserId, redirectURLs, webhookClientData);
  res.json(onboardingProcess);
});

/**
 * Onboarding
 * returnURL of an onboarding process (from User's consent page)
 * result: @see https://pryv.github.io/reference/#authenticate-your-app
 */
router.get('/onboard/finalize/:partnerUserId', async (req, res) => {
  // partnerUserId
  const partnerUserId = req.params.partnerUserId;
  errors.assertValidPartnerUserId(partnerUserId);
  const pollURL = req.query.prYvpoll;
  const redirectURL = await onboard.finalize(partnerUserId, pollURL);
  res.redirect(redirectURL);
});

/**
 * Get a userStatus
 */
router.get('/:partnerUserId/status', async (req, res) => {
  errors.assertFromPartner(req);
  const partnerUserId = req.params.partnerUserId;
  errors.assertValidPartnerUserId(partnerUserId);
  const result = await user.status(partnerUserId);
  res.json(result);
});

/**
 * Change the status of a user
 * - active: true/false
 */
router.post('/:partnerUserId/status', async (req, res) => {
  errors.assertFromPartner(req);
  const partnerUserId = req.params.partnerUserId;
  errors.assertValidPartnerUserId(partnerUserId);
  const active = req.body.active;
  if (active !== true && active !== false) errors.badRequest('active must be true or false');
  const result = await user.setStatus(partnerUserId);
  res.json(result);
});

/**
 * Get a list of all user's apiEndpoint
 */
router.get('/list/apiEndPoints', async (req, res) => {
  const users = [];
  function forEachEvent (event) {
    users.push(event);
  }
  await user.getAllUsersApiEndpoints(forEachEvent);
  res.json({ users });
});

module.exports = router;
