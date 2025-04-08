const { getLogger } = require('boiler');
const http = require('http');

const logger = getLogger('testServer');
const querystring = require('node:querystring'); 

module.exports = {
  startHttpServerCapture
};

/**
 * Launch a small web server to capture eventual external calls
 * See test-suite [TESX] to see how it works.
 * @param {Object} params
 * @param {Number} params.port - port to use
 * @returns {Object} captured: the captures call, nextCalls: stack replies, close() - to close the server
 */
async function startHttpServerCapture (params) {
  const captured = [];
  const nextCalls = [];
  const port = params?.port || 8365;
  const host = '127.0.0.1';
  const server = http.createServer(onRequest);
  await require('util').promisify(server.listen).bind(server)(port, host);
  logger.info('Started webServerCapture on port: ' + port);

  async function close () {
    return new Promise((resolve) => {
      server.close(() => {
        resolve();
        logger.info('Stopped webServerCapture on port: ' + port);
      }
      );
      // Closes all connections, ensuring the server closes successfully
      server.closeAllConnections();
    });
  }

  async function onRequest (req, res) {
    logger.info('WebServerCapture request: ' + req.url);
    try {
      const result = {
        method: req.method,
        url: req.url,
        headers: req.headers
      };
      const indexOfQuestionMark = req.url.indexOf('?');
      if (indexOfQuestionMark > -1) {
        result.path = req.url.substring(0, indexOfQuestionMark);
        const queryPart = req.url.substring(indexOfQuestionMark + 1);
        result.query = querystring.parse(queryPart);
      } else {
        result.path = req.url;
        result.query = {};
      }
      // capture content
      if (req.method === 'POST') {
        const body = [];
        req
          .on('data', chunk => { body.push(chunk); })
          .on('end', () => {
            result.body = Buffer.concat(body).toString();
            captured.push(result);
          });
      } else {
        captured.push(result);
      }

      // handle response
      const response = nextCalls.pop() || {
        code: 200,
        headers: { },
        body: 'OK'
      };
      res.writeHead(response.code, response.headers);
      res.write(response.body);
      res.end();
    } catch (e) {
      logger.error(e);
    }
    logger.info('WebServerCapture sent ');
  }

  return { captured, nextCalls, close };
}
