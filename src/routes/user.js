/**
 * @type {Express.router}
 */
const router = require('express-promise-router')();

const errors = require('../errors/index.js');
const onboard = require('../methods/onboard.js');

/**
 * Onboarding
 * body:
 *  - returnUrl
 *  - chartneoUserId
 */
router.post('/onboard/', async (req, res) => {
  errors.assertFromChartneo(req);
  const patientId = req.body.patientId;
  errors.assertValidChartneoUserId(patientId);
  const caregiverId = req.body.caregiverId;
  errors.assertValidCaregivertId(caregiverId);
  const processFollowingURL = await onboard.onboardProcess(patientId, caregiverId);
  res.json({ processFollowingURL, patientId });
});

module.exports = router;
