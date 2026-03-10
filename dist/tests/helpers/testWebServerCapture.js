import boiler from '@pryv/boiler';
import http from 'http';
import querystring from 'node:querystring';
let logger = null;
function getLoggerLazy() {
    if (logger == null)
        logger = boiler.getLogger('testServer');
    return logger;
}
/**
 * Launch a small web server to capture eventual external calls
 * See test-suite [TESX] to see how it works.
 */
async function startHttpServerCapture(params) {
    const captured = [];
    const nextCalls = [];
    const port = params?.port || 8365;
    const host = '127.0.0.1';
    const server = http.createServer(onRequest);
    await new Promise((resolve) => { server.listen(port, host, resolve); });
    getLoggerLazy().info('Started webServerCapture on port: ' + port);
    async function close() {
        return new Promise((resolve) => {
            server.close(() => {
                resolve();
                getLoggerLazy().info('Stopped webServerCapture on port: ' + port);
            });
            // Closes all connections, ensuring the server closes successfully
            server.closeAllConnections();
        });
    }
    async function onRequest(req, res) {
        getLoggerLazy().info('WebServerCapture request: ' + req.url);
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
            }
            else {
                result.path = req.url;
                result.query = {};
            }
            // capture content
            if (req.method === 'POST') {
                const body = [];
                req
                    .on('data', (chunk) => { body.push(chunk); })
                    .on('end', () => {
                    result.body = Buffer.concat(body).toString();
                    captured.push(result);
                });
            }
            else {
                captured.push(result);
            }
            // handle response
            const response = nextCalls.pop() || {
                code: 200,
                headers: {},
                body: 'OK'
            };
            res.writeHead(response.code, response.headers);
            res.write(response.body);
            res.end();
        }
        catch (e) {
            getLoggerLazy().error(String(e));
        }
        getLoggerLazy().info('WebServerCapture sent ');
    }
    return { captured, nextCalls, close };
}
export { startHttpServerCapture };
//# sourceMappingURL=testWebServerCapture.js.map