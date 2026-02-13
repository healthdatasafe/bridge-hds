const { getLogger } = require('boiler')

const logger = getLogger('server')

function expressLogger (req, res, next) {
  if (res.headersSent) {
    doLog(req, res)
  } else {
    res.on('finish', function () {
      doLog(req, res)
    })
  }
  next()
}

function doLog (req, res) {
  if (res.statusCode === 404 && !res.log404) {
    // eventually log 404 elswhere
    return
  }
  logger.info(`${req.method} ${req.url} ${res.statusCode}`)
}

module.exports = expressLogger
