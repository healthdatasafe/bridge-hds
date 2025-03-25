const { getConfig } = require('boiler');
const { bridgeConnection } = require('../lib/bridgeAccount');
const pryvService = require('../lib/pryvService');
const user = require('./user');

module.exports = {
  onboardProcess
};

/**
 * Create an onboarding URL for this patient
 * @param {string} partnerUserId
 * @returns {string} URL to onboard the patient
 */
async function onboardProcess (partnerUserId) {
  // check if user is active

  // -- todo

  // create Auth Request
  const authRequestBody = {
    requestingAppId: (await getConfig()).get('pryv:appId'),
    requestedPermissions: [{
      streamId: 'chartneo',
      level: 'manage',
      defaultName: 'Chartneo'
    }]
  };
  const pryvServiceInfos = await pryvService.service().info();
  const response = await fetch(pryvServiceInfos.access, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(authRequestBody)
  });
  const body = await response.json();
  return body;
}
