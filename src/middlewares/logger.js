const { getLogger } = require('boiler');

const logger = getLogger('server');

function expressLogger (req, res, next) {
  if (res.headersSent) {
    logger.info(`${req.method} ${req.url} ${res.statusCode}`);
  } else {
    res.on('finish', function () {
      logger.info(`${req.method} ${req.url} ${res.statusCode}`);
    });
  }
  next();
}

module.exports = expressLogger;
