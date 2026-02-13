const assert = require('node:assert/strict')
const { init: initTestServer } = require('./helpers/testServer')
const plugins = require('../src/lib/plugins')

describe('[PLGX] Plugins', () => {
  before(async () => {
    await initTestServer() // will init plugins
  })

  it('[PLGP] Unit: get list of streams to create', async () => {
    // only test sample plugin
    const { streams, permissions } = plugins.requiredPermissionsAndStreams()
    const permissionsSample = permissions.filter(p => p.streamId === 'body-weight')
    const streamsSample = streams.filter(s => s.id === 'body-weight' || s.id === 'body')
    assert.deepEqual({ permissionsSample, streamsSample }, {
      permissionsSample: [
        {
          streamId: 'body-weight',
          level: 'manage',
          defaultName: 'Body Weight'
        }
      ],
      streamsSample: [
        { id: 'body', parentId: null, name: 'Body' },
        { id: 'body-weight', parentId: 'body', name: 'Body Weight' }
      ]
    })
  })
})
