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
 */
router.post('/onboard/', async (req, res) => {
  errors.assertFromPartner(req);
  const partnerUserId = req.body.partnerUserId;
  errors.assertValidpartnerUserId(partnerUserId);
  const processFollowingURL = await onboard.onboardProcess(partnerUserId);
  res.json({ processFollowingURL });
});

/**
 * Get a userStatus
 */
router.get('/:userId/status', async (req, res) => {
  errors.assertFromPartner(req);
  const partnerUserId = req.params.userId;
  errors.assertValidpartnerUserId(partnerUserId);
  const result = await user.status(partnerUserId);
  res.json(result);
});

module.exports = router;
