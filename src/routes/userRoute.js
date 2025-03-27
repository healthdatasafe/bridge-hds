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
  const onboardingProcess = await onboard.onboardProcess(partnerUserId);
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
  const pollParam = req.query.prYvpoll;

  // might be an Array ..
  const pollUrl = Array.isArray(pollParam) ? pollParam[0] : pollParam;
  if (pollUrl == null || !pollUrl.startsWith('http')) errors.badRequest('Missing or invalid prYvpoll URL');
  const pollContent = await (await fetch(pollUrl)).json();

  // safety check that onboard process has started
  const currentAuthStatuses = await onboard.authStatusesGet(partnerUserId);
  const matchingStatuses = currentAuthStatuses.filter(s => s.content.poll === pollUrl);
  if (matchingStatuses.length !== 1) {
    // -- todo redirect to partner error page
    errors.badRequest('No matching pending request for this user');
  }

  // ACCEPTED
  if (pollContent.status === 'ACCEPTED') {
    // -- Add user credentials to partner streams
    await user.addCredentialToBridgeAccount(partnerUserId, pollContent.apiEndpoint);
  }
  // REMOVE pending request in background
  process.nextTick(() => { onboard.authStatusesClean(currentAuthStatuses); });

  // -- todo redirect user to sucess page
  res.json({ pollContent, matchingStatuses });
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
