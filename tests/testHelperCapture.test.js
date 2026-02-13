/**
 * When testing the test suite starts ;)
 * Do not go in infinite loop!
 */
require('./helpers/testServer')
const assert = require('node:assert/strict')
const { init: initTestServer } = require('./helpers/testServer')
const { startHttpServerCapture } = require('./helpers/testWebServerCapture')

describe('[TESX] Testing mockup server for webhooks', () => {
  let webServerCapture
  const port = 8365
  before(async () => {
    await initTestServer()
    webServerCapture = await startHttpServerCapture({ port })
  })

  after(async () => {
    await webServerCapture.close()
  })

  it(`[TESW] POST http://localhost:${port}/test`, async () => {
    const responseNextCall = {
      code: 201,
      headers: { hello: 'bob' },
      body: 'This is Bob'
    }
    webServerCapture.nextCalls.push(responseNextCall)
    const url = '/test?params=1'
    const fetchParams = {
      method: 'POST',
      headers: { hello: 'tom' },
      body: 'This is Tom'
    }
    const result = await fetch(`http://127.0.0.1:${port}${url}`, fetchParams)
    const resultBody = await result.text()
    const captured = webServerCapture.captured.pop()
    assert.equal(captured.method, fetchParams.method)
    assert.equal(captured.url, url)
    assert.equal(captured.headers.hello, fetchParams.headers.hello)
    assert.equal(captured.body, fetchParams.body)
    assert.equal(resultBody, responseNextCall.body)
    assert.equal(result.status, responseNextCall.code)
    assert.equal(result.headers.get('hello'), responseNextCall.headers.hello)
  })
})
