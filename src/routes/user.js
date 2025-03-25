/**
 * @type {Express.router}
 */
const router = require('express-promise-router')();

const errors = require('../errors/index.js');
const onboard = require('../methods/onboard.js');
const bridgeAccount = require('../lib/bridgeAccount');

/**
 * Onboarding
 * body:
 *  - returnUrl
 *  - partnerUserId
 */
router.post('/onboard/', async (req, res) => {
  errors.assertFromPartner(req);
  const partnerUserId = req.body.partnerUserId;
  errors.assertValidpartnerUserId(chatneoUserId);
  const processFollowingURL = await onboard.onboardProcess(partnerUserId);
  res.json({ processFollowingURL });
});

/**
 * Get a userStatus
 */
router.get('/:userId/status', async (req, res) => {
  errors.assertFromPartner(req);
  const result = await bridgeAccount.userStatus(req.params.userId);
  res.json(result);
});

module.exports = router;
