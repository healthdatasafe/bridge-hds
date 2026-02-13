/**
 * @type {Express.router}
 */
const router = require('express-promise-router')();
const errors = require('../errors/index.js');
const { getErrorsOnBridgeAccount } = require('../lib/bridgeAccount.js');

/**
 * List errors
 * query:
 *  - fromTime - (optional) EPOCH time
 *  - toTime - (optional) EPOCH time
 *  - limit - (optional) number of events to return
 * result: @see https://pryv.github.io/reference/#authenticate-your-app
 */
router.get('/errors/', async (req, res) => {
  errors.assertFromPartner(req);
  const params = { };
  for (const numKey of ['fromTime', 'toTime', 'limit']) {
    if (req.query[numKey] != null) {
      const val = Number.parseFloat(req.query[numKey]);
      if (isNaN(val)) errors.badRequest(`${numKey} value is not a number`, { [numKey]: req.query[numKey] });
      params[numKey] = val;
    }
  }
  const result = await getErrorsOnBridgeAccount(params);
  res.json(result);
});

module.exports = router;
