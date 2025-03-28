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
 *  - returnUrl
 *  - partnerUserId
 * result: @see https://pryv.github.io/reference/#authenticate-your-app
 */
router.post('/onboard/', async (req, res) => {
  errors.assertFromPartner(req);
  const partnerUserId = req.body.partnerUserId;
  errors.assertValidpartnerUserId(partnerUserId);
  const onboardingProcess = await onboard.initiate(partnerUserId);
  res.json(onboardingProcess);
});

/**
 * Onboarding
 * returnURL of an onboarding process
 * result: @see https://pryv.github.io/reference/#authenticate-your-app
 */
router.get('/onboard/finalize/:partnerUserId', async (req, res) => {
  // partnerUserId
  const partnerUserId = req.params.partnerUserId;
  errors.assertValidpartnerUserId(partnerUserId);
  const pollUrl = req.query.prYvpoll;
  const redirectUrl = await onboard.finalize(partnerUserId, pollUrl);
  res.redirect(redirectUrl);
});

/**
 * Get a userStatus
 */
router.get('/:partnerUserId/status', async (req, res) => {
  errors.assertFromPartner(req);
  const partnerUserId = req.params.partnerUserId;
  errors.assertValidpartnerUserId(partnerUserId);
  const result = await user.status(partnerUserId);
  res.json(result);
});

module.exports = router;
