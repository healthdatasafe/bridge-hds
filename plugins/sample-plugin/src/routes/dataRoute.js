/**
 * @type {Express.router}
 */
const router = require('express-promise-router')();

/**
 * POST /data/test
 */
router.post('/test', async (req, res) => {
  res.json('OK');
});

module.exports = router;
