const { assertFromPartner } = require('../../../../src/errors');

/**
 * @type {Express.router}
 */
const router = require('express-promise-router')();

/**
 * POST /data/test
 */
router.post('/test', async (req, res) => {
  assertFromPartner(req);
  res.json('OK');
});

module.exports = router;
