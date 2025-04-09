const { newData } = require('../methods/handleData');

/**
 * We keep the plugin as a singleton to access its toolkit
 * @type {PluginBridge}
 */
let plugin;

/**
 * @type {Express.router}
 */
const router = require('express-promise-router')();

/**
 * For your plugin, you may remove "/test" from the path
 * And adapt it to your needs
 * POST /data/{partnerUserId}/test
 * @param {string} params.partnerUserId - The id of the user
 * @param {object} req.body - Pryv API call
 * Simply forward data to api of the user
 */
router.post('/test/:partnerUserId', async (req, res) => {
  plugin.assertFromPartner(req); // check if the request is from a partne
  const partnerUserId = req.params.partnerUserId;
  const data = req.body;
  if (!Array.isArray(data)) plugin.errors.badRequest('data should be an array', data);
  // process the request with methods/handleData.newData
  const result = await newData(partnerUserId, data);
  res.json(result);
});

/**
 * This route is mainly for testing purpose you may reome it for your plugin
 * POST /data/test/{partnerUserId}/api
 * @param {string} params.partnerUserId - The id of the user
 * @param {object} req.body - Pryv API call
 * Simply forward data to api of the user
 */
router.post('/test/:partnerUserId/api', async (req, res) => {
  plugin.assertFromPartner(req); // check if the request is from a partne
  const partnerUserId = req.params.partnerUserId;
  if (!partnerUserId) plugin.errors.badRequest('Missing partnerUserId');
  const hdsUser = await plugin.getPryvUserConnectionAndStatus(partnerUserId); // retrieve the user
  const result = await hdsUser.connection.api(req.body);
  res.json(result);
});

/**
 * initialize plugin and return router;
 * @param {PluginSample} p
 */
module.exports = function (p) {
  plugin = p;
  return router;
};
