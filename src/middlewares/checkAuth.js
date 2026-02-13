const { getConfig } = require('boiler')

let partnerAuthToken = null

module.exports = {
  init,
  checkIfPartner
}

async function init () {
  const config = await getConfig()
  partnerAuthToken = config.get('partnerAuthToken')
}

async function checkIfPartner (req, res, next) {
  if (req.headers.authorization === partnerAuthToken) {
    req.isPartner = true
  }
  next()
}
